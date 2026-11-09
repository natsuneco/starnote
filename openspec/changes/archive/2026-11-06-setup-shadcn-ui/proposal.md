# Proposal

## Why

StarNote は iPad Safari や PWA 環境でネイティブアプリ並みの手書きノート体験を目指していますが、現状の UI は最低限の自作コンポーネントで構築されており、SwiftUI や iPadOS 純正アプリのような統一感・洗練された操作感・アクセシビリティが不足しています。
現在エコシステム標準となっている shadcn/ui（Radix UI + Tailwind CSS v4）を導入することで、高品質なデザインシステム基盤を確立し、すりガラス効果（グラスモーフィズム）やリッチなツールバー・ポップオーバー・シートなどのモダンな UI を一貫したデザイン言語で素早く開発できるようにします。
また、今後の開発において AI エージェントや開発者が車輪の再発明（安易な自作UI作成）を行わないよう、プロジェクト規約（`AGENTS.md` および `openspec/config.yaml`）に shadcn/ui の利用を義務付ける開発ルールを明記します。

## What Changes

- **Vite & TypeScript 設定の拡張**: `@/*` パスエイリアスを `vite.config.ts` および `tsconfig.app.json` に設定。
- **shadcn/ui の初期化と Tailwind v4 テーマ設定**: Tailwind CSS v4 に最適化された CSS 変数ベースのカラー・デザイントークン設定、`components.json` の導入。
- **共通 UI コンポーネントの整備**:
  - 基本コンポーネント: `button`, `dialog`, `popover`, `slider`, `sheet`, `tooltip`, `card`, `input` 等の追加。
  - スタイル調整: iPadOS の質感に合わせた半透明・すりガラス（`backdrop-blur`）や角丸・タッチフィードバックのチューニング。
- **開発ガイドライン & OpenSpec コンテキストの更新**:
  - `AGENTS.md`: UI コンポーネントの安易な自作を禁止し、導入済みの `shadcn/ui` を使用・拡張することを義務付ける開発原則を追加。
  - `openspec/config.yaml`: プロジェクトコンテキストおよび技術スタックに `shadcn/ui` を追加し、以後の仕様策定・実装で遵守させる。
- **既存 UI からの段階的移行**: 既存の自作 UI (`src/components/ui/`) を shadcn/ui ベースに安全に置き換え・統合。

## Capabilities

### New Capabilities
- `ui-components`: Radix UI と Tailwind CSS v4 を基盤とした、アクセシブルで iPadOS ライクな質感（すりガラス・タッチフィードバック）を持つ共通 UI コンポーネント基盤。

### Modified Capabilities
- `notebook-ui`: ホーム画面のモーダルやノート編集画面のツールバー、カラー・太さセレクター等の UI コンポーネントを新コンポーネント基盤に適合させ、操作感と視覚的統一性を向上させる。

## Impact

- **依存パッケージ**: `clsx`, `tailwind-merge`, `class-variance-authority`, `@radix-ui/*` などの shadcn/ui 基盤ライブラリが追加されます。
- **設定 & ドキュメントファイル**: `vite.config.ts`, `tsconfig.app.json`, `src/index.css`, `AGENTS.md`, `openspec/config.yaml` に変更が加わります。
- **コンポーネント**: `src/components/ui/` 配下に shadcn/ui コンポーネントが配置され、`AppShell.tsx`, `HomeScreen.tsx`, `EditorScreen.tsx` の UI 実装が順次リファクタリングされます。
