/**
 * カレンダータブ：道場の週間スケジュール（時間 × 曜日のグリッド）
 */
import { state } from "../core/state.js";
import { SCHEDULES } from "../data/schedules.js";
import { SKILL_KEYS, SKILL_META, getClassColor, getTextColorFor } from "../data/skills.js";
import { timeToMinutes, WEEK_ORDER } from "../core/utils.js";

const HOUR_HEIGHT = 60; // 1時間あたりの高さ(px)
const FREE = "フリートレーニング";

export function renderCalendarTab(el){
  const sched = SCHEDULES[state.settings.dojo];
  const gridStart = sched.gridStart ?? 8;
  const gridEnd = sched.gridEnd ?? 23;
  const gridHeight = (gridEnd - gridStart) * HOUR_HEIGHT;

  let hourLabels = '';
  for(let h=gridStart; h<=gridEnd; h++){
    hourLabels += `<div class="grid-hour-label" style="top:${(h-gridStart)*HOUR_HEIGHT}px">${h}</div>`;
  }

  const dayColsHtml = WEEK_ORDER.map(day=> renderDayColumn(day, sched.days[day]||[], gridStart, gridEnd, gridHeight)).join('');

  el.innerHTML = `
    <div class="card">
      <div class="card-title">週間スケジュール</div>
      <div class="cal-legend">
        ${SKILL_KEYS.map(k=>`<div class="legend-item"><div class="legend-dot" style="background:${SKILL_META[k].hex}"></div>${SKILL_META[k].label}</div>`).join('')}
      </div>
      <div class="grid-wrap">
        <div class="grid-hours">
          <div class="grid-day-header"></div>
          <div class="grid-hours-body" style="height:${gridHeight}px">${hourLabels}</div>
        </div>
        <div class="grid-days">${dayColsHtml}</div>
      </div>
      <div class="empty">※ 練習の記録は「ノート」タブから日付を選んで行えます。</div>
    </div>
  `;
}

function renderDayColumn(day, classes, gridStart, gridEnd, gridHeight){
  let cellsHtml = '';
  for(let h=gridStart; h<gridEnd; h++){
    cellsHtml += `<div class="grid-line" style="top:${(h-gridStart)*HOUR_HEIGHT}px"></div>`;
  }

  // フリートレーニングは背景として先に描く
  const sorted = [...classes].sort((a,b)=>{
    const aFree = a.name===FREE ? 0 : 1, bFree = b.name===FREE ? 0 : 1;
    if(aFree!==bFree) return aFree-bFree;
    return timeToMinutes(a.start)-timeToMinutes(b.start);
  });
  const layout = layoutOverlaps(sorted.filter(c=>c.name!==FREE));

  sorted.forEach(cls=>{
    const color = getClassColor(cls.name);
    const isFree = cls.name===FREE;
    const textColor = isFree ? 'var(--sub)' : getTextColorFor(color);
    const startMin = timeToMinutes(cls.start) - gridStart*60;
    const endMin = timeToMinutes(cls.end) - gridStart*60;
    const top = Math.max(0, (startMin/60)*HOUR_HEIGHT);
    const height = Math.max(18, ((endMin-startMin)/60)*HOUR_HEIGHT);

    let leftStyle = 'left:1px;right:1px;';
    const lo = layout.get(cls);
    if(lo && lo.cols>1){
      const w = 100/lo.cols;
      leftStyle = `left:calc(${w*lo.col}% + 1px);width:calc(${w}% - 2px);right:auto;`;
    }

    cellsHtml += `
      <div class="grid-class ${isFree?'is-free':''}"
           style="top:${top}px;height:${height}px;${leftStyle}background:${isFree?color+'18':color};border-color:${color};color:${textColor};">
        <div class="grid-class-name">${cls.name}</div>
        <div class="grid-class-time">${cls.start}-${cls.end}</div>
      </div>
    `;
  });

  return `
    <div class="grid-day-col">
      <div class="grid-day-header">${day}</div>
      <div class="grid-day-body" style="height:${gridHeight}px">${cellsHtml}</div>
    </div>
  `;
}

// 時間が重なるクラスを横に並べるための列番号を決める
function layoutOverlaps(classes){
  const layout = new Map();
  classes.forEach(cls=>{
    const aStart = timeToMinutes(cls.start), aEnd = timeToMinutes(cls.end);
    const overlapping = classes.filter(o=> aStart < timeToMinutes(o.end) && timeToMinutes(o.start) < aEnd);
    layout.set(cls, {col: overlapping.indexOf(cls), cols: overlapping.length});
  });
  return layout;
}
