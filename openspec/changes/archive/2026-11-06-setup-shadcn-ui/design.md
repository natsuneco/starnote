# Design

## Context

StarNote は React 19、Tailwind CSS v4 (`@tailwindcss/vite`)、Vite 8、Lucide React を採用した iPad 向け手書きノート PWA です（背景と動機は `proposal.md` を参照）。
現在 `src/components/ui/` には自作の `Button.tsx`, `Modal.tsx`, `IconButton.tsx`, `Input.tsx`, `Card.tsx` が存在しますが、Radix UI ベースの堅牢なアクセシビリティや、一貫したデザインシステム・iPadOS らしいマイクロインタラクションが不足しています。
また、AI コーディングエージェントが新しい画面や機能を実装する際、無秩序に独自コンポーネントを新規作成してしまうのを防止するため、プロジェクトガイドラインへの明文化が必要です。

## Goals / Non-Goals

**Goals:**
- `@/*` パスエイリアスを整備し、標準的な shadcn/ui 構成を確立する。
- Tailwind CSS v4 の CSS 変数ベースのテーマ機能（`@theme`）と調和する形で shadcn/ui を初期化・構成する。
- ボタン、ダイアログ、ポップオーバー、スライダー、シート（ハーフモーダル）、ツールチップ等の基本コンポーネントを導入する。
- iPadOS ライクなすりガラス効果（`backdrop-blur`）、微細な境界線、タップ時のスケールアニメーションを共通スタイルとして適用する。
- 手書きキャンバス（`DrawingCanvas`）のタッチ・ペン描画操作と、UI コンポーネント（特に Popover や Sheet）のポインターイベントが競合しないアーキテクチャを確立する。
- `AGENTS.md` および `openspec/config.yaml` に UI 自作禁止・shadcn/ui 優先原則を策定し、今後の開発での一貫性を恒久化する。

**Non-Goals:**
- 描画エンジン（`perfect-freehand`）やジェスチャー判定アルゴリズムの変更。
- IndexedDB（Dexie.js）のデータストア構造や PDF 処理ロジックの変更。
- 一度の変更ですべてのマイナー画面を一新すること（まずは基盤導入と主要画面 `HomeScreen`, `EditorScreen` の主要 UI を刷新）。

## Decisions

### 1. パスエイリアスとプロジェクト設定
- **決定**: `vite.config.ts` に `resolve.alias`（`@` -> `./src`）を追加し、`tsconfig.app.json` に `"baseUrl": "."` と `"paths": { "@/*": ["./src/*"] }` を設定する。
- **理由**: shadcn/ui の標準的なインポートパスに準拠し、コンポーネント間の相対パス解決の複雑化を防ぐ。
- **代替案**: パスエイリアスを使わず相対パスのみとする案 → shadcn CLI の自動生成や外部コンポーネントの追加時に毎回手動パス修正が必要になり、保守性が悪化するため不採用。

### 2. Tailwind v4 との連携構成
- **決定**: `components.json` の設定において Tailwind v4 互換構成（`tailwind.config.js` を生成せず、`src/index.css` に直接 CSS デザイントークンを追記する方式）を採用する。
- **理由**: StarNote は既に `@tailwindcss/vite` (v4) を利用しており、従来の v3 構成へ後退させることなくビルドの高速性とクリーンな CSS 構造を維持するため。

### 3. 既存 UI との段階的移行方針
- **決定**: shadcn/ui のコンポーネントは小文字ファイル名（例: `src/components/ui/button.tsx`, `dialog.tsx`）で配置されるため、既存の自作コンポーネント（`Button.tsx`, `Modal.tsx` 等）と一時的に共存させながら、画面単位で安全に置き換えを行う。
- **理由**: 一括置換によるリグレッション（特にスタイラス操作時のフォーカスズレやイベント漏れ）を最小限に抑えるため。

### 4. Apple Pencil / タッチ描画とのイベント分離
- **決定**: ツールバー、ポップオーバー、スライダーなどの UI ルート要素に対して `onPointerDown={(e) => e.stopPropagation()}` を徹底し、キャンバスの `PointerEvent` リスナーにイベントがフォールスルーしないようにする。
- **理由**: スタイラスペンや指で太さスライダーやカラーピレットを操作した際に、背後のノート用紙に不要なインク点が付着するのを確実に防止するため。

### 5. 開発ガイドライン（AGENTS.md / config.yaml）の明文化
- **決定**:
  - `AGENTS.md` の「開発・実装原則」に「UI コンポーネントの自作禁止と shadcn/ui の徹底活用」という項目を追加する。
  - `openspec/config.yaml` のコンテキスト記述に技術スタックとして `shadcn/ui` を明記し、UI 実装の原則を付与する。
- **理由**: AI エージェントや開発者が新しいダイアログやボタンが必要になった際に、勝手に独自コンポーネントを作り散らかすのを防ぎ、プロジェクト全体のデザイン言語を恒久的に統一するため。

## Risks / Trade-offs

- **[Radix UI のフォーカストラップとスクロール制御]** → Dialog や Sheet などのモーダル表示時に、Radix UI が自動で付与するスクロールロック（`body` スタイル変更）が PWA のフルスクリーン配置と干渉するリスクがある。
  - *対策*: StarNote は元々 `html, body { overflow: hidden; }` となっているため、モーダル表示時のキャンバスのレイアウト崩れがないかを実機・シミュレータで確認し、必要に応じて Radix UI の `modal={false}` オプションや Portal ターゲットを最適化する。
- **[React 19 と Radix UI の peerDependencies 警告]** → 一部の古い Radix パッケージで React 19 に対する warning が出る可能性がある。
  - *対策*: shadcn/ui の最新リリース（`npx shadcn@latest`）を使用し、React 19 を正式サポートするバージョンで導入する。

## Migration Plan

1. **基盤設定**: `tsconfig.app.json` と `vite.config.ts` にパスエイリアスを追加。
2. **shadcn 初期化**: `npx shadcn@latest init` を実行し、`components.json` および CSS 変数をセットアップ。
3. **コアコンポーネント追加**: `button`, `dialog`, `popover`, `slider`, `sheet`, `tooltip`, `card`, `input` を追加。
4. **iPadOS スタイル拡張**: すりガラス（`backdrop-blur`）およびタッチフィードバック用のユーティリティ・バリアントを整備。
5. **ガイドライン更新**: `AGENTS.md` および `openspec/config.yaml` に UI コンポーネント開発規約を反映。
6. **UI 置き換え**:
   - `HomeScreen`: ノート新規作成モーダルを `Dialog` / `Input` / `Button` に置き換え。
   - `EditorScreen`: 上部ツールバーとペン設定UIを新コンポーネントでリファクタリング。
