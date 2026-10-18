/**
 * どこからでも使う小さな関数
 */

export const DOW_LABELS = ["日","月","火","水","木","金","土"];   // getDay()の順
export const WEEK_ORDER = ["月","火","水","木","金","土","日"];   // 表示は月曜始まり

export function escapeHtml(s){
  return String(s ?? "").replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
export function escapeAttr(s){
  return escapeHtml(s).replace(/\n/g,'');
}

// Date → "YYYY-MM-DD"
export function ymd(d){
  const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,'0'), day=String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}
// "YYYY-MM-DD" → Date（端末の時刻で解釈）
export function parseYmd(dateStr){
  const [y,m,d] = dateStr.split("-").map(Number);
  return new Date(y, m-1, d);
}
// "YYYY-MM-DD" → "月" などの曜日
export function dayKeyOf(dateStr){
  return DOW_LABELS[parseYmd(dateStr).getDay()];
}

export function timeToMinutes(t){
  const [h,m]=t.split(":").map(Number);
  return h*60+m;
}
export function durationHours(start,end){
  return (timeToMinutes(end)-timeToMinutes(start))/60;
}
