# Proposal

## Why

GoodNotesやCollanoteのような手書きノートWebアプリ（iPad Safari / PWA向け）を開発するため、高速な開発環境と実行性能を両立する初期技術スタック（Vite + React + TypeScript + Tailwind CSS + PWA）を導入し、開発の土台となるプロジェクト基盤を構築します。

## What Changes

- Vite (React + TypeScript) によるプロジェクト構造の初期化
- Tailwind CSS の導入と基本スタイルの設定
- `vite-plugin-pwa` による PWA 設定（Web App Manifest、アイコン、オフラインキャッシュ定義）
- コア依存ライブラリのインストール（`perfect-freehand`, `dexie`, `pdfjs-dist`, `pdf-lib` 等）
- アプリケーションシェル（画面全体のキャンバス描画領域とツールバーの基本レイアウト）の構築

## Capabilities

### New Capabilities
- `app-shell`: PWA対応のフルスクリーンUIシェル、レスポンシブなツールバー/キャンバス配置、および基本依存関係を提供する基盤。

### Modified Capabilities
<!-- なし -->

## Impact

- プロジェクトルートに `package.json`, `vite.config.ts`, `tsconfig.json` などの設定ファイルを新設
- `src/` 配下にエントリーポイントと基本コンポーネント構造を作成
- iPad Safari からホーム画面追加（PWA）によるスタンドアロン起動が可能になる
