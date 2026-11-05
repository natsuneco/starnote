# Tasks

## 1. マルチタッチジェスチャ（2本指Undo / 3本指Redo）の実装

- [x] 1.1 `src/components/editor/DrawingCanvas.tsx` の `DrawingCanvasProps` に `onUndo?: () => void` および `onRedo?: () => void` を追加する
- [x] 1.2 `DrawingCanvas.tsx` にマルチタッチ検出ロジックを実装し、2本指タップで `onUndo`、3本指タップで `onRedo` が誤描画なしに発火することを確認する

## 2. 2本指ピンチズーム＆パンの実装

- [x] 2.1 `src/components/editor/EditorScreen.tsx` にズーム倍率（`zoomScale`）の状態管理を実装し、紙面コンテナに拡大縮小を適用する
- [x] 2.2 `DrawingCanvas.tsx` の2本指操作からピンチ距離の変化を算出してズーム更新を親に通知し、ピンチとタップ判定が互いに干渉しないことを確認する
- [x] 2.3 ズーム倍率を変更した状態（例: 150%, 200%）において、Apple Pencil による手書き描画座標がペン先と完全に一致することを確認する

## 3. ズーム倍率UIとビルド検証

- [x] 3.1 `src/components/editor/EditorScreen.tsx` のヘッダーにズーム倍率インジケーター（等倍リセット機能付き）を追加する
- [x] 3.2 `npm run build` を実行し、TypeScriptの型チェックおよび本番バンドルが正常に通ることを確認する
