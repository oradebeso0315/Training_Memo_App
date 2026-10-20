/**
 * アプリの状態（メモリ上のデータ）
 *
 *  state.settings … 設定・目標など（Firestore: users/{uid}）
 *  state.notes    … 練習ノート（Firestore: users/{uid}/notes/{noteId}）
 *  state.ui       … 画面の一時的な状態（保存しない）
 *
 * データを変更するときは、直接いじらず store.js の関数を使う。
 */
import { DEFAULT_BACKGROUND } from "../data/background.js";
import { LOCAL_KEY, LEGACY_LOCAL_KEY } from "../config.js";

export function defaultSettings(){
  return {
    dojo: "hearts_shinjuku",
    background: DEFAULT_BACKGROUND,
    goalText: "",
    goalBalance: null,      // {striking,nogi,gi,mma} 推奨週間時間(h) - Geminiが計算
    goalAdvice: "",         // 行動面・ペース面のアドバイス - Geminiが計算
    focusSuggestion: null,  // {key:"YYYY-MM-DD|道場", text:"..."}
    apiKey: "",             // Gemini APIキー（Firestoreでは geminiApiKey）
  };
}

export const state = {
  settings: defaultSettings(),
  notes: {},
  ui: {
    activeTab: "calendar",
    historyCalMonth: new Date(),
    pastCalMonth: new Date(),
    skillPeriod: "total",       // "month" / "year" / "total"
    focusLoading: false,
    focusError: null,
    goalBalanceLoading: false,
    pastSummaryLoading: false,
  },
};

/* ---------- ノート ---------- */

// ノートのID（= Firestoreのドキュメント名）例: "hearts_shinjuku_2026-10-18"
export function noteId(dojo, date){
  return `${dojo}_${date}`;
}

// 内容がある（クラスかメモが入っている）ノートか
export function hasContent(note){
  return !!(note && ((note.classes && note.classes.length) || (note.text && note.text.trim())));
}

// 条件に合うノートを日付順で返す
// dojo: 1つの道場に絞る / dojos: 複数の道場に絞る（どちらもなければ全道場）
export function listNotes({dojo=null, dojos=null, monthPrefix=null, newestFirst=false} = {}){
  return Object.values(state.notes)
    .filter(n=> hasContent(n))
    .filter(n=> !dojo || n.dojo===dojo)
    .filter(n=> !dojos || dojos.includes(n.dojo))
    .filter(n=> !monthPrefix || n.date.startsWith(monthPrefix))
    .sort((a,b)=> newestFirst ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date));
}

export function getNote(dojo, date){
  return state.notes[noteId(dojo, date)] || null;
}

/* ---------- 整形・旧形式からの移行 ---------- */

// 設定値の形を整える（欠けている項目を初期値で補う）
export function normalizeSettings(s){
  const base = defaultSettings();
  const out = Object.assign(base, s || {});
  if(!out.background || !out.background.trim()) out.background = DEFAULT_BACKGROUND;
  // 旧カテゴリ(柔術/組み)の目標バランスを新カテゴリ(ギあり/ノーギ)へ
  const b = out.goalBalance;
  if(b && (b.jiujitsu!==undefined || b.grappling!==undefined)){
    out.goalBalance = {striking:b.striking||0, nogi:b.grappling||0, gi:b.jiujitsu||0, mma:b.mma||0};
  }
  return out;
}

export function normalizeNote(n){
  return {
    id: noteId(n.dojo, n.date),
    dojo: n.dojo,
    date: n.date,
    classes: (n.classes||[]).map(c=>({name:c.name, start:c.start, end:c.end})),
    text: n.text || "",
    fb: n.fb || "",
    updatedAt: n.updatedAt || 0,
  };
}

/**
 * 旧形式（v1: 全データを1つのオブジェクトにまとめた形）→ 新形式 {settings, notes}
 * localStorageの旧データと、Firestoreの旧データ（users/{uid}.data）の両方で使う
 */
export function convertLegacy(old){
  old = old || {};
  const settings = normalizeSettings({
    dojo: old.dojo, background: old.background, goalText: old.goalText,
    goalBalance: old.goalBalance, goalAdvice: old.goalAdvice,
    focusSuggestion: old.focusSuggestion, apiKey: old.apiKey,
  });
  const notes = {};
  Object.entries(old.notes || {}).forEach(([key, n])=>{
    const parts = key.split("|");
    if(parts.length !== 2) return; // さらに古い形式のキーは捨てる
    const [dojo, date] = parts;
    const note = normalizeNote({
      dojo, date, classes: n.classes, text: n.text, fb: n.fb,
      updatedAt: n.date ? Date.parse(n.date) || 0 : 0,
    });
    if(hasContent(note)) notes[note.id] = note;
  });
  return {settings, notes};
}

/* ---------- 端末内（localStorage）への保存 ---------- */

export function loadLocal(){
  try{
    const raw = localStorage.getItem(LOCAL_KEY);
    if(raw){
      const data = JSON.parse(raw);
      state.settings = normalizeSettings(data.settings);
      state.notes = {};
      Object.values(data.notes || {}).forEach(n=>{ const note = normalizeNote(n); state.notes[note.id] = note; });
      return;
    }
    const legacy = localStorage.getItem(LEGACY_LOCAL_KEY);
    if(legacy){
      const {settings, notes} = convertLegacy(JSON.parse(legacy));
      state.settings = settings;
      state.notes = notes;
      saveLocal(); // 新形式で保存し直す（旧データは念のため残しておく）
    }
  }catch(e){
    console.warn("端末内データの読み込みに失敗:", e);
  }
}

export function saveLocal(){
  try{
    localStorage.setItem(LOCAL_KEY, JSON.stringify({settings: state.settings, notes: state.notes}));
  }catch(e){
    console.warn("端末内への保存に失敗:", e);
  }
}
