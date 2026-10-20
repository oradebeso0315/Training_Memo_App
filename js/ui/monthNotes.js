/**
 * 月カレンダー＋その月のノート一覧（ノートタブ・過去実績タブで共通）
 * 複数の道場のノートを、道場ごとの色で1つのカレンダーにまとめて表示する
 */
import { getNote, hasContent, listNotes } from "../core/state.js";
import { deleteNote } from "../core/store.js";
import { rerender } from "../core/render.js";
import { openNoteModal } from "./noteModal.js";
import { SCHEDULES } from "../data/schedules.js";
import { escapeHtml, escapeAttr, ymd, parseYmd, DOW_LABELS, WEEK_ORDER } from "../core/utils.js";

/**
 * @param {object} opt
 *  dojos      … 表示する道場の配列（例: ["hearts_shinjuku","kix_shinjuku"]）
 *  title      … カードの見出し
 *  getMonth / setMonth … 表示中の月（Date）の読み書き
 * @returns {string} HTML（描画後に bindMonthNotes を呼ぶ）
 */
export function monthNotesHtml({dojos, title, getMonth}){
  const cur = getMonth();
  const year = cur.getFullYear(), month = cur.getMonth();
  const startWeekday = (new Date(year, month, 1).getDay()+6)%7; // 月曜=0
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const todayStr = ymd(new Date());
  const thisYear = new Date().getFullYear();
  const years = Array.from({length:8}, (_,i)=> thisYear-6+i);

  let cells = '';
  for(let i=0;i<startWeekday;i++) cells += `<div class="month-cell blank"></div>`;
  for(let d=1; d<=daysInMonth; d++){
    const dateStr = ymd(new Date(year,month,d));
    const recorded = dojos.filter(dj=> hasContent(getNote(dj, dateStr)));
    const style = recorded.length
      ? `style="--dojo:${SCHEDULES[recorded[0]].color}"` : '';
    cells += `
      <div class="month-cell ${recorded.length?'has-record':''} ${dateStr===todayStr?'today':''}" data-date="${dateStr}" ${style}>
        ${d}
        ${recorded.length ? `<div class="marks">${recorded.map(dj=>`<span class="mark" style="background:${SCHEDULES[dj].color}"></span>`).join('')}</div>` : ''}
      </div>`;
  }

  const monthPrefix = `${year}-${String(month+1).padStart(2,'0')}`;
  const entries = listNotes({dojos, monthPrefix});

  return `
    <div class="card">
      <div class="card-title">${title}</div>
      <div class="month-nav">
        <button data-nav="prev">‹</button>
        <div class="month-nav-selects">
          <select data-nav="year" class="period-select">
            ${years.map(y=>`<option value="${y}" ${y===year?'selected':''}>${y}年</option>`).join('')}
          </select>
          <select data-nav="month" class="period-select">
            ${Array.from({length:12},(_,m)=>`<option value="${m}" ${m===month?'selected':''}>${m+1}月</option>`).join('')}
          </select>
        </div>
        <button data-nav="next">›</button>
      </div>
      ${dojos.length>1 ? `<div class="dojo-legend">${dojos.map(dj=>`<div class="legend-item"><div class="legend-dot" style="background:${SCHEDULES[dj].color}"></div>${SCHEDULES[dj].short}</div>`).join('')}</div>` : ''}
      <div class="month-grid">
        ${WEEK_ORDER.map(d=>`<div class="month-dow">${d}</div>`).join('')}
        ${cells}
      </div>
    </div>
    <div class="card">
      <div class="card-title">${month+1}月の記録</div>
      ${entries.length===0
        ? `<div class="empty">この月の記録はまだありません。<br>日付をタップしてクラスとメモを記録できます。</div>`
        : entries.map(n=> noteItemHtml(n, dojos.length>1)).join('')}
    </div>
  `;
}

function noteItemHtml(note, showDojo){
  const d = parseYmd(note.date);
  const label = `${d.getMonth()+1}/${d.getDate()} (${DOW_LABELS[d.getDay()]})`;
  const classNames = note.classes.map(c=>c.name).join('、');
  const dojo = SCHEDULES[note.dojo];
  return `
    <div class="note-item" data-date="${note.date}" data-dojo="${note.dojo}" style="cursor:pointer;border-left:3px solid ${dojo.color};">
      <div class="note-item-head">
        <div class="note-item-meta">
          ${showDojo ? `<span class="dojo-tag" style="color:${dojo.color};border-color:${dojo.color}66">${dojo.short}</span>` : ''}
          ${label}${classNames?` ・ ${classNames}`:''}
        </div>
      </div>
      ${note.text ? `<div class="note-item-text">${escapeHtml(note.text)}</div>` : ''}
      ${note.fb ? `<div class="note-item-fb">🥋 ${escapeHtml(note.fb)}</div>` : ''}
      <div class="note-item-actions">
        <button data-id="${escapeAttr(note.id)}" class="delete-note">削除</button>
      </div>
    </div>
  `;
}

// 描画したHTMLにクリック等の動きを付ける
export function bindMonthNotes(root, {dojos, getMonth, setMonth}){
  const cur = getMonth();
  const year = cur.getFullYear(), month = cur.getMonth();
  const go = (y, m)=>{ setMonth(new Date(y, m, 1)); rerender(); };

  root.querySelector('[data-nav=prev]').onclick = ()=> go(year, month-1);
  root.querySelector('[data-nav=next]').onclick = ()=> go(year, month+1);
  root.querySelector('[data-nav=year]').onchange = (e)=> go(parseInt(e.target.value), month);
  root.querySelector('[data-nav=month]').onchange = (e)=> go(year, parseInt(e.target.value));

  root.querySelectorAll('.month-cell[data-date]').forEach(el=>{
    el.addEventListener('click', ()=> openNoteModal(el.dataset.date, {dojos}));
  });
  root.querySelectorAll('.note-item[data-date]').forEach(el=>{
    el.addEventListener('click', (e)=>{
      if(e.target.classList.contains('delete-note')) return;
      openNoteModal(el.dataset.date, {dojos, dojo: el.dataset.dojo});
    });
  });
  root.querySelectorAll('.delete-note').forEach(btn=>{
    btn.onclick = (e)=>{
      e.stopPropagation();
      if(confirm('この記録を削除しますか？')){
        deleteNote(btn.dataset.id);
        rerender();
      }
    };
  });
}
