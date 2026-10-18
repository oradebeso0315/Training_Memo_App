/**
 * 今日の意識タブ：Geminiが今日のクラスと最近の記録から「今日意識すること」を1つ提案
 */
import { state } from "../core/state.js";
import { updateSettings } from "../core/store.js";
import { rerender } from "../core/render.js";
import { getTodayFocus, hasApiKey } from "../core/gemini.js";
import { SCHEDULES } from "../data/schedules.js";
import { escapeHtml, ymd } from "../core/utils.js";

function todayKey(){
  return `${ymd(new Date())}|${state.settings.dojo}`;
}

export function renderFocusTab(el){
  const ui = state.ui;
  const sched = SCHEDULES[state.settings.dojo];
  const cached = state.settings.focusSuggestion;
  const hasToday = !!(cached && cached.key===todayKey() && cached.text);

  let body;
  if(!hasApiKey())        body = `<div class="empty">Gemini APIキーが未設定です。目標設定タブから設定してください。</div>`;
  else if(ui.focusLoading) body = `<div class="fb-box loading">Geminiが過去の記録から提案を作成中...</div>`;
  else if(ui.focusError)   body = `<div class="fb-box"><div class="fb-error">提案取得エラー: ${escapeHtml(ui.focusError)}</div></div>`;
  else if(hasToday)        body = renderFocusContent(cached.text);
  else                     body = `<div class="empty">読み込み中...</div>`;

  el.innerHTML = `
    <div class="card">
      <div class="card-title-row">
        <div class="card-title">今日の意識（${sched.name}${sched.sub?` ${sched.sub}`:''}）</div>
        <button class="btn btn-secondary" id="regenFocus" style="font-size:10px;padding:6px 10px;">再生成</button>
      </div>
      ${body}
    </div>
    <div class="empty">※ 今日の道場（${sched.name}）の本日のクラス内容と、全道場・ゴンズジムの記録、前提情報、目標を踏まえて、Geminiが今日意識すべきことを1つ提案します。1日1回・道場ごとに自動生成され、再生成ボタンや道場切り替えでいつでも更新できます。</div>
  `;

  document.getElementById('regenFocus').onclick = ()=> generateTodayFocus(true);
  if(hasApiKey() && !hasToday && !ui.focusLoading && !ui.focusError) generateTodayFocus(false);
}

// 「【今日の意識】」「【理由】」の見出しで分けて表示
function renderFocusContent(text){
  const focusMatch = text.match(/【今日の意識】\s*([\s\S]*?)(?=【理由】|$)/);
  const reasonMatch = text.match(/【理由】\s*([\s\S]*)/);
  const focus = focusMatch ? focusMatch[1].trim() : text.trim();
  const reason = reasonMatch ? reasonMatch[1].trim() : "";
  return `
    <div class="focus-highlight">
      <div class="focus-label">今日意識すること</div>
      <div class="focus-main">${escapeHtml(focus)}</div>
    </div>
    ${reason ? `<div class="focus-reason"><div class="focus-reason-label">理由</div><div class="focus-reason-text">${escapeHtml(reason)}</div></div>` : ''}
  `;
}

async function generateTodayFocus(force){
  const key = todayKey();
  const cached = state.settings.focusSuggestion;
  if(!force && cached && cached.key===key) return;

  state.ui.focusLoading = true;
  state.ui.focusError = null;
  rerender();
  try{
    const text = await getTodayFocus();
    updateSettings({focusSuggestion: {key, text}});
  }catch(err){
    state.ui.focusError = err.message;
  }
  state.ui.focusLoading = false;
  rerender();
}
