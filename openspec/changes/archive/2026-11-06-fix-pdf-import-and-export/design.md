# Design: PDFインポート画面表示とエクスポート手書きベクター描画のアーキテクチャ

## 1. 全体アーキテクチャ概要

```
[ インポート時 ]
PDFファイル
  │
  ▼ (useNotes.importPdfNote)
IndexedDB (db.pdfDocuments: { noteId, data: Uint8Array })
  │
  ├─────────────────────────────────────────────────┐
  ▼ (エディタ画面表示)                               ▼ (PDFエクスポート)
PdfPageBackground (pdfjs-dist)                     exportHybridPdf (pdf-lib)
  - Worker によるバックグラウンドパース                 - 原本PDFバイナリをロード (または白紙生成)
  - HTML <canvas> に下敷きレンダリング                   - 手書きストロークを SVG パス変換
  - 手書きキャンバス DrawingCanvas の背面へ配置          - page.drawSvgPath(path, { x: 0, y: pageHeight })
                                                     - 再編集用メタデータ埋め込み
                                                     - ブラウザダウンロード
```

## 2. 詳細コンポーネント設計

### 2.1 `PdfPageBackground.tsx` (新規作成)
`src/components/editor/PdfPageBackground.tsx`:
- **役割**: IndexedDB から `noteId` に対応する PDF バイナリを取得し、指定された `pageNumber` のページを HTML `<canvas>` にレンダリングする。
- **pdfjs-dist 連携**:
  - `GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()`
  - PDF ドキュメントインスタンスをキャッシュ（同一ノート内で複数ページを描画する際に毎回バイナリをパースしないよう、シングルトン/キャッシュ化）。
  - `page.getViewport({ scale })` を使用し、親コンテナの幅（実効解像度 × デバイスピクセル比）にフィットしたスケールで `<canvas>` に `render()` を実行。
  - レンダリングタスクのキャンセル制御（ページ切り替えやズーム変更時の競合防止: `renderTask.cancel()`）。
  - アスペクト比コールバック（`onAspectRatioLoaded?: (ratio: number) => void`）を提供し、原本PDFの寸法に合わせて用紙の高さを最適化。

### 2.2 `EditorScreen.tsx` / `PageItem` の改修
- `PageItem` に `isPdf?: boolean` を追加。
- `isPdf` が true の場合:
  - `<PdfPageBackground noteId={noteId} pageNumber={pageNumber} />` を `<DrawingCanvas>` の背面（z-index: 0）に配置。
  - `<TemplateBackground>`（白紙/罫線）は非表示または最背面に抑制。
  - PDFページの縦横比に合わせてアスペクト比を自動調整（デフォルトは A4 `aspect-[210/297]`）。

### 2.3 `src/lib/pdf/generator.ts` の座標系・ベクター描画修正
`pdf-lib` の仕様:
`page.drawSvgPath(svgPath, options)` は内部で以下を実行する:
- `options.x ?? 0`
- `options.y ?? 0`
- `contentStream.push('1 0 0 -1 0 0 cm')` (Y軸下向き反転)
- 従って、`options.y` に `pageHeight` を与えると、PDFの左上原点から下方向に向かう SVG 座標系が確立される。

修正方針:
1. `strokeToPdfSvgPath`:
   - `toPdfCoord = (x, y) => `${(x * scaleX).toFixed(2)} ${(y * scaleY).toFixed(2)}``
   - `pageHeight - y * scaleY` の手動反転を**全廃**し、純粋な SVG 座標（左上原点、Y軸正方向下向き）を出力。
2. `renderStrokesToPdfPage`:
   - `page.drawSvgPath(svgPath, { x: 0, y: pageHeight, color, opacity })`
   - 単一タップ（ドット）:
     - `page.drawCircle` は PDF 座標系（左下原点）を使用するため、`x: p.x * scaleX, y: pageHeight - p.y * scaleY` を維持。
3. `canvasWidth` / `canvasHeight` の整合:
   - `BASE_PAGE_WIDTH = 840` を使用。
   - `scaleX = pageWidth / canvasWidth`
   - `scaleY = pageHeight / canvasHeight`
   - これにより、キャンバス上の描画位置と PDF ベクター出力が 100% 正確に一致する。

### 2.4 `src/hooks/usePdfSync.ts` の連携修正
- `exportAndDownloadPdf` および `compileAndSavePdf` において、`canvasWidth: BASE_PAGE_WIDTH` (840) と用紙アスペクト比に基づく `canvasHeight` を確実に渡す。
- ノートが PDF ノート（`note.isPdf`）の場合、原本PDFのページ寸法を読み取って `canvasHeight` を設定。
