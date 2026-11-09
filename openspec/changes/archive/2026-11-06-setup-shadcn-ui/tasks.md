# Tasks

## 1. 基盤設定 & shadcn/ui 初期化

- [x] 1.1 `tsconfig.app.json` および `vite.config.ts` に `@/*` パスエイリアスを設定し、`npm run build` による型チェックがパスすることを検証する
- [x] 1.2 `npx shadcn@latest init` を実行して `components.json` を生成し、Tailwind CSS v4 向けの CSS 変数トークンが `src/index.css` に正しく定義されていることを検証する

## 2. 共通 UI コンポーネントの追加 & iPadOS スタイル拡張

- [x] 2.1 コアコンポーネント（`button`, `dialog`, `popover`, `slider`, `sheet`, `tooltip`, `card`, `input`）を shadcn CLI で追加し、`src/components/ui/` 配下に生成されたことを検証する
- [x] 2.2 iPadOS ライクなすりガラス質感（`backdrop-blur`）およびタップ時のスケールアニメーション（`active:scale-95` 等）を共通コンポーネントに適用し、外観を検証する
- [x] 2.3 UI コンポーネント上でスタイラスや指の操作を行った際に、背後の手書きキャンバスへ不要な描画イベントが漏れないようポインター伝播分離（`stopPropagation`）を検証する

## 3. 開発ガイドライン & OpenSpec コンテキストの更新

- [x] 3.1 `AGENTS.md` に「UI コンポーネントの自作禁止と shadcn/ui の徹底活用」の開発原則を追加し、車輪の再発明を防止するルールが明記されたことを検証する
- [x] 3.2 `openspec/config.yaml` のコンテキスト記述に技術スタックとして `shadcn/ui` を追加し、以降の変更提案や仕様策定で参照されることを検証する

## 4. 既存画面の UI リファクタリング & 統合検証

- [x] 4.1 `HomeScreen` の新規ノート作成モーダルを shadcn `Dialog` / `Input` / `Button` に置き換え、ノート作成と削除動線が正常に動作することを検証する
- [x] 4.2 `EditorScreen` の上部ツールバーおよびカラー・ストローク太さ選択を新コンポーネントでリファクタリングし、描画ツール切り替えがスムーズに機能することを検証する
- [x] 4.3 プロジェクト全体のビルド（`npm run build`）およびリンター（`npm run lint`）を実行し、エラーなく完了することを検証する

## Workflow follow-up

- アーカイブ前に実機またはシミュレータ環境で手書き描画と UI のレスポンスを総合確認する。
- 実装完了後に `openspec archive` を実行して変更を確定する。
