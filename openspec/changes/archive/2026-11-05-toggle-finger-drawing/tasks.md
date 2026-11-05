# Tasks

## 1. キャンバスでの指操作制御の実装

- [x] 1.1 `src/components/editor/DrawingCanvas.tsx` の `DrawingCanvasProps` に `allowFingerDrawing?: boolean` を追加し、`propsRef` に最新値を同期する
- [x] 1.2 `DrawingCanvas.tsx` の `touchstart` / `touchmove` リスナーにおいて、`allowFingerDrawing === false` の場合は `e.preventDefault()` の呼び出しをスキップし、親スクロールを通過させる
- [x] 1.3 `DrawingCanvas.tsx` の `handleNativePointerDown` において、`allowFingerDrawing === false && e.pointerType === 'touch'` の場合は描画セッションを開始せず早期リターンする

## 2. エディタツールバーUIと設定永続化

- [x] 2.1 `src/components/editor/EditorScreen.tsx` において、`allowFingerDrawing` の状態管理と `localStorage` への読み書き処理を実装する
- [x] 2.2 ツールバーに「指で描画（Finger Drawing）」の切り替えトグルボタンを追加し、`PageItem` を経由して `DrawingCanvas` に設定値を伝達する

## 3. ビルドおよび品質検証

- [x] 3.1 `npm run build` を実行し、TypeScriptの型チェックおよび本番バンドルが正常に完了することを確認する
