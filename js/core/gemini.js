/**
 * Gemini API 連携（フィードバック・今日の意識・目標バランス・過去実績の要約）
 */
import { GEMINI_MODEL } from "../config.js";
import { state, listNotes } from "./state.js";
import { SCHEDULES, PAST_DOJO } from "../data/schedules.js";
import { SKILL_META, SKILL_KEYS, getSkill, getSkillsForClasses } from "../data/skills.js";
import { DOW_LABELS } from "./utils.js";

export function hasApiKey(){
  return !!state.settings.apiKey;
}

export async function callGemini(prompt){
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(state.settings.apiKey)}`;
  const res = await fetch(url, {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body: JSON.stringify({ contents:[{ parts:[{text:prompt}] }] }),
  });
  if(!res.ok){
    const errData = await res.json().catch(()=>({}));
    throw new Error(errData?.error?.message || `HTTP ${res.status}`);
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if(!text) throw new Error("応答が空でした");
  return text.trim();
}

/* ---------- プロンプトの共通部品 ---------- */

function goalLine(){
  const g = state.settings.goalText?.trim();
  return g ? `目標: ${g}` : "（目標は未設定）";
}
function backgroundLine(){
  const b = state.settings.background?.trim();
  return b ? `\n選手の背景・経歴:\n${b}\n` : "";
}
function dojoLabel(dojo){
  const s = SCHEDULES[dojo];
  return s ? `${s.name}${s.sub?`（${s.sub}）`:''}` : dojo;
}

/* ---------- 練習ノートへのフィードバック ---------- */

export async function getFeedback(classes, noteText){
  let classLine = "（記録されたクラスはありません）";
  if(classes && classes.length>0){
    const skills = getSkillsForClasses(classes);
    classLine = classes.map((c,i)=>`${c.name}（${c.start}-${c.end}, カテゴリ: ${SKILL_META[skills[i]].label}）`).join("、");
  }

  const prompt = `あなたは格闘技ジムのコーチです。以下の練習ノートに対して、短く（3〜4文程度）、具体的で実践的なフィードバックを日本語で書いてください。
励ましつつ、次回の練習で意識すべき点を1つ提案してください。目標が設定されている場合は、その目標に向けて今の練習がどう役立つかも触れてください。選手の経歴・経験レベルを踏まえた、レベルに合ったアドバイスにしてください。
${backgroundLine()}
この日に行ったクラス: ${classLine}
${goalLine()}

練習ノート:
${noteText}`;

  return await callGemini(prompt);
}

/* ---------- 今日の意識 ---------- */

export async function getTodayFocus(){
  const dojo = state.settings.dojo;
  const sched = SCHEDULES[dojo];
  const todayDayKey = DOW_LABELS[new Date().getDay()];
  const todayClasses = (sched.days[todayDayKey]||[]).filter(c=>c.name!=="フリートレーニング");

  let todayMenuLine;
  if(todayClasses.length>0){
    const menuList = todayClasses.map(c=>`${c.name}（${c.start}-${c.end}, カテゴリ: ${SKILL_META[getSkill(c.name)].label}）`).join('、');
    todayMenuLine = `今日（${todayDayKey}曜日）に通う予定の道場: ${dojoLabel(dojo)}\nそのクラス: ${menuList}`;
  } else {
    todayMenuLine = `今日（${todayDayKey}曜日）に通う予定の道場: ${dojoLabel(dojo)}\nこの曜日に通常クラスはありません（フリートレーニングのみ）。`;
  }

  // 全道場＋過去ジムの記録から、直近15件を使う
  const recent = listNotes({newestFirst:true}).slice(0, 15);
  const logText = recent.length===0 ? "（記録がまだありません）" : recent.map(n=>{
    const classNames = n.classes.map(c=>c.name).join('、');
    return `${n.date}（${dojoLabel(n.dojo)}）${classNames?` [${classNames}]`:''}${n.text?`\n${n.text}`:''}`;
  }).join('\n---\n');

  const prompt = `あなたは格闘技ジムのコーチです。以下の選手の「今日通う予定の道場とそのクラス内容」「過去の練習記録（直近のもの優先）」「背景」「目標」を読んで、この選手が「今日の練習で意識すべきこと」を1つだけ選び、日本語で提案してください。
