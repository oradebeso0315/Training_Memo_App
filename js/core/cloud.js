/**
 * クラウド同期（Firebase Authentication + Cloud Firestore）
 *
 * Firestoreのデータ構造:
 *   users/{uid}                    … 設定（道場・目標・前提情報・Gemini APIキーなど）
 *   users/{uid}/notes/{noteId}     … 練習ノート 1日1件（noteId 例: hearts_shinjuku_2026-10-18）
 *
 * ・保存は「変わったノート1件」または「設定」だけを書き込む（増分保存）
 * ・onSnapshot で購読しているので、別の端末での変更もリアルタイムに反映される
 * ・旧形式（users/{uid}.data に全データを文字列で保存）は、ログイン時に自動で新形式へ移行する
 */
import { FIREBASE_CONFIG, FIREBASE_SDK_URL, MERGED_FLAG_KEY } from "../config.js";
import { state, normalizeSettings, normalizeNote, convertLegacy, saveLocal, hasContent } from "./state.js";
import { rerender, rerenderSyncBar } from "./render.js";

export const cloud = {
  enabled: false,   // FIREBASE_CONFIG が設定済みで、SDKを読み込めたか
  ready: false,     // ログイン状態の確認が終わったか
  user: null,
  status: "idle",   // idle / loading / saving / saved / error
  error: "",
};

let fb = null;            // 読み込んだFirebase SDKの関数たち
let auth = null, db = null;
let unsubscribers = [];   // リアルタイム購読の解除関数
let pendingWrites = 0;
let settingsTimer = null;

/* ---------- 起動 ---------- */

export async function initCloud(){
  if(!FIREBASE_CONFIG.apiKey || !FIREBASE_CONFIG.projectId){ rerenderSyncBar(); return; }
  try{
    const [appMod, authMod, fsMod] = await Promise.all([
      import(`${FIREBASE_SDK_URL}/firebase-app.js`),
      import(`${FIREBASE_SDK_URL}/firebase-auth.js`),
      import(`${FIREBASE_SDK_URL}/firebase-firestore.js`),
    ]);
    fb = {...appMod, ...authMod, ...fsMod};
  }catch(e){
    console.warn("Firebase SDKの読み込みに失敗（オフライン？）:", e);
    rerenderSyncBar();
    return;
  }
  cloud.enabled = true;
  const app = fb.initializeApp(FIREBASE_CONFIG);
  auth = fb.getAuth(app);
  db = fb.initializeFirestore(app, {ignoreUndefinedProperties: true});

  fb.getRedirectResult(auth).catch(err=> alert("ログインに失敗しました: " + err.message));
  fb.onAuthStateChanged(auth, user=>{
    cloud.ready = true;
    cloud.user = user;
    if(user) startSync(user);
    else { stopSync(); setStatus("idle"); }
  });
  rerenderSyncBar();
}

/* ---------- ログイン / ログアウト ---------- */

export async function signIn(){
  const provider = new fb.GoogleAuthProvider();
  try{
    await fb.signInWithPopup(auth, provider);
  }catch(err){
    if(err.code==="auth/popup-blocked" || err.code==="auth/operation-not-supported-in-this-environment"){
      await fb.signInWithRedirect(auth, provider);
    }else if(err.code!=="auth/popup-closed-by-user" && err.code!=="auth/cancelled-popup-request"){
      alert("ログインに失敗しました: " + err.message);
    }
  }
}

export async function signOut(){
  if(settingsTimer){ clearTimeout(settingsTimer); await writeSettingsNow(); }
  await fb.signOut(auth);
}

/* ---------- Firestoreの場所 ---------- */

const settingsRef = ()=> fb.doc(db, "users", cloud.user.uid);
const notesCol    = ()=> fb.collection(db, "users", cloud.user.uid, "notes");
const noteRef     = (id)=> fb.doc(db, "users", cloud.user.uid, "notes", id);

/* ---------- アプリの形 ⇔ Firestoreの形 ---------- */

function settingsToDoc(s){
  return {
    dojo: s.dojo,
    background: s.background,
    goalText: s.goalText,
    goalBalance: s.goalBalance,
    goalAdvice: s.goalAdvice,
    focusSuggestion: s.focusSuggestion,
    geminiApiKey: s.apiKey,
    schemaVersion: 2,
    updatedAt: fb.serverTimestamp(),
  };
}
function docToSettings(d){
  return normalizeSettings({
    dojo: d.dojo, background: d.background, goalText: d.goalText,
    goalBalance: d.goalBalance, goalAdvice: d.goalAdvice,
    focusSuggestion: d.focusSuggestion, apiKey: d.geminiApiKey,
  });
}
function noteToDoc(n){
  return {
    dojo: n.dojo,
    date: n.date,
    classes: n.classes.map(c=>({name:c.name, start:c.start, end:c.end})),
    text: n.text,
    feedback: n.fb,
    updatedAt: fb.serverTimestamp(),
  };
}
function docToNote(d){
  return normalizeNote({
    dojo: d.dojo, date: d.date, classes: d.classes, text: d.text, fb: d.feedback,
    updatedAt: d.updatedAt?.toMillis ? d.updatedAt.toMillis() : 0,
  });
}

/* ---------- ログイン後の同期 ---------- */

