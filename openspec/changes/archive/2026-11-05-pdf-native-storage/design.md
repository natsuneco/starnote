# Design

## Context

See `proposal.md` for motivation.
現在、StarNoteのストロークはDexie.js（IndexedDB）の `pageStrokes` テーブルにJSONとして保持されています。ノートの標準保存形式を「PDF」に移行し、Drawboard PDFライクに「どこでも見られるベクターPDF ＋ StarNoteで再編集できるメタデータ埋め込み」を実現します。

## Goals / Non-Goals

**Goals:**
- `pdf-lib` を用いたハイブリッドPDF生成（白紙ノート生成、既存PDF下敷き合成、手書きベクター描画）
- PDF標準の添付ファイル仕様（EmbeddedFiles）を用いたStarNoteストローク編集データの可逆的埋め込み・抽出
- StarNoteでのPDF再読込時における、ストロークID・筆圧・パラメータの完全復元
- 描画レスポンスを1ミリ秒も落とさない2層ストレージ戦略（IndexedDB即時キャッシュ ＋ アイドル時非同期PDFコンパイル）
- ホーム画面での「PDFをインポート」機能とエディタでの「PDFをダウンロード」エクスポート機能

**Non-Goals:**
- インポート元PDFの既存テキストや画像の直接編集（下敷きとして忠実に保持）
- 外部ツール（Acrobat等）で追加された他形式の複雑な注釈の完全インポート（当面はStarNoteが埋め込んだ手書きデータの完全復元に集中）

## Decisions

### Decision 1: PDF内メタデータの埋め込み手法（EmbeddedFiles）
- **Rationale**:
  - PDFの国際標準（ISO 32000）で定義されている添付ファイル機能 `pdfDoc.attach()` を利用。
  - 各ページの全ストロークデータをシリアライズした `starnote-strokes.json` をPDF内に添付。
  - **メリット**: 標準のPDFビューワ（Adobe Acrobat、Chrome、iOSファイルアプリ、OneDrive等）の表示を一切乱さず、安全かつ大容量の編集データを可逆的に内包できます。

### Decision 2: 手書きストロークのベクター描画（pdf-lib）
- **Rationale**:
  - `perfect-freehand` が生成する滑らかな輪郭ポリゴンをSVGパス文字列（`M x y L x y ... Z`）に変換。
  - `pdf-lib` の `page.drawSvgPath()` を用いて、各ページのコンテンツストリームに直接ベクター描画。
  - 通常ペンは不透明ベクター、蛍光ペンは半透明（乗算合成）として焼き込み、印刷や拡大表示時にも一切ジャギのない高品質なPDFを出力します。

### Decision 3: 2層ストレージ戦略による描画パフォーマンス保証
- **Rationale**:
  - 1ストロークごとに毎回PDF全体を再コンパイルするとCPU負荷が極めて高くなり、描画フレームレートが低下します。
  - そのため、**描画中は既存の IndexedDB（`pageStrokes`）へミリ秒単位で非同期保存**（差分キャッシュ）。
  - ノートを閉じてホーム画面に戻るタイミング、または描画が一段落したアイドル時（3秒デバウンス）に、バックグラウンド非同期処理で最終的なPDFバイナリ（Uint8Array）をコンパイルし、Dexieの `notes` テーブル（または `pdfDocuments` テーブル）に永続化します。

## Risks / Trade-offs

- **[Risk] ページ数の多い巨大PDFにおけるコンパイル負荷** → **Mitigation**: 変更があったページのみを再描画する差分更新アルゴリズムを採用し、PDF生成処理中はエディタ右上に控えめな「保存中...」インジケータを表示してUIをブロックしません。
- **[Risk] PDFバイナリ保存によるIndexedDB容量の増加** → **Mitigation**: Dexie.jsは数百MB以上のBlob/バイナリを問題なく扱えますが、不要な重複キャッシュをクリーンアップし、ストレージ容量を最適化します。
