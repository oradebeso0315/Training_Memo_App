/**
 * ノートタブ：今通っている全道場（HEARTS・KIX新宿・KIX駒沢）の練習ノートを1つのカレンダーで表示
 * 道場ごとに色分けし、記録するときにモーダルで道場を選ぶ
 */
import { state } from "../core/state.js";
import { CURRENT_DOJOS } from "../data/schedules.js";
import { monthNotesHtml, bindMonthNotes } from "./monthNotes.js";

export function renderHistoryTab(el){
  const opt = {
    dojos: CURRENT_DOJOS,
    title: "練習ノート（日付を選んで道場・クラス・メモを記録）",
    getMonth: ()=> state.ui.historyCalMonth,
    setMonth: (d)=>{ state.ui.historyCalMonth = d; },
  };
  el.innerHTML = monthNotesHtml(opt);
  bindMonthNotes(el, opt);
}
