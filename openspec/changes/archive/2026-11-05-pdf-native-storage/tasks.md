# Tasks

## 1. ハイブリッドPDF生成・パースエンジンの実装

- [x] 1.1 `src/lib/pdf/generator.ts` に白紙PDF生成および手書きストロークのベクター描画（`pdf-lib`）処理を実装する
- [x] 1.2 `src/lib/pdf/metadata.ts` にStarNote独自ストロークデータの添付ファイル埋め込みおよび抽出・復元ロジックを実装する

## 2. ストレージ層とPDFライフサイクルの統合

- [x] 2.1 `src/lib/db.ts` のノートスキーマを拡張し、PDFバイナリ（Uint8Array/Blob）の保持・読み出しに対応する
- [x] 2.2 `usePageDrawing.ts` にノート離脱時およびアイドルデバウンスでの非同期PDFコンパイル・保存処理を組み込む

## 3. UI連携（インポート・エクスポート・再編集）

- [x] 3.1 `src/components/home/HomeScreen.tsx` に「PDFをインポート」機能を追加し、外部PDFから手書き可能な新規ノートを作成できるようにする
- [x] 3.2 `src/components/editor/EditorScreen.tsx` に「PDFエクスポート（ダウンロード）」ボタンおよび保存インジケータを追加する

## 4. ビルド検証

- [x] 4.1 `npm run build` を実行し、TypeScriptの型チェックおよび本番バンドルが正常に通ることを確認する
