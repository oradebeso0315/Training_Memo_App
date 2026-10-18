/**
 * 過去実績タブ：以前のジム（ゴンズジム）の記録と、Geminiによる要約
 */
import { state, listNotes } from "../core/state.js";
import { updateSettings } from "../core/store.js";
import { rerender } from "../core/render.js";
import { summarizePastRecords, hasApiKey } from "../core/gemini.js";
import { PAST_DOJO } from "../data/schedules.js";
import { monthNotesHtml, bindMonthNotes } from "./monthNotes.js";

const SUMMARY_MARKER = "\n\n【過去実績の要約（自動生成）】\n";

export function renderPastTab(el){
  const opt = {
    dojo: PAST_DOJO,
    title: "過去実績（ゴンズジム / 神戸） - 日付を選んでクラス＋メモを記録",
    getMonth: ()=> state.ui.pastCalMonth,
    setMonth: (d)=>{ state.ui.pastCalMonth = d; },
  };
  const connected = hasApiKey();
  const total = listNotes({dojo: PAST_DOJO}).length;

  el.innerHTML = monthNotesHtml(opt) + `
    <div class="card">
      <div class="card-title">前提情報への反映</div>
      <div class="empty" style="padding:8px 0 14px;text-align:left;">
        ゴンズジムの記録（現在 ${total}件）を、Geminiが要約して「選手の背景・経歴」として目標設定タブの前提情報に反映します。
      </div>
      <button class="btn btn-primary" id="summarizePast" style="width:100%" ${(!connected||total===0)?'disabled':''}>
        ${state.ui.pastSummaryLoading ? '要約中...' : '過去実績をGeminiに学習させる'}
      </button>
      ${!connected ? `<div class="setup-help" style="margin-top:10px;">※ Gemini APIキーが必要です（目標設定タブで設定）。</div>` : ''}
      ${total===0 ? `<div class="setup-help" style="margin-top:10px;">※ まずカレンダーに記録を追加してください。</div>` : ''}
    </div>
  `;
  bindMonthNotes(el, opt);

  const btn = document.getElementById('summarizePast');
  if(!btn.disabled) btn.onclick = summarize;
}

async function summarize(){
  state.ui.pastSummaryLoading = true;
  rerender();
  try{
    const summary = await summarizePastRecords();
    // 前回の要約部分を置き換える形で、前提情報の末尾に追記
    const base = (state.settings.background || "").split(SUMMARY_MARKER)[0].trimEnd();
    updateSettings({background: base + SUMMARY_MARKER + summary});
  }catch(err){
    alert('要約エラー: ' + err.message);
  }
  state.ui.pastSummaryLoading = false;
  rerender();
}
