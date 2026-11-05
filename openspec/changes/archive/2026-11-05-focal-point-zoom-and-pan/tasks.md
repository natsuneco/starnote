# Tasks

## 1. 2本指ジェスチャーおよび1本指パンの計算と通知

- [x] 1.1 `src/components/editor/DrawingCanvas.tsx` の `onPinchZoom` コールバックを、スケール比率、中心点、移動量（デルタ）を含む構造に拡張する
- [x] 1.2 `DrawingCanvas.tsx` において、「指で描画: OFF」時の1本指ドラッグによるパン移動量（`deltaX, deltaY`）を計算して親に通知する処理を実装する
- [x] 1.3 `DrawingCanvas.tsx` の `handleTouchMove` において、2本指ピンチ操作のスケール比率と移動ベクトルを計算して親に通知する

## 2. エディタ画面でのトランスフォーム適用とリセット

- [x] 2.1 `src/components/editor/EditorScreen.tsx` に `panOffset: { x: number, y: number }` 状態を追加し、Focal Point ズームおよび1本指/2本指パンの幾何更新ハンドラーを実装する
- [x] 2.2 `EditorScreen.tsx` の紙面コンテナに `translate3d(tx, ty, 0) scale(s)`（`transformOrigin: '0 0'`）を適用し、等倍リセットボタン押下時にパンオフセットも $(0, 0)$ に初期化されるようにする
- [x] 2.3 ズーム・パン移動中の紙面上で Apple Pencil 描画を行い、ペン先とインク描画位置が正確に追従することを確認する

## 3. ビルドおよび品質検証

- [x] 3.1 `npm run build` を実行し、TypeScriptの型チェックおよび本番バンドルが正常に通ることを確認する
