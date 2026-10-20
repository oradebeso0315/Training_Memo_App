/**
 * 練習ノートの入力モーダル（道場の選択＋受けたクラスの選択＋メモ＋GeminiのFB）
 */
import { state, getNote, hasContent } from "../core/state.js";
import { saveNote } from "../core/store.js";
import { rerender } from "../core/render.js";
import { getFeedback, hasApiKey } from "../core/gemini.js";
import { SCHEDULES } from "../data/schedules.js";
import { getClassColor } from "../data/skills.js";
import { escapeHtml, escapeAttr, parseYmd, dayKeyOf, DOW_LABELS } from "../core/utils.js";

/**
 * @param {string} date  "YYYY-MM-DD"
 * @param {object} opt
 *   dojos … 選べる道場の配列（1つだけなら道場の選択欄は出さない）
 *   dojo  … 最初に選んでおく道場（省略時は自動で決める）
 */
export function openNoteModal(date, {dojos, dojo} = {}){
  dojos = dojos && dojos.length ? dojos : [state.settings.dojo];
  dojo = dojo || pickDefaultDojo(date, dojos);
  renderModal(date, dojos, dojo);
}

// その日にすでに記録がある道場 → 上で選んでいる道場 → 先頭の道場 の順で選ぶ
function pickDefaultDojo(date, dojos){
  const recorded = dojos.find(dj=> hasContent(getNote(dj, date)));
  if(recorded) return recorded;
  if(dojos.includes(state.settings.dojo)) return state.settings.dojo;
  return dojos[0];
}

function renderModal(date, dojos, dojo, carryText){
  const saved = getNote(dojo, date);
  const note = saved || {text: carryText ?? "", fb:"", classes:[]};
  const sched = SCHEDULES[dojo];

  // その日の曜日のクラスを候補にする（フリートレーニングは除く）
  const candidates = (sched.days[dayKeyOf(date)]||[]).filter(c=>c.name!=="フリートレーニング");
  const selected = new Set(note.classes.map(c=>`${c.name}|${c.start}`));
  const d = parseYmd(date);
  const dateLabel = `${d.getMonth()+1}月${d.getDate()}日（${DOW_LABELS[d.getDay()]}）`;

  const dojoPicker = dojos.length<=1 ? '' : `
    <div class="card-title" style="margin-top:14px;">道場</div>
    <div class="modal-dojo-picker">
      ${dojos.map(dj=>{
        const s = SCHEDULES[dj];
        const has = hasContent(getNote(dj, date));
        return `
          <button class="modal-dojo-btn ${dj===dojo?'active':''}" data-dojo="${dj}" style="--dojo:${s.color}">
            ${s.short}${has?'<span class="modal-dojo-dot"></span>':''}
          </button>`;
      }).join('')}
    </div>`;

  const root = document.getElementById('modalRoot');
  root.innerHTML = `
    <div class="modal-overlay" id="modalOverlay">
      <div class="modal" style="border-top:3px solid ${sched.color}">
        <div class="modal-header">
          <div class="modal-class">${dateLabel}</div>
          <div class="modal-time" style="color:${sched.color}">${sched.name}（${sched.sub}）</div>
        </div>
        ${dojoPicker}
        <div class="card-title" style="margin-top:14px;">行ったクラス（複数選択可）</div>
        <div class="class-picker">
          ${candidates.length===0 ? '<div class="empty">この曜日のクラスはありません。</div>' : ''}
          ${candidates.map(c=>{
            const color = getClassColor(c.name);
            const checked = selected.has(`${c.name}|${c.start}`) ? 'checked' : '';
            return `
              <label class="class-pick-item" style="border-color:${color}66">
                <input type="checkbox" data-name="${escapeAttr(c.name)}" data-start="${c.start}" data-end="${c.end}" ${checked}>
                <span class="class-pick-dot" style="background:${color}"></span>
                <span class="class-pick-name">${c.name}</span>
                <span class="class-pick-time">${c.start}-${c.end}</span>
              </label>`;
          }).join('')}
        </div>
        <div class="card-title" style="margin-top:14px;">メモ</div>
        <textarea id="noteText" placeholder="今日の練習内容、気づき、課題など...">${escapeHtml(note.text)}</textarea>
        <div class="modal-actions">
          <button class="btn btn-secondary btn-full" id="closeModal">閉じる</button>
          <button class="btn btn-primary btn-full" id="saveNote">保存して分析</button>
        </div>
        <div id="fbArea">${fbBox(note.fb)}</div>
      </div>
    </div>
  `;

  document.getElementById('closeModal').onclick = closeModal;
  document.getElementById('modalOverlay').addEventListener('click', e=>{
    if(e.target.id==='modalOverlay') closeModal();
  });
  root.querySelectorAll('.modal-dojo-btn').forEach(btn=>{
    btn.onclick = ()=>{
      if(btn.dataset.dojo===dojo) return;
      // まだ保存していない道場で書きかけたメモは、切り替え先に記録がなければ引き継ぐ
      const typed = document.getElementById('noteText').value;
      renderModal(date, dojos, btn.dataset.dojo, saved ? undefined : typed);
    };
  });
  document.getElementById('saveNote').onclick = ()=> onSave(dojo, date, note.fb);
}

async function onSave(dojo, date, prevFb){
  const text = document.getElementById('noteText').value;
  const classes = [...document.querySelectorAll('.class-picker input[type=checkbox]:checked')]
    .map(cb=>({name:cb.dataset.name, start:cb.dataset.start, end:cb.dataset.end}));

  const saved = saveNote({dojo, date, classes, text, fb: prevFb||""});
  rerender();

  // 空で保存（=削除）、またはメモなしなら閉じて終わり
  if(!saved || !text.trim()){ closeModal(); return; }

  const fbArea = document.getElementById('fbArea');
  if(!hasApiKey()){
    fbArea.innerHTML = `<div class="fb-box"><div class="fb-error">Gemini APIキーが未設定です。目標設定タブから設定できます。</div></div>`;
    return;
  }
  fbArea.innerHTML = `<div class="fb-box loading">Geminiが分析中...</div>`;
  try{
    const fb = await getFeedback(classes, text);
    saveNote({dojo, date, classes, text, fb});
    if(document.getElementById('fbArea')) document.getElementById('fbArea').innerHTML = fbBox(fb);
  }catch(err){
    if(document.getElementById('fbArea')) document.getElementById('fbArea').innerHTML = `<div class="fb-box"><div class="fb-error">FB取得エラー: ${escapeHtml(err.message)}</div></div>`;
  }
  rerender();
}

function fbBox(fb){
  if(!fb) return '';
  return `
    <div class="fb-box">
      <div class="fb-label">🥋 Gemini からのフィードバック</div>
      <div class="fb-text">${escapeHtml(fb)}</div>
    </div>`;
}

export function closeModal(){
  document.getElementById('modalRoot').innerHTML = '';
}
