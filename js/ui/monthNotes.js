/**
 * 月カレンダー＋その月のノート一覧（ノートタブ・過去実績タブで共通）
 */
import { getNote, hasContent, listNotes } from "../core/state.js";
import { deleteNote } from "../core/store.js";
import { rerender } from "../core/render.js";
import { openNoteModal } from "./noteModal.js";
import { escapeHtml, escapeAttr, ymd, parseYmd, DOW_LABELS, WEEK_ORDER } from "../core/utils.js";

/**
 * @param {object} opt
 *  dojo       … 表示する道場
 *  title      … カードの見出し
 *  getMonth / setMonth … 表示中の月（Date）の読み書き
 * @returns {string} HTML（描画後に bindMonthNotes を呼ぶ）
 */
export function monthNotesHtml({dojo, title, getMonth}){
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
    const has = hasContent(getNote(dojo, dateStr));
    cells += `
      <div class="month-cell ${has?'has-record':''} ${dateStr===todayStr?'today':''}" data-date="${dateStr}">
        ${d}${has?'<div class="mark"></div>':''}
      </div>`;
  }

  const monthPrefix = `${year}-${String(month+1).padStart(2,'0')}`;
  const entries = listNotes({dojo, monthPrefix});

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
      <div class="month-grid">
        ${WEEK_ORDER.map(d=>`<div class="month-dow">${d}</div>`).join('')}
        ${cells}
      </div>
    </div>
    <div class="card">
      <div class="card-title">${month+1}月の記録</div>
      ${entries.length===0
        ? `<div class="empty">この月の記録はまだありません。<br>日付をタップしてクラスとメモを記録できます。</div>`
        : entries.map(noteItemHtml).join('')}
    </div>
  `;
}

function noteItemHtml(note){
  const d = parseYmd(note.date);
  const label = `${d.getMonth()+1}/${d.getDate()} (${DOW_LABELS[d.getDay()]})`;
  const classNames = note.classes.map(c=>c.name).join('、');
  return `
    <div class="note-item" data-date="${note.date}" style="cursor:pointer;">
      <div class="note-item-head">
        <div class="note-item-meta">${label}${classNames?` ・ ${classNames}`:''}</div>
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
export function bindMonthNotes(root, {dojo, getMonth, setMonth}){
  const cur = getMonth();
  const year = cur.getFullYear(), month = cur.getMonth();
  const go = (y, m)=>{ setMonth(new Date(y, m, 1)); rerender(); };

  root.querySelector('[data-nav=prev]').onclick = ()=> go(year, month-1);
  root.querySelector('[data-nav=next]').onclick = ()=> go(year, month+1);
  root.querySelector('[data-nav=year]').onchange = (e)=> go(parseInt(e.target.value), month);
  root.querySelector('[data-nav=month]').onchange = (e)=> go(year, parseInt(e.target.value));

  root.querySelectorAll('.month-cell[data-date]').forEach(el=>{
    el.addEventListener('click', ()=> openNoteModal(el.dataset.date, dojo));
  });
  root.querySelectorAll('.note-item[data-date]').forEach(el=>{
    el.addEventListener('click', (e)=>{
      if(e.target.classList.contains('delete-note')) return;
      openNoteModal(el.dataset.date, dojo);
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

