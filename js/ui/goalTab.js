/**
 * 目標設定タブ：前提情報・目標・Gemini APIキーの設定
 */
import { state } from "../core/state.js";
import { updateSettings } from "../core/store.js";
import { rerender } from "../core/render.js";
import { calcGoalBalance, hasApiKey } from "../core/gemini.js";
import { SKILL_KEYS, SKILL_META } from "../data/skills.js";
import { escapeHtml } from "../core/utils.js";

export function renderGoalTab(el){
  const s = state.settings;
  const connected = hasApiKey();

  el.innerHTML = `
    <div class="card">
      <div class="card-title">前提情報（経歴・背景）</div>
      <textarea id="backgroundInput" placeholder="例：2025年5月から格闘技未経験でスタート。週1回ペースで通っている。アマ修斗AクラスにMMAで年内に出たい、または、アマチュアビギナークラスでノーギグラップリングの大会に出たい、など現在の経験レベルや目指している方向性を書いてください。">${escapeHtml(s.background)}</textarea>
      <div class="modal-actions" style="margin-top:10px;">
        <button class="btn btn-primary btn-full" id="saveBackground">保存</button>
      </div>
      <div class="setup-help" style="margin-top:10px;">
        ※ ここに書いた内容は、FB生成・バランス計算の両方でGeminiに前提として渡されます。<br>
        ※「過去実績」タブでカレンダーに記録すると、Geminiに自動要約させてここに追記できます。
      </div>
    </div>

    <div class="card">
      <div class="card-title">目標</div>
      <textarea id="goalTextInput" placeholder="例：アマ修斗AクラスにMMAで年内に出たい／アマチュアビギナークラスのノーギグラップリングの大会に年内に出たい">${escapeHtml(s.goalText)}</textarea>
      <div class="modal-actions" style="margin-top:10px;">
        <button class="btn btn-primary btn-full" id="saveGoalText" ${connected?'':'disabled'}>
          ${state.ui.goalBalanceLoading ? '計算中...' : '保存してバランスを計算'}
        </button>
      </div>
      ${!connected ? `<div class="setup-help" style="margin-top:10px;">※ バランス計算にはGemini APIキーが必要です。下のカードで設定してください。</div>` : ''}
      ${s.goalBalance ? `
        <div class="fb-box" style="margin-top:14px;">
          <div class="fb-label">🥋 Geminiが提案する週間練習バランス</div>
          <div class="fb-text">${SKILL_KEYS.map(k=>`${SKILL_META[k].label}: ${(s.goalBalance[k]||0).toFixed(1)}h`).join(' ／ ')}</div>
        </div>` : ''}
      ${s.goalAdvice ? `
        <div class="fb-box" style="margin-top:14px;">
          <div class="fb-label">🎯 目標達成に向けた行動・ペースのアドバイス</div>
          <div class="fb-text">${escapeHtml(s.goalAdvice)}</div>
        </div>` : ''}
    </div>

    <div class="card">
      <div class="card-title">Gemini API 連携</div>
      <div class="setup-box ${connected?'connected':''}">
        <div class="status">
          <div class="status-dot ${connected?'on':''}"></div>
          ${connected ? 'APIキー設定済み（メモ保存時に自動でFBが届きます）' : '未設定'}
        </div>
        <input type="password" id="apiKeyInput" placeholder="Gemini APIキーを入力 (AIza...)" value="${escapeHtml(s.apiKey)}">
        <button class="btn btn-primary" id="saveApiKey" style="width:100%">保存</button>
        <div class="setup-help">
          1. <a href="https://aistudio.google.com/app/apikey" target="_blank">Google AI Studio</a> にアクセス（Googleアカウントでログイン）<br>
          2. 「Create API key」でキーを発行（無料）<br>
          3. 発行されたキー（AIza...で始まる文字列）をここに貼り付けて保存<br><br>
          ※ Googleでログイン中は、キーもあなた専用のクラウド領域（Firebase）に保存され、iPhone・PCの両方で使えます。本人以外は読めない設定です。<br>
          ※ 目標を保存すると、Geminiが目標に合わせた推奨練習バランス（スキルタブの目標ライン）を計算します。<br>
          ※ 練習ノートを保存すると、Geminiが目標を踏まえたフィードバックを自動生成します。
        </div>
      </div>
    </div>
  `;

  document.getElementById('saveBackground').onclick = (e)=>{
    updateSettings({background: document.getElementById('backgroundInput').value});
    e.target.textContent = '保存しました ✓';
    setTimeout(()=>{ e.target.textContent = '保存'; }, 1500);
  };
  document.getElementById('saveGoalText').onclick = saveGoal;
  document.getElementById('saveApiKey').onclick = ()=>{
    updateSettings({apiKey: document.getElementById('apiKeyInput').value.trim()});
    rerender();
  };
}

async function saveGoal(){
  const text = document.getElementById('goalTextInput').value.trim();
  updateSettings({goalText: text});
  if(!text || !hasApiKey()){ rerender(); return; }

  state.ui.goalBalanceLoading = true;
  rerender();
  try{
    const {balance, advice} = await calcGoalBalance(text);
    updateSettings({goalBalance: balance, goalAdvice: advice});
  }catch(err){
    alert('バランス計算エラー: ' + err.message);
  }
  state.ui.goalBalanceLoading = false;
  rerender();
}
