# 格闘技練習ノートアプリ

道場のスケジュールから受けたクラスを選んで練習を記録し、打撃・ノーギ・ギあり・MMAのバランスを可視化する、自分専用のWebアプリ。
Googleログインでクラウドに保存し、iPhoneとPCで同じデータを使える。

**デモ:** https://oradebeso0315.github.io/Training_Memo_App/

## 作った背景

趣味で総合格闘技をやっており、アマチュア大会への出場を目標にしている。
仕事の兼ね合いで頻繁に通うことが難しく、前回の練習内容を忘れがちだったため、
見返せる練習ノートを作ることにした。

既存のiOSアプリは丸印カレンダー形式で、前のジム（神戸）では
曜日ごとに「打撃・組み・寝技」がきれいに分かれていたため十分だった。
しかし東京転居後に通うジムは1日の中に複数カテゴリのクラスが混在しており、
「どのカテゴリの練習が足りていないか」を既存アプリでは分析しづらかった。

iPhone買い替えのコストやストレージ問題も考慮した結果、
自分の要件に合ったWebアプリを自作することにした。

## 機能

| タブ | 内容 |
|------|------|
| カレンダー | 道場ごとの週間スケジュールを時間×曜日のグリッドで表示（HEARTS新宿 / KIX新宿 / KIX駒沢） |
| 今日の意識 | 今日のクラス内容と最近の記録から、Geminiが「今日意識すること」を1つ提案 |
| スキル | 打撃・ノーギ・ギあり・MMAの練習時間をレーダーチャートで可視化（今月 / 今年 / 累計）。目標ラインも表示 |
| ノート | 日付を選び、受けたクラスとメモを記録。保存するとGeminiがフィードバック |
| 過去実績 | 以前のジム（神戸）の記録を入力し、Geminiで要約して前提情報に反映 |
| 目標設定 | 経歴・目標を書くと、Geminiが週間の推奨練習バランスと行動アドバイスを計算 |

## 技術構成

| 項目 | 内容 |
|------|------|
| フロントエンド | HTML / CSS / Vanilla JavaScript（ES Modules、ビルドなし） |
| 認証 | Firebase Authentication（Googleログイン） |
| データベース | Cloud Firestore（リアルタイム同期） |
| オフライン用コピー | localStorage |
| AI | Gemini API（gemini-2.5-flash-lite） |
| ホスティング | GitHub Pages |

```
ブラウザ（iPhone / PC）
 ├─ 画面（js/ui）
 ├─ 状態管理・保存（js/core）──┬─ localStorage（端末内コピー）
 │                             └─ Firestore（クラウド・リアルタイム同期）
 └─ Gemini API（フィードバック・提案・要約）
```

## データ構造（Firestore）

```
users/{uid}                        … 設定（1ユーザー1件）
  dojo            選択中の道場
  background      前提情報（経歴・背景）
  goalText        目標
  goalBalance     {striking, nogi, gi, mma} 推奨週間練習時間(h)
  goalAdvice      行動面のアドバイス
  focusSuggestion {key, text} 今日の意識（1日1回キャッシュ）
  geminiApiKey    Gemini APIキー
  schemaVersion   2
  updatedAt

users/{uid}/notes/{道場}_{日付}      … 練習ノート（1日1件）
  例: hearts_shinjuku_2026-10-18
  dojo            道場
  date            "YYYY-MM-DD"
  classes         [{name, start, end}] 受けたクラス
  text            メモ
  feedback        Geminiのフィードバック
  updatedAt
```

**設計で意識したこと**

- **ノートを1日1ドキュメントに分割**：保存時は変更した1件だけを書き込む（増分保存）。全データを丸ごと上書きしないので、iPhoneとPCでほぼ同時に別のノートを書いても片方が消えない
- **ドキュメントIDを「道場_日付」にした**：同じ日の同じ道場のノートは必ず1件になり、Firebaseコンソールでも中身を探しやすい
- **カテゴリ（打撃/ノーギ等）はDBに持たない**：クラス名から毎回算出する。カテゴリの分け方を変えても過去データの修正が不要
- **リアルタイム同期**：`onSnapshot` で購読し、別端末の変更を自動で反映
- **セキュリティ**：`firestore.rules` で、本人のデータ（`users/{自分のuid}` 以下）しか読み書きできないようにしている

### データの移行

当初は localStorage のみに保存していたが、iPhone Safari ではしばらく開かないとサイトのデータが自動削除され、ノートやAPIキーが消える問題があった。
次に全データを1つの文字列にして Firestore に保存したが、コンソールで読めない・同時編集で上書きされる問題があったため、現在の構造にした。
古い形式のデータは、読み込み時に自動で新しい形式へ変換している（`js/core/state.js` の `convertLegacy`）。

## ファイル構成

```
index.html              画面の骨組み
css/style.css           見た目
firestore.rules         Firestoreのセキュリティルール
js/
  main.js               起動・タブの切り替え
  config.js             Firebase設定・定数
  data/                 変わりにくいデータ
    schedules.js          道場ごとの週間スケジュール
    skills.js             カテゴリ定義、クラス名→カテゴリ・色の対応表
    background.js         前提情報の初期値
  core/                 画面に依存しないロジック
    state.js              アプリの状態、旧形式からの変換、端末内保存
    store.js              データ変更の窓口（端末内＋クラウドに保存）
    cloud.js              Firebase（ログイン・Firestore同期）
    gemini.js             Gemini APIとプロンプト
    stats.js              練習時間の集計
    render.js             再描画の呼び出し窓口
    utils.js              日付・HTMLエスケープなどの小物
  ui/                   画面（タブごと）
    syncBar.js            ログイン・保存状態のバー
    nav.js                道場切り替え・タブ
    calendarTab.js        カレンダー
    focusTab.js           今日の意識
    skillTab.js           スキル（レーダーチャート）
    historyTab.js         ノート
    pastTab.js            過去実績
    goalTab.js            目標設定
    monthNotes.js         月カレンダー＋ノート一覧（ノート・過去実績で共通）
    noteModal.js          ノート入力モーダル
```

データの流れは一方向にしている：
**画面（ui）→ `store.js` で変更 → localStorage と Firestore に保存 → `rerender()` で画面を描き直す**。
別端末の変更は `cloud.js` が受け取り、同じく `rerender()` で反映する。

## セットアップ（自分で動かす場合）

1. Firebaseでプロジェクトを作成し、以下を有効化
   - Authentication → Googleログイン（承認済みドメインに公開先ドメインを追加）
   - Firestore Database
2. Firestoreの「ルール」に `firestore.rules` の内容を貼り付けて公開
3. `js/config.js` の `FIREBASE_CONFIG` を自分のプロジェクトの値に書き換える
4. ES Modules を使っているため、ローカルで確認するときは簡易サーバー経由で開く
   ```
   python3 -m http.server 8000
   # → http://localhost:8000 を開く
   ```
5. Gemini APIキーは、アプリの「目標設定」タブから入力（[Google AI Studio](https://aistudio.google.com/app/apikey) で無料発行）
