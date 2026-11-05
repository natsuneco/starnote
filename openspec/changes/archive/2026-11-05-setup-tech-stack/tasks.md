# Tasks

## 1. プロジェクト基盤のセットアップ

- [x] 1.1 Vite + React + TypeScript でプロジェクトを初期化し、`package.json` と `tsconfig.json` が生成されて起動できることを確認する
- [x] 1.2 Tailwind CSS を導入・設定し、`src/index.css` にディレクティブを追加して基本スタイルが正常に反映されることを確認する
- [x] 1.3 `vite-plugin-pwa` を導入し、`vite.config.ts` に Web App Manifest（スタンドアロン起動、メタデータ）とオフラインService Worker設定を追加する

## 2. コア依存ライブラリの追加

- [x] 2.1 手書き描画用 `perfect-freehand` およびローカルDB用 `dexie` をインストールし、型定義含め正常に解決されることを確認する
- [x] 2.2 PDF処理用 `pdfjs-dist` および `pdf-lib` をインストールし、パッケージ依存関係が正常にインストールされることを確認する

## 3. アプリケーションシェルとレイアウトの構築

- [x] 3.1 iPad Safariでの画面バウンスや誤スクロールを抑止するグローバルCSS（`touch-action: none;` / `overscroll-behavior: none;`）を設定する
- [x] 3.2 全画面の描画キャンバス領域とヘッダー/ツールバー枠組みを持つ AppShell コンポーネントを実装し、ブラウザ表示を確認する
- [x] 3.3 `npm run build` を実行し、TypeScriptの型チェックおよびPWAアセットを含む本番ビルドが正常に完了することを確認する
