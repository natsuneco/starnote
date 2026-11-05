# Proposal: PDFインポート画面表示およびPDFエクスポート手書きベクター描画の修正 (Fix PDF Import Display & Export Stroke Rendering)

## 1. 課題と背景
StarNote は、GoodNotes / Collanote ライクな手書きノートアプリとして、PDF ファイルを下敷きとした閲覧・手書き注釈機能、および手書き内容をベクター合成して外部ビューワでも閲覧可能なハイブリッドPDFエクスポート機能を提供することを要件としています。

しかし現在、以下の2件の重大な不具合（Issue #1 および Issue #2）が発生しています。

### Issue #1: PDFを読み込んでも描画画面に表示されない
- **現状**: ホーム画面から PDF ファイルをインポートすると、IndexedDB（`db.pdfDocuments`）には正常にバイナリが保存され、ノートのメタデータも作成される。しかし、エディタ画面の `PageItem`（紙面コンポーネント）内に PDF ページを描画・表示するビューワコンポーネントが存在せず、白紙テンプレートまたは罫線のみが表示され、下敷きとなる PDF ページが一切レンダリングされない。
- **影響**: インポートしたスライドや書類、問題集のページが見えないため、PDF に対する手書き注釈機能が利用できない。

### Issue #2: PDFをエクスポートしても描画内容が反映されていない（罫線などは反映される）
- **現状**: ツールバーの「PDF出力」を実行すると、罫線や方眼などのテンプレート背景は反映された PDF がダウンロードされるが、キャンバス上で描いた手書きストロークが全く反映されない。
- **根本原因**:
  1. **座標系の Y 軸二重反転**: `pdf-lib` の `page.drawSvgPath` は、内部で `[1, 0, 0, -1, 0, y] cm` の座標変換変換行列を適用し、SVG の左上原点から下方向への Y 軸を自動反転する。しかし、`generator.ts` 内の `strokeToPdfSvgPath` で独自に `pageHeight - y * scaleY` の Y 軸反転を行っていた上、`drawSvgPath` の基準位置 `y` に `pageHeight` ではなくデフォルトの `0` が渡されていたため、すべてのストロークが用紙の外側（負の Y 座標: 用紙の下端よりさらに 800pt 以上下）に描画されていた。
  2. **キャンバス基準寸法の不整合**: `usePdfSync.ts` で `exportHybridPdf` を呼び出す際、`canvasWidth` / `canvasHeight` が指定されず、古いデフォルト値（794x1123）が使われており、StarNote の基準描画座標系（840 x 用紙アスペクト比）とずれていた。
  3. **インポート済みPDFに対するストローク合成**: インポートしたPDFが存在する場合に、その原本PDF（Base PDF）を下敷きとして手書きベクターストロークを各ページに正確なアスペクト比で重ね合わせて合成出力する処理が不完全であった。

## 2. 解決アプローチ

### 1. Issue #1 の解決: `PdfPageBackground` コンポーネントの実装と組み込み
- `pdfjs-dist` を用いて、`db.pdfDocuments` から読み出した PDF バイナリの指定ページ（`pageNumber`）を HTML `<canvas>` に高解像度レンダリングする専用コンポーネント `PdfPageBackground` を新規作成する。
- Vite の Worker 設定（`pdfjs-dist/build/pdf.worker.min.mjs?url`）を導入し、メインスレッドをブロックせずに高速かつ安定して PDF ページを描画する。
- `EditorScreen.tsx` の `PageItem` において、`note.isPdf` が有効な場合は `<TemplateBackground>` の代わりに（または最背面に）`<PdfPageBackground>` を配置し、手書きキャンバス `<DrawingCanvas>` の下敷きとして正確に表示する。
- 拡大ズーム時も鮮明さを維持できるよう、DPR や表示サイズに合わせた適切なスケールで PDF Canvas をレンダリングする。
- インポートしたPDFの各ページの縦横比（Viewport aspect ratio）を取得・反映し、紙面コンテナのアスペクト比をPDFページの実寸に一致させる。

### 2. Issue #2 の解決: `pdf-lib` ベクターストローク描画と座標系の修正
- `src/lib/pdf/generator.ts` の `strokeToPdfSvgPath` および `renderStrokesToPdfPage` を抜本的に見直し、`pdf-lib` の `drawSvgPath` の仕様に完全に合致させる。
  - `page.drawSvgPath(svgPath, { x: 0, y: pageHeight, color, opacity })` を指定し、SVG 座標系（左上原点、Y軸下向き）をそのまま使用（`px = x * scaleX`, `py = y * scaleY`）。
  - 単一ドット（1点タップ）は `page.drawCircle`（左下原点）で `x = p.x * scaleX`, `y = pageHeight - p.y * scaleY` として正確に描画。
  - `usePdfSync.ts` で `exportHybridPdf` に `canvasWidth: BASE_PAGE_WIDTH`（840）および適切な `canvasHeight` を渡す。
  - インポートPDFの出力時、`page.getWidth()` と `page.getHeight()` から正確なスケール比率を算出し、手書きストロークが下敷きPDFと寸分違わず重なってベクター出力されるようにする。

## 3. 期待される効果
- インポートした PDF がエディタの全ページでクッキリと下敷き表示され、閲覧しながら手書きできる（Issue #1 解決、Closes #1）。
- PDF エクスポートを実行した際、Adobe Acrobat、Chrome、iPad ファイルアプリ等の標準ビューワで、テンプレートや元の PDF の上に手書きストロークが鮮明なベクターとして閲覧・印刷できる（Issue #2 解決、Closes #2）。
- StarNote の再編集用メタデータも維持され、エクスポートしたハイブリッドPDFを再度 StarNote に読み込んでもストロークの再編集が可能。
