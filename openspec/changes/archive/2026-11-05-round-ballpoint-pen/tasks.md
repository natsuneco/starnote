# Tasks

## 1. 従来の入り抜き処理の削除とネイティブ丸ペン描画エンジンの実装

- [x] 1.1 `src/lib/drawing/stroke.ts` から従来の `perfect-freehand` によるポリゴン輪郭計算・塗りつぶし処理を削除し、ネイティブな丸ペン線描画（`lineWidth = size`, `lineCap = 'round'`, `lineJoin = 'round'`, 中間点スプライン補間による `ctx.stroke()`）および単一タップ時の `ctx.arc()` による円形ドット描画を実装する
- [x] 1.2 `src/lib/drawing/stroke.ts` の `renderDot` および `renderIncrementalSegment` を更新し、描画中の差分追記とペン離脱後の確定線が完全に同一の均一丸ペン線幅・形状になるように統一する

## 2. キャンバス入力およびコミット処理の調整

- [x] 2.1 `src/components/editor/DrawingCanvas.tsx` において、単一タップ時や極小ストローク（濁点・句読点）の終了時に、入り抜きによる縮退や消失なく確実にドットストロークとして登録されるように調整する

## 3. PDF ベクターエクスポートの同期

- [x] 3.1 `src/lib/pdf/generator.ts` において、従来の多角形ベクター出力からネイティブな丸ペン線ストローク（`stroke-linecap="round"`, `stroke-linejoin="round"`）および円形ドット出力へ移行する

## 4. ビルドおよび品質検証

- [x] 4.1 `npm run build` を実行し、TypeScriptの型チェックおよびバンドルが正常に通ることを確認する
