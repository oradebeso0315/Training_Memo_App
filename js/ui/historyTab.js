/**
 * ノートタブ：選択中の道場の練習ノート（月カレンダー＋一覧）
 */
import { state } from "../core/state.js";
import { monthNotesHtml, bindMonthNotes } from "./monthNotes.js";

export function renderHistoryTab(el){
  const opt = {
    dojo: state.settings.dojo,
    title: "練習ノート（日付を選んでクラス＋メモを記録）",
    getMonth: ()=> state.ui.historyCalMonth,
    setMonth: (d)=>{ state.ui.historyCalMonth = d; },
  };
  el.innerHTML = monthNotesHtml(opt);
  bindMonthNotes(el, opt);
}
