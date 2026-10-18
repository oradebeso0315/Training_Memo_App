/**
 * 画面上部の同期バー（ログイン状態・保存状態）
 */
import { cloud, signIn, signOut } from "../core/cloud.js";
import { escapeHtml } from "../core/utils.js";

const STATUS_TEXT = {
  idle: "同期待ち",
  loading: "クラウドから読み込み中...",
  saving: "クラウドに保存中...",
  saved: "クラウドに保存済み",
};
const STATUS_DOT = {saved:"on", error:"err", loading:"busy", saving:"busy"};

export function renderSyncBar(){
  const bar = document.getElementById('syncBar');
  let dot = "", text = "", btn = "";

  if(!cloud.enabled){
    text = "クラウド未接続：この端末のブラウザ内だけに保存中";
  }else if(!cloud.ready){
    dot = "busy"; text = "ログイン状態を確認中...";
  }else if(!cloud.user){
    text = "Googleでログインすると、iPhoneとPCで同じデータを使えて、消えなくなります";
    btn = `<button class="primary" id="signInBtn">Googleでログイン</button>`;
  }else{
    const who = escapeHtml(cloud.user.email || cloud.user.displayName || "ログイン中");
    const msg = cloud.status==="error" ? "保存エラー: " + escapeHtml(cloud.error) : (STATUS_TEXT[cloud.status] || "");
    dot = STATUS_DOT[cloud.status] || "";
    text = `${who}<br>${msg}`;
    btn = `<button id="signOutBtn">ログアウト</button>`;
  }

  bar.innerHTML = `<div class="sync-dot ${dot}"></div><div class="sync-text">${text}</div>${btn}`;
  document.getElementById('signInBtn')?.addEventListener('click', signIn);
  document.getElementById('signOutBtn')?.addEventListener('click', ()=>{
    if(confirm('ログアウトしますか？（データはクラウドに残ります）')) signOut();
  });
}
