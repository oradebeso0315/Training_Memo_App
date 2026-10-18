/**
 * スキルタブ：カテゴリ別の練習時間をレーダーチャートと棒グラフで表示
 */
import { state } from "../core/state.js";
import { rerender } from "../core/render.js";
import { calcSkillTotals, getGoalForPeriod } from "../core/stats.js";
import { SKILL_KEYS, SKILL_META } from "../data/skills.js";

const PERIOD_LABELS = {month:"今月", year:"今年", total:"累計"};
const ACCENT = "#c8a06e";

export function renderSkillTab(el){
  const period = state.ui.skillPeriod;
  const totals = calcSkillTotals(null, period);
  const goal = getGoalForPeriod(period); // 目標未設定なら null

  // スケールは「実績」の最大値で決める（目標が超える場合は外周で切れる）
  const maxAll = Math.max(...SKILL_KEYS.map(k=> totals[k]), 1);

  el.innerHTML = `
    <div class="card">
      <div class="card-title-row">
        <div class="card-title">スキルバランス（${PERIOD_LABELS[period]}）</div>
        <select id="skillPeriodSelect" class="period-select">
          <option value="month" ${period==="month"?'selected':''}>月別（今月）</option>
          <option value="year" ${period==="year"?'selected':''}>年別（今年）</option>
          <option value="total" ${period==="total"?'selected':''}>累計</option>
        </select>
      </div>
      <div class="radar-wrap">
        ${radarSvg(totals, goal, maxAll)}
        <div class="radar-legend">
          <div class="legend-item"><div class="legend-dot" style="background:${ACCENT}"></div>記録した時間</div>
          ${goal ? `<div class="legend-item"><div class="legend-dot" style="background:#fff;opacity:.5"></div>目標バランス（${PERIOD_LABELS[period]}換算）</div>` : ''}
        </div>
      </div>
    </div>
    <div class="card">
      <div class="card-title">要素別 記録時間${goal ? ' / 目標バランス' : ''}</div>
      ${goal ? '' : `<div class="empty">目標設定タブで目標を入力すると、Geminiが推奨バランスを計算してここに目標ラインが表示されます。</div>`}
      ${SKILL_KEYS.map(k=> skillRow(k, totals[k], goal ? goal[k] : null, maxAll)).join('')}
    </div>
    <div class="empty">※ 全道場の記録をもとに自動集計しています。記録を削除するとグラフも更新されます。</div>
  `;

  document.getElementById('skillPeriodSelect').onchange = (e)=>{
    state.ui.skillPeriod = e.target.value;
    rerender();
  };
}

function skillRow(k, val, goal, max){
  const meta = SKILL_META[k];
  const valPct = Math.min(100, (val/max)*100);
  const goalPct = goal!==null ? Math.min(100, (goal/max)*100) : null;
  return `
    <div class="skill-row">
      <div class="skill-label" style="color:${meta.hex}">${meta.label}</div>
      <div class="skill-bar-track">
        <div class="skill-bar-fill" style="width:${valPct}%;background:${meta.hex}"></div>
        ${goalPct!==null ? `<div class="skill-bar-goal" style="left:${goalPct}%"></div>` : ''}
      </div>
      <div class="skill-val">${val.toFixed(1)}h${goal!==null ? ` / ${goal.toFixed(1)}h` : ''}</div>
    </div>
  `;
}

function radarSvg(totals, goal, max){
  const size=340, cx=size/2, cy=size/2, r=130;
  const angles = SKILL_KEYS.map((_,i)=> -Math.PI/2 + i*(Math.PI*2/SKILL_KEYS.length));
  const at = (i, rad)=> [cx + rad*Math.cos(angles[i]), cy + rad*Math.sin(angles[i])];
  const pointsFor = (values)=> SKILL_KEYS.map((k,i)=> at(i, r*Math.min(1, values[k]/max)));
  const poly = (pts)=> pts.map(p=>p.join(',')).join(' ');

  const grid = [0.25,0.5,0.75,1].map(f=>
    `<polygon points="${poly(SKILL_KEYS.map((_,i)=>at(i, r*f)))}" fill="none" stroke="#232a35" stroke-width="1"/>`
  ).join('');
  const axes = SKILL_KEYS.map((k,i)=>{
    const [x,y] = at(i, r);
    const [lx,ly] = at(i, r+30);
    return `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="#232a35" stroke-width="1"/>
      <text x="${lx}" y="${ly}" fill="${SKILL_META[k].hex}" font-size="13" font-weight="700" text-anchor="middle" dominant-baseline="middle" font-family="Zen Kaku Gothic New, sans-serif">${SKILL_META[k].label}</text>`;
  }).join('');
  const actual = pointsFor(totals);

  return `
    <svg class="radar-svg" viewBox="-40 0 ${size+80} ${size}" style="overflow:visible">
      ${grid}${axes}
      ${goal ? `<polygon points="${poly(pointsFor(goal))}" fill="none" stroke="#ffffff" stroke-width="1.5" stroke-dasharray="4 3" opacity="0.5"/>` : ''}
      <polygon points="${poly(actual)}" fill="${ACCENT}" fill-opacity="0.28" stroke="${ACCENT}" stroke-width="2"/>
      ${actual.map(p=>`<circle cx="${p[0]}" cy="${p[1]}" r="3.5" fill="${ACCENT}"/>`).join('')}
    </svg>
  `;
}
