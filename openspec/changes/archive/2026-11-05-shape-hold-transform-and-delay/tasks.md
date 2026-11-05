# Tasks

## 1. 図形変形ロジックの実装

- [x] 1.1 `src/lib/gesture/shapes.ts` に、スナップ後のペン先ドラッグ座標に応じて直線（長さ・角度）、円（半径）、四角形（対角幅・高さ）をリアルタイムに再計算・変形する `transformSnappedShape` 関数を実装する

## 2. ホールド時間の延長とドラッグ追従UIの実装

- [x] 2.1 `src/components/editor/DrawingCanvas.tsx` において、描画移動中のタイマー破棄を徹底し、終点でペン先が完全に静止（手ブレ許容6px以内）した時間のみを 750ms 計測するロジックへ修正する
- [x] 2.2 `src/components/editor/DrawingCanvas.tsx` の `handleNativePointerMove` において、図形スナップ発生後にペン先を離さずにドラッグした際、`transformSnappedShape` を用いて図形をリアルタイムに変形しオーバーレイ再描画する処理を実装する
- [x] 2.3 `src/components/editor/DrawingCanvas.tsx` の `commitActiveStroke` において、ドラッグ変形後の最新座標が確定線として正常にコミットされることを確認・調整する

## 3. ビルドおよび品質検証

- [x] 3.1 `npm run build` を実行し、TypeScriptの型チェックおよびバンドルが正常に通ることを確認する
