/**
 * 画面の再描画を呼び出すための窓口
 * （各画面モジュールが main.js を直接読み込むと循環参照になるため、ここを経由する）
 */
let renderer = ()=>{};
let syncBarRenderer = ()=>{};

export function setRenderer(fn){ renderer = fn; }
export function setSyncBarRenderer(fn){ syncBarRenderer = fn; }

// 今のタブ全体を描き直す
export function rerender(){ renderer(); }
// 画面上部の同期バーだけ描き直す
export function rerenderSyncBar(){ syncBarRenderer(); }
