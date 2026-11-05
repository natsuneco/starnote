# Tasks

## 1. 親scale撤廃と用紙実寸スケーリングの実装

- [x] 1.1 `src/lib/template/templateConstants.ts` に用紙基準幅 `BASE_PAGE_WIDTH = 840` を定義する
- [x] 1.2 `src/components/editor/EditorScreen.tsx` において、親要素の `transform: scale()` を全廃し、`translate3d` のみによるパン移動と用紙コンテナ幅の実寸スケーリング（`BASE_PAGE_WIDTH * zoomScale`）を実装する
- [x] 1.3 `src/components/editor/EditorScreen.tsx` の `handlePinchZoom` において、水平中央揃えレイアウトに対応した正確な Focal Point（ピンチ中心点不変モデル）計算を実装する

## 2. キャンバス描画コンテキストおよび座標系・UIの整合

- [x] 2.1 `src/components/editor/DrawingCanvas.tsx` において、実寸拡大された用紙サイズから安全な解像度（最大4096pxガード）を算出し、基準座標系（0〜840px）から用紙サイズへのマトリックス変換（`ctx.setTransform`）を適用する
- [x] 2.2 `src/components/editor/DrawingCanvas.tsx` の `getCanvasPointFromCoords` において、入力座標を基準座標系（0〜840px）に正規化し、等倍・拡大・PDF出力間での座標完全互換性を確保する
- [x] 2.3 `src/components/editor/DrawingCanvas.tsx` のなげなわ選択枠およびアクションメニュー（削除・解除）が、用紙の表示スケール（`displayScale`）に応じて正確にオブジェクト真上に追従表示されるよう調整する

## 3. ビルドおよび品質検証

- [x] 3.1 `npm run build` を実行し、TypeScriptの型チェックおよびバンドルが正常に通ることを確認する