async function startSync(user){
  stopSync();
  setStatus("loading");
  try{
    await migrateLegacyCloudData();
    await mergeLocalOnFirstLogin(user.uid);
    subscribe();
  }catch(err){
    console.error(err);
    setStatus("error", err.message);
  }
}

function stopSync(){
  unsubscribers.forEach(u=>u());
  unsubscribers = [];
}

// 旧形式（users/{uid}.data に全データを文字列で保存）→ 新形式へ移行
async function migrateLegacyCloudData(){
  const snap = await fb.getDoc(settingsRef());
  if(!snap.exists()) return;
  const d = snap.data();
  if(typeof d.data !== "string") return;

  const {settings, notes} = convertLegacy(JSON.parse(d.data));
  const ops = [
    (batch)=> batch.set(settingsRef(), {...settingsToDoc(settings), data: fb.deleteField()}, {merge:true}),
    ...Object.values(notes).map(n=> (batch)=> batch.set(noteRef(n.id), noteToDoc(n))),
  ];
  await commitInChunks(ops);
}

// この端末で初めてログインしたとき、端末内に残っていたデータをクラウドへ合流させる
async function mergeLocalOnFirstLogin(uid){
  if(localStorage.getItem(MERGED_FLAG_KEY) === uid) return;

  const [settingsSnap, notesSnap] = await Promise.all([fb.getDoc(settingsRef()), fb.getDocs(notesCol())]);
  const cloudIds = new Set(notesSnap.docs.map(d=>d.id));
  const ops = [];

  // クラウドにないノートだけアップロード（両方にある場合はクラウドを優先）
  Object.values(state.notes).forEach(n=>{
    if(hasContent(n) && !cloudIds.has(n.id)) ops.push((batch)=> batch.set(noteRef(n.id), noteToDoc(n)));
  });

  // 設定は、クラウド側が空の項目だけ端末側の値で埋める
  const remote = settingsSnap.exists() ? settingsSnap.data() : {};
  const local = state.settings;
  const merged = settingsSnap.exists() ? docToSettings(remote) : {...local};
  ["apiKey","goalText","goalAdvice","goalBalance","focusSuggestion"].forEach(k=>{
    if(!merged[k] && local[k]) merged[k] = local[k];
  });
  if(!remote.background && local.background) merged.background = local.background;
  ops.push((batch)=> batch.set(settingsRef(), settingsToDoc(merged), {merge:true}));

  await commitInChunks(ops);
  try{ localStorage.setItem(MERGED_FLAG_KEY, uid); }catch(e){}
}

// Firestoreの一括書き込みは1回500件までなので分割する
async function commitInChunks(ops){
  for(let i=0; i<ops.length; i+=400){
    const batch = fb.writeBatch(db);
    ops.slice(i, i+400).forEach(op=> op(batch));
    await batch.commit();
  }
}

// リアルタイム購読：クラウドの変更を受け取って画面に反映
function subscribe(){
  unsubscribers.push(fb.onSnapshot(settingsRef(), snap=>{
    // 自分の書き込みの反映待ち・送信待ちの間は、手元の値を優先
    if(snap.metadata.hasPendingWrites || settingsTimer) return;
    if(snap.exists()){
      state.settings = docToSettings(snap.data());
      saveLocal();
      rerender();
    }
  }, onSnapshotError));

  let first = true;
  unsubscribers.push(fb.onSnapshot(notesCol(), snap=>{
    if(first){
      // 初回はクラウドの全件で置き換える（他の端末での削除も反映するため）
      first = false;
      state.notes = {};
      snap.docs.forEach(d=>{ const n = docToNote(d.data()); state.notes[n.id] = n; });
    }else{
      // 2回目以降は変わった分だけ反映
      snap.docChanges().forEach(ch=>{
        if(ch.doc.metadata.hasPendingWrites) return;
        if(ch.type==="removed") delete state.notes[ch.doc.id];
        else { const n = docToNote(ch.doc.data()); state.notes[n.id] = n; }
      });
    }
    saveLocal();
    if(pendingWrites===0) setStatus("saved");
    rerender();
  }, onSnapshotError));
}

function onSnapshotError(err){
  console.error(err);
  setStatus("error", err.message);
}

/* ---------- 書き込み（store.js から呼ばれる） ---------- */

async function track(promise){
  pendingWrites++;
  setStatus("saving");
  try{
    await promise;
    pendingWrites--;
    if(pendingWrites===0) setStatus("saved");
  }catch(err){
    pendingWrites--;
    setStatus("error", err.message);
  }
}

export function cloudWriteNote(note){
  if(!cloud.user) return;
  track(fb.setDoc(noteRef(note.id), noteToDoc(note)));
}

export function cloudDeleteNote(id){
  if(!cloud.user) return;
  track(fb.deleteDoc(noteRef(id)));
}

// 設定は連続で変わることが多いので少し待ってまとめて書く
export function cloudWriteSettings(){
  if(!cloud.user) return;
  clearTimeout(settingsTimer);
  settingsTimer = setTimeout(writeSettingsNow, 600);
}
function writeSettingsNow(){
  settingsTimer = null;
  return track(fb.setDoc(settingsRef(), settingsToDoc(state.settings), {merge:true}));
}

/* ---------- 状態表示 ---------- */

function setStatus(status, error){
  cloud.status = status;
  cloud.error = error || "";
  rerenderSyncBar();
}
