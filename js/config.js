/**
 * アプリ全体の設定値
 */

// Firebaseコンソール「プロジェクトの設定 > マイアプリ」の値
// ※ この apiKey は「どのFirebaseプロジェクトか」を示すだけの公開前提の値。
//   データの保護は Firestore のセキュリティルール（firestore.rules）で行う。
export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyD-XcK4fbwTkMJ_lJSvGh72cq4Jwr5pAJc",
  authDomain: "training-apps-d032b.firebaseapp.com",
  projectId: "training-apps-d032b",
  storageBucket: "training-apps-d032b.firebasestorage.app",
  messagingSenderId: "175847623227",
  appId: "1:175847623227:web:c3d96d8d53827dd4d02a1e",
};

// Firebase SDK（CDNから読み込むバージョン）
export const FIREBASE_SDK_URL = "https://www.gstatic.com/firebasejs/10.14.1";

// Gemini
export const GEMINI_MODEL = "gemini-2.5-flash-lite";

// 端末内（localStorage）の保存キー
export const LOCAL_KEY = "keishukai_training_log_v2";      // 現在の形式
export const LEGACY_LOCAL_KEY = "keishukai_training_log_v1"; // 旧形式（自動移行用に読むだけ）
export const MERGED_FLAG_KEY = "keishukai_cloud_merged_uid"; // この端末のデータをクラウドに合流済みか
