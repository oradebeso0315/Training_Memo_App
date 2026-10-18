/**
 * データを変更するときの窓口
 * 端末内（localStorage）とクラウド（Firestore）の両方に保存する
 */
import { state, normalizeNote, hasContent, saveLocal } from "./state.js";
import { cloudWriteNote, cloudDeleteNote, cloudWriteSettings } from "./cloud.js";

// ノートを保存（中身が空なら削除）
export function saveNote({dojo, date, classes, text, fb}){
  const note = normalizeNote({dojo, date, classes, text, fb, updatedAt: Date.now()});
  if(!hasContent(note)){
    deleteNote(note.id);
    return null;
  }
  state.notes[note.id] = note;
  saveLocal();
  cloudWriteNote(note);
  return note;
}

export function deleteNote(id){
  if(!state.notes[id]) return;
  delete state.notes[id];
  saveLocal();
  cloudDeleteNote(id);
}

// 設定の一部を更新  例: updateSettings({goalText: "..."})
export function updateSettings(patch){
  Object.assign(state.settings, patch);
  saveLocal();
  cloudWriteSettings();
}

