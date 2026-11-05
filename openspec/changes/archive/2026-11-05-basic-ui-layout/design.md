# Design

## Context

See `proposal.md` for motivation.
本変更では、ノートアプリとしての基本体験（一覧画面 ⇄ 編集画面の遷移、ツールバー配置、共通UIコンポーネント）を構築します。

## Goals / Non-Goals

**Goals:**
- `lucide-react` を用いた一貫性のあるアイコン表示
- 再利用可能な共通UIコンポーネント群（`Button`, `IconButton`, `Card`, `Modal`, `Input`）の整備
- ホーム画面（ノートカードグリッド、新規作成、削除）の実装
- 編集画面（戻るボタン、タイトルインライン編集、ツール切り替え、カラーパレット、縦スクロール紙面レイアウト）の実装
- 将来のダークモード導入を見据えたTailwindクラス設計（`dark:` 対応）

**Non-Goals:**
- 実際のリアルタイムインク描画アルゴリズムやジェスチャ判定（別変更で段階的に実装）
- 用紙テンプレート（横罫線・方眼など）の選択機能（後続でじっくり実装するため今回は白紙のみ）
- OneDrive同期機能（後回し）

## Decisions

### Decision 1: アイコンライブラリに `lucide-react` を採用
- **Rationale**: シンプルで統一感のあるSVGアイコンセットであり、ペン・マーカー・消しゴム・なげなわ・戻る矢印・プラスなどの手書きノートに必要なアイコンが揃っており、バンドルツリーシェイキングにも対応。
- **Alternatives considered**: Heroicons, React Icons（一貫性と種類のバランスからLucideを採用）。

### Decision 2: 共通UIコンポーネントのモジュール化
- **Rationale**: `src/components/ui/` にボタンやカード、モーダルを共通化し、ホーム画面と編集画面でスタイルやアクセシビリティ、将来のダークモード対応を一元管理する。
- **Alternatives considered**: インラインスタイル・Ad-hocなTailwind直書き（スタイルがバラつきやすいため共通化を選択）。

### Decision 3: 縦スクロール対応のレイアウト構造
- **Rationale**: ヘッダーツールバーを画面上部に固定（`sticky` / `fixed`）し、メイン領域（用紙コンテナ）を `overflow-y-auto` で縦方向にスクロール可能にする。用紙は中央揃え（`max-w-4xl` / アスペクト比考慮）で立体的なシャドウを持たせる。

## Risks / Trade-offs

- **[Risk] 縦スクロールと将来のペン描画操作の競合** → **Mitigation**: 編集画面の用紙内部では `touch-action: none` を維持しつつ、2本指スクロールや余白部でのスクロールが自然に行えるよう、DOMレイヤーを明確に分離する。
