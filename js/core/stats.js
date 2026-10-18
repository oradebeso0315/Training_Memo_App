/**
 * 練習時間の集計（スキルタブ・目標ライン用）
 */
import { state, hasContent } from "./state.js";
import { SKILL_KEYS, getSkillsForClasses, GONZ_KUMI_CLASSES, GONZ_KUMI_HOURS } from "../data/skills.js";
import { PAST_DOJO } from "../data/schedules.js";
import { durationHours, parseYmd } from "./utils.js";

/**
 * カテゴリ別の練習時間(h)を合計する
 * @param {string|null} dojo   道場キー（nullなら全道場）
 * @param {"month"|"year"|"total"} period
 */
export function calcSkillTotals(dojo, period){
  const totals = Object.fromEntries(SKILL_KEYS.map(k=>[k,0]));
  const now = new Date();
  const yearPrefix = String(now.getFullYear());
  const monthPrefix = `${yearPrefix}-${String(now.getMonth()+1).padStart(2,'0')}`;

  Object.values(state.notes).forEach(note=>{
    if(dojo && note.dojo!==dojo) return;
    if(!note.classes.length) return;
    if(period==="month" && !note.date.startsWith(monthPrefix)) return;
    if(period==="year" && !note.date.startsWith(yearPrefix)) return;

    const skills = getSkillsForClasses(note.classes);
    // ゴンズジムの「組み」の日は、打込み＋スパーをまとめて1回 0.2h として数える
    const isPast = note.dojo===PAST_DOJO;
    let kumiCounted = false;
    note.classes.forEach((c,i)=>{
      if(isPast && GONZ_KUMI_CLASSES.includes(c.name)){
        if(!kumiCounted){ totals[skills[i]] += GONZ_KUMI_HOURS; kumiCounted = true; }
        return;
      }
      totals[skills[i]] += durationHours(c.start, c.end);
    });
  });
  return totals;
}

// 期間の長さを「週」で概算（週間目標から期間の目標値を出すため）
function getWeeksForPeriod(period){
  const now = new Date();
  const DAY = 1000*60*60*24;
  if(period==="month"){
    return Math.max(now.getDate()/7, 1/7);
  }
  if(period==="year"){
    const elapsed = Math.floor((now - new Date(now.getFullYear(),0,1))/DAY) + 1;
    return Math.max(elapsed/7, 1/7);
  }
  // total: 一番古い記録〜今日
  const dates = Object.values(state.notes).filter(hasContent).map(n=>n.date).sort();
  if(!dates.length) return 1;
  const elapsed = Math.floor((now - parseYmd(dates[0]))/DAY) + 1;
  return Math.max(elapsed/7, 1);
}

// 週間目標バランスを、指定期間（今月/今年/累計）の目標値に換算
export function getGoalForPeriod(period){
  const balance = state.settings.goalBalance;
  if(!balance) return null;
  const weeks = getWeeksForPeriod(period);
  return Object.fromEntries(SKILL_KEYS.map(k=>[k, (balance[k]||0) * weeks]));
}
