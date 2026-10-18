/**
 * エントリーポイント：起動とタブの切り替え
 */
import { state, loadLocal } from "./core/state.js";
import { setRenderer, setSyncBarRenderer } from "./core/render.js";
import { initCloud } from "./core/cloud.js";
import { renderSyncBar } from "./ui/syncBar.js";
import { renderDojoSelect, renderTabs } from "./ui/nav.js";
import { renderCalendarTab } from "./ui/calendarTab.js";
import { renderFocusTab } from "./ui/focusTab.js";
import { renderSkillTab } from "./ui/skillTab.js";
import { renderHistoryTab } from "./ui/historyTab.js";
import { renderPastTab } from "./ui/pastTab.js";
import { renderGoalTab } from "./ui/goalTab.js";

// タブ名 → 描画関数
const TABS = {
  calendar: renderCalendarTab,
  focus:    renderFocusTab,
  skill:    renderSkillTab,
  history:  renderHistoryTab,
  past:     renderPastTab,
  goal:     renderGoalTab,
};

const content = document.getElementById('content');
let deferred = false;

function renderAll(){
  // 入力欄に入力中のときは、別端末からの更新で書きかけの文字が消えないよう後回しにする
  const active = document.activeElement;
  if(active && content.contains(active) && /^(TEXTAREA|INPUT)$/.test(active.tagName)){
    deferred = true;
    return;
  }
  deferred = false;
  renderDojoSelect();
  renderTabs();
  (TABS[state.ui.activeTab] || renderCalendarTab)(content);
}
content.addEventListener('focusout', ()=>{
  if(deferred) setTimeout(renderAll, 0);
});

setRenderer(renderAll);
setSyncBarRenderer(renderSyncBar);

loadLocal();     // まず端末内のデータですぐ表示
renderSyncBar();
renderAll();
initCloud();     // その後クラウドに接続（ログイン中ならクラウドのデータで更新される）
