/**
 * 道場の切り替えボタン・ヘッダーのタイトル・タブ
 */
import { state } from "../core/state.js";
import { updateSettings } from "../core/store.js";
import { rerender } from "../core/render.js";
import { SCHEDULES, PAST_DOJO } from "../data/schedules.js";

export function renderDojoSelect(){
  const el = document.getElementById('dojoSelect');
  const current = state.settings.dojo;
  el.innerHTML = Object.entries(SCHEDULES)
    .filter(([key])=> key!==PAST_DOJO)
    .map(([key,d])=>`
      <button class="dojo-btn ${current===key?'active':''}" data-dojo="${key}">
        ${d.name}<div class="dojo-sub">${d.sub}</div>
      </button>
    `).join('');
  el.querySelectorAll('.dojo-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{
      updateSettings({dojo: btn.dataset.dojo});
      rerender();
    });
  });
  const s = SCHEDULES[current];
  document.getElementById('dojoTitle').textContent = `${s.name}（${s.sub}）`;
}

export function renderTabs(){
  document.querySelectorAll('.tab').forEach(t=>{
    t.classList.toggle('active', t.dataset.tab===state.ui.activeTab);
    t.onclick = ()=>{ state.ui.activeTab = t.dataset.tab; rerender(); };
  });
}
