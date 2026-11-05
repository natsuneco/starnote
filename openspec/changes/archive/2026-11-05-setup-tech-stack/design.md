# Design

## Context

See `proposal.md` for motivation.
本プロジェクトはゼロベースからの立ち上げであり、iPad Safari（PWA）上で動作する手書きノートアプリの基礎となる開発環境と実行基盤を構築します。

## Goals / Non-Goals

**Goals:**
- Vite + React + TypeScript による高速で型安全なフロントエンド基盤の構築
- Tailwind CSS によるツールバーおよびUIスタイリング基盤の整備
- `vite-plugin-pwa` を用いた Web App Manifest およびオフライン基盤の設定
- 将来の機能実装に必要なコアライブラリ（`perfect-freehand`, `dexie`, `pdfjs-dist`, `pdf-lib`）の依存関係導入
- 全画面キャンバスビューポートとツールバーを備えた初期 AppShell コンポーネントの作成

**Non-Goals:**
- 本変更では、高度なインク描画アルゴリズム、ジェスチャ認識（Scribble消去・なげなわ選択）、OneDrive同期、PDF解析・合成処理の実装自体は含みません（後続の変更で段階的に実装）。

## Decisions

### Decision 1: Vite + React + TypeScript の採用
- **Rationale**: 開発時のHMRが高速で、iPad実機でのテストサイクルを短縮できる。PDF.js、Dexie.js、MSALなどの豊富なライブラリとTypeScriptの親和性が高く、保守性が高い。
- **Alternatives considered**: 
  - Svelte: ランタイムが軽量だが、PDFやMSAL周りのエコシステム・知見の多さを考慮しReactを採用。
  - Vanilla JS: 小規模なら良いが、将来的なノート一覧・ツール設定・ダイアログ管理が肥大化した際に破綻しやすいため見送り。

### Decision 2: Tailwind CSS によるスタイリング
- **Rationale**: ツールバーやカラーパレット、モーダルなどのUIコンポーネントを高速に構築でき、本番ビルドで未使用CSSが自動パージされる。
- **Alternatives considered**: CSS Modules, Styled Components（ランタイム負荷を避けるためZero-runtimeのTailwindを選択）。

### Decision 3: PWA (vite-plugin-pwa) の導入
- **Rationale**: iPadのSafariで「ホーム画面に追加」することで、ブラウザのURLバーやツールバーを排除したフルスクリーン（`display: standalone`）で起動可能にする。

## Risks / Trade-offs

- **[Risk] iPadOSのシステムジェスチャとの競合** → **Mitigation**: 描画エリアに `touch-action: none;` および `overscroll-behavior: none;` を適用し、画面端付近に操作安全マージンを確保する。
- **[Risk] pdfjs-dist の Web Worker バンドル問題** → **Mitigation**: Vite環境下でのworker読み込みパス設定を初期セットアップ時に確認・検証しておく。
