# Tasks

## 1. データモデルおよびテンプレート定義の実装

- [x] 1.1 `src/types/note.ts` に `PageSize` ('A4' | 'B5') および `PageTemplate` ('blank' | 'ruled-b' | 'ruled-a' | 'grid-5mm') の型定義を追加する
- [x] 1.2 `src/lib/template/templateConstants.ts` にB罫40行、A罫35行、5mm方眼の寸法・ピッチ・マージン定義を実装する

## 2. エディタ画面でのテンプレート背景レンダリング

- [x] 2.1 `src/components/editor/TemplateBackground.tsx` に軽量SVGによる罫線・方眼背景コンポーネントを実装する
- [x] 2.2 `EditorScreen.tsx` の `PageItem` に `TemplateBackground` を組み込み、紙面背景として描画されることを確認する

## 3. PDFエクスポート時のベクター罫線合成

- [x] 3.1 `src/lib/pdf/generator.ts` を拡張し、ハイブリッドPDF生成時にテンプレートに応じたベクター罫線・方眼を背景描画する処理を実装する

## 4. 新規ノート作成UIの機能拡張とビルド検証

- [x] 4.1 `src/components/home/HomeScreen.tsx` の作成モーダルに用紙サイズ（A4/B5）およびテンプレート選択ピッカーを追加する
- [x] 4.2 `npm run build` を実行し、TypeScriptの型チェックおよび本番バンドルが正常に通ることを確認する
