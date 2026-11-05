# Tasks

## 1. 描画データモデルとインク曲線の生成モジュール

- [x] 1.1 `src/types/drawing.ts` にストロークデータ型（Stroke, StrokePoint, EraserMode, Bounds等）を定義する
- [x] 1.2 `src/lib/drawing/stroke.ts` に `perfect-freehand` を用いたアウトライン計算・Path2D生成ユーティリティを実装する

## 2. 低遅延多層キャンバスとストローク描画の実装

- [x] 2.1 `src/components/editor/DrawingCanvas.tsx` に確定線Canvasとアクティブ描画中Canvas（`desynchronized: true`）の2層コンポーネントを実装する
- [x] 2.2 `PointerEvent` の筆圧検知、`getCoalescedEvents()`、およびパームリジェクションを組み込んだ入力ハンドラを実装する
- [x] 2.3 通常ペン描画と蛍光ペン（`multiply` 合成モード）の切り替え描画を実装する

## 3. 消しゴム・Undo/Redo・永続化の実装

- [x] 3.1 ストローク消去（交差判定による丸ごと削除）と部分消去（半径判定による分割）の2つの消しゴムロジックを実装する
- [x] 3.2 ツールバーに消しゴムモード切り替えUI（ストローク/部分）およびUndo/Redoボタンの連携を実装する
- [x] 3.3 Dexie.js のテーブルにストローク保存用スキーマを追加し、ページ単位の保存と復元を実装する
- [x] 3.4 `npm run build` を実行し、TypeScriptの型チェックおよび本番バンドルが正常に通ることを確認する
