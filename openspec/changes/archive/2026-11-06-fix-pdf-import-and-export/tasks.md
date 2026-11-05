# Tasks: PDFインポート画面表示とエクスポート手書きベクター描画の修正

## 1. PDFエクスポート座標系およびベクターストローク描画の修正 (Issue #2)
- [x] 1.1 `src/lib/pdf/generator.ts` の `strokeToPdfSvgPath` を修正し、SVGの正規左上原点座標系（Y軸下向き正）を出力するよう変更
- [x] 1.2 `src/lib/pdf/generator.ts` の `renderStrokesToPdfPage` で `page.drawSvgPath` に `{ x: 0, y: pageHeight, color, opacity }` を適用
- [x] 1.3 `src/hooks/usePdfSync.ts` で `exportHybridPdf` 呼び出し時に `BASE_PAGE_WIDTH` (840) と `canvasHeight` を渡すよう改修
- [x] 1.4 PDFエクスポートのテストスクリプトでストロークが正の可視領域内（PDF MediaBox内）に描画されていることを検証

## 2. PDFインポート下敷き表示コンポーネントの実装 (Issue #1)
- [x] 2.1 `src/components/editor/PdfPageBackground.tsx` を作成し、`pdfjs-dist` を用いた PDF ページの `<canvas>` レンダリングを実装
- [x] 2.2 `pdfjs-dist` の Worker 設定を整備（Vite ビルド対応）
- [x] 2.3 `src/components/editor/EditorScreen.tsx` の `PageItem` に `isPdf` プロパティを接続し、PDFノート時に `<PdfPageBackground>` を描画
- [x] 2.4 PDFのページ縦横比に合わせて紙面の aspect ratio を動的または適切に適合

## 3. 全体検証 & 品質確認
- [x] 3.1 `npm run build` (`tsc -b && vite build`) の通過確認
- [x] 3.2 ユニット/インテグレーションテストによる検証
- [x] 3.3 GitHub Issue #1 および #2 の要件充足を確認
