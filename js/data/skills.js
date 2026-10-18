/**
 * 練習カテゴリ（打撃 / ノーギ / ギあり / MMA）と、クラス名 → カテゴリ・色の対応表
 */
export const SKILL_META = {
  striking:{label:"打撃", hex:"#e0524d"},
  gi:{label:"ギあり", hex:"#4d8b6e"},
  nogi:{label:"ノーギ", hex:"#4d7be0"},
  mma:{label:"MMA", hex:"#b08ae0"},
};
export const SKILL_KEYS = ["striking","nogi","gi","mma"];

// クラスごとの表示固有色（画像のスケジュール表に準拠）
export const CLASS_COLORS = {
  "フリートレーニング":"#3a3f4a",
  // KIX 新宿
  "キック初級":"#3eb8c8",
  "キック超初級":"#7fd4e0",
  "サンドバックミット":"#e8918a",
  "グラップリング初級":"#8b6db5",
  "グラップリング超初級":"#c5b8e0",
  "グラップリング":"#4a3a6a",
  "グラップリングテクニック":"#4a3a6a",
  "サーキット":"#e02020",
  "ライトスパー":"#cfe3ee",
  "キックボクシングフォーム指導フリーミット":"#a8d8e8",
  // KIX 駒沢
  "キッズ":"#f0e040",
  "フィットネス":"#f0c8a8",
  "MMA初級":"#e8943a",
  "MMA":"#e8943a",
  "MMAスパー":"#f0c8a0",
  // HEARTS 新宿
  "高強度サーキット":"#e02020",
  "アマチュア選手志望練習":"#6a6a6a",
  "キックテクニック":"#3eb8c8",
  "キック上級":"#1565c0",
  "柔術オールクラス":"#8fbf8f",
  "柔術スパー":"#4d8b6e",
  "柔術テクニック":"#4d8b6e",
  "グラップリングスパー":"#4a3a6a",
  "グラップリング中級":"#8b6db5",
  "MMAレスリング":"#e8943a",
  "MMAフィジカルトレーニング":"#e07a2a",
  "アマチュアMMA":"#f0a830",
  "キック&サンドバックミット":"#cfe3ee",
  "超初級グラップリング&柔術基礎":"#c5b8e0",
  "グラップリング&柔術":"#9fc88f",
  "グラップリング&柔術スパー":"#9fc88f",
  "MMAテクニック":"#b08ae0",
  "MMA初級ク":"#e8943a",
  "ボクシングテクニック":"#e0524d",
  // ゴンズジム（過去）
  "寝技打込み":"#4d8b6e","寝技スパー":"#3a6a52",
  "キック打込み":"#e0524d","キックスパー":"#b03c38",
  "組み打込み":"#4d7be0","組みスパー":"#3a5cb0",
  "ミット&寝技打込み":"#6ba88a",
  "MMA打込み":"#b08ae0",
  "着あり寝技打込み":"#8b6db5","着ありスパー":"#6a5a8b",
};
export function getClassColor(className){
  return CLASS_COLORS[className] || SKILL_META[getSkill(className)].hex;
}
// 背景色の明度に応じて読みやすい文字色を返す
export function getTextColorFor(hex){
  const h = hex.replace('#','');
  const r = parseInt(h.substring(0,2),16);
  const g = parseInt(h.substring(2,4),16);
  const b = parseInt(h.substring(4,6),16);
  const luminance = (0.299*r + 0.587*g + 0.114*b)/255;
  return luminance > 0.6 ? '#1a1a1a' : '#ffffff';
}

export const SKILL_MAP = {
  "高強度サーキット":"striking","キックテクニック":"striking","ライトスパー":"striking",
  "ボクシングテクニック":"striking","キック上級":"striking","キック":"striking",
  "柔術オールクラス":"gi","柔術スパー":"gi","柔術テクニック":"gi",
  "グラップリングテクニック":"nogi","グラップリングスパー":"nogi",
  "グラップリング中級":"nogi","MMAレスリング":"mma","組み技スパー":"nogi",
  "MMAフィジカルトレーニング":"mma","アマチュアMMA":"mma",
  "キック&サンドバックミット":"striking","サンドバックミット":"striking",
  "超初級グラップリング&柔術基礎":"nogi","グラップリング&柔術":"nogi","グラップリング&柔術スパー":"nogi",
  "MMA初級":"mma","MMAテクニック":"mma","アマチュア選手志望練習":"mma","MMAスパー":"mma",
  "フリーウェイト":"mma","ウェイトトレーニング":"mma","ストレッチ":"mma",
  "打撃クラス":"striking","打撃スパー":"striking",
  "極めクラス":"nogi","極めスパー":"nogi",
  "投げクラス":"nogi","投げスパー":"nogi",
  "総合スパー":"mma","初心者クラス":"mma","体験会":"mma",
  // KIX 新宿・駒沢で使用するクラス
  "フリートレーニング":"mma",
  "高強度オールクラス":"striking",
  "フィットネス":"mma",
  "サンドバックミット":"striking",
  "キック初級":"striking","キック超初級":"striking",
  "キックボクシングフォーム作りプリーミット":"striking",
  "キックボクシングフォーム指導フリーミット":"striking",
  "サーキット":"striking",
  "グラップリング初級":"nogi","グラップリング超初級":"nogi",
  "グラップリング":"nogi","グラップリングテクニック":"nogi",
  "キッズ":"mma",
  "サンドバック":"striking",
  "MMA":"mma","MMAスパー":"mma",
  // ゴンズジム（過去）で使用するクラス
  "寝技打込み":"nogi","寝技スパー":"nogi",
  "キック打込み":"striking","キックスパー":"striking",
  "組み打込み":"nogi","組みスパー":"nogi",
  "ミット&寝技打込み":"nogi",
  "MMA打込み":"mma",
  "着あり寝技打込み":"gi","着ありスパー":"gi",
};

/**
 * クラス名からカテゴリを返す
 * 「ライトスパー」は直前のクラスと同じカテゴリとして扱う（キックの後なら打撃、など）
 */
export function getSkill(className, prevClassName){
  if(className==="ライトスパー" && prevClassName){
    return SKILL_MAP[prevClassName] || "mma";
  }
  return SKILL_MAP[className] || "mma";
}

// classes配列の各クラスのカテゴリを「直前のクラス」を考慮して算出
export function getSkillsForClasses(classes){
  let prevName = null;
  return classes.map(c=>{
    const sk = getSkill(c.name, prevName);
    if(c.name!=="ライトスパー") prevName = c.name;
    return sk;
  });
}

// ゴンズジムの組みの日（打込み＋スパー）は合わせて0.2hで計算する
export const GONZ_KUMI_CLASSES = ["組み打込み","組みスパー"];
export const GONZ_KUMI_HOURS = 0.2;