今日のクラス内容に直接関係する、実践的な提案にしてください（クラスにないカテゴリの話は避ける）。

出力は以下の形式の見出し+本文のみで、それ以外の説明や前置きは一切不要です:
【今日の意識】
（10〜20字程度の短いキーワード・フレーズ）

【理由】
（2〜3文程度。なぜこれを選んだか、今日のクラス内容・最近の記録のどこから読み取ったかを具体的に）

${todayMenuLine}
${backgroundLine()}
${goalLine()}

過去の練習記録（新しい順）:
${logText}`;

  return await callGemini(prompt);
}

/* ---------- 目標 → 週間練習バランス ---------- */

export async function calcGoalBalance(goalText){
  const prompt = `あなたは格闘技ジムのコーチです。以下の選手の背景と目標を読んで、2つのことを提案してください。

選手の現在の経験レベル・通えるペース（背景情報を参照）を踏まえて、現実的に達成可能な内容にしてください。
${backgroundLine()}
カテゴリの定義:
- 打撃: キックボクシング、ボクシングなどの打撃技術・スパー
- ノーギ: 道着なしの組み技・寝技（グラップリング）の技術・スパー
- ギあり: 道着ありの柔術の技術・スパー
- MMA: MMA総合練習、アマチュア選手向け練習

選手の目標:
${goalText}

1つ目: 目標達成のために理想的な「週間の練習時間バランス」を、打撃・ノーギ・ギあり・MMAの4カテゴリで提案（数値は週あたりの時間数、0〜15の範囲、小数可）。

2つ目: 「週間の練習時間バランス」だけでは目標達成に不十分な場合があります（例: 週1回ペースを1年続けても大会出場という行動目標には届かなかった、というケースもあります）。練習時間の配分に加えて、目標を達成するために必要な「行動面・ペース面のアドバイス」を3〜4文程度で日本語で書いてください。通う頻度、大会エントリーや申し込みのタイミング、スパー経験量の確保など、技術練習の配分だけでは見落としがちな点に触れてください。

出力は説明文なしで、以下のJSON形式のみを返してください:
{"balance":{"striking":数値,"nogi":数値,"gi":数値,"mma":数値},"advice":"行動面・ペース面のアドバイス文"}`;

  const raw = await callGemini(prompt);
  const cleaned = raw.replace(/```json|```/g,'').trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if(!match) throw new Error("バランス計算の応答を解析できませんでした");
  const parsed = JSON.parse(match[0]);
  const balanceRaw = parsed.balance || parsed; // 旧形式の応答にも対応
  const balance = {};
  SKILL_KEYS.forEach(k=>{
    const v = Number(balanceRaw[k]);
    balance[k] = isNaN(v) ? 0 : Math.max(0, v);
  });
  return {balance, advice: parsed.advice || ""};
}

/* ---------- 過去実績（ゴンズジム）の要約 ---------- */

export async function summarizePastRecords(){
  const listText = listNotes({dojo: PAST_DOJO}).map(n=>{
    const classNames = n.classes.map(c=>c.name).join('、');
    return `${n.date}: ${classNames}${n.text?` / メモ: ${n.text}`:''}`;
  }).join('\n');

  const prompt = `以下は、ある格闘技選手がゴンズジム（神戸）で過去に練習した記録（日付ごとのクラスとメモ）です。この内容を読んで、選手の経歴・経験レベル・得意/不得意な分野・練習頻度の傾向を、3〜5文程度で日本語で要約してください。
今後コーチがこの選手にアドバイスする際の「前提情報」として使われます。説明文や見出しは付けず、要約文のみを出力してください。

記録:
${listText}`;

  return await callGemini(prompt);
}
