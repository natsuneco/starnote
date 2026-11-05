# Design

## Context

See `proposal.md` for motivation.
StarNote の手書きキャンバス（`DrawingCanvas.tsx`）は現在、Safari等のダブルタップ拡大やスクロールを抑制するため、コンテナのタッチイベント（`touchstart`, `touchmove`, `touchend`）ですべて `e.preventDefault()` を実行しています。そのため、紙面上で指を動かしてもスクロールできず、指でもペンでも同様にインクが描画される状態となっています。

## Goals / Non-Goals

**Goals:**
- `DrawingCanvas` に `allowFingerDrawing: boolean` プロパティを追加し、指（`touch`）による入力を「手書きストローク描画」にするか「紙面スクロール・パン」にするかを制御可能にする。
- 指描画OFF時は、指によるタッチイベントの `preventDefault()` を解除し、親コンテナ（`main`）の `touch-action: pan-y` を通じた滑らかなネイティブスクロールを可能にする。
- 指描画OFF時でも、Apple Pencil（`pointerType === 'pen'`）による筆記は一切影響を受けず、筆圧・傾き・先行予測を含む最高品質の低遅延描画が動作する。
- エディタのツールバーに指描画/パン切り替えのトグルボタンを配置し、設定値を `localStorage` で永続化する。

**Non-Goals:**
- ピンチイン・ピンチアウトによる紙面の自由ズーム（別チェンジでキャンバス全体のズーム・パンエンジンとして扱う）。

## Decisions

### Decision 1: ポインター種別（`pointerType`）に基づくイベントフィルタリング
- **Rationale**:
  - `PointerEvent.pointerType` により、OS・ブラウザレベルでスタイラス（`pen`）と指（`touch`）を正確に判別可能です。
  - `allowFingerDrawing === false` の場合:
    1. `touchstart` / `touchmove` リスナーで `e.preventDefault()` を呼ばず、ブラウザのスクロールジェスチャを有効化。
    2. `handleNativePointerDown` において、`e.pointerType === 'touch'` のときは描画処理を開始せず早期 return（`setPointerCapture` も呼ばない）。
    3. `e.pointerType === 'pen'` のときは通常通り `e.preventDefault()` を実行して描画セッションを開始。
  - `allowFingerDrawing === true` の場合:
    1. 従来通り `touchstart` / `touchmove` で `e.preventDefault()` を呼び、指でのタッチもペンと同等に描画。

### Decision 2: ツールバーUIの配置とローカルストレージ永続化
- **Rationale**:
  - `EditorScreen.tsx` のツールバー（ペン・消しゴム・投げ縄などのツール類とUndo/Redoの間、またはツールエリア右端）に、指描画トグルボタン（Lucideの `Hand` アイコン等）を配置。
  - 「指で描画: ON」（青バッジ/ハイライト）と「指でスクロール: ON / ペン専用」（ノーマル）を明瞭に表示。
  - キー `starnote:allowFingerDrawing` として `localStorage` に保存。初期値は、Apple Pencilでの手書きノート体験を最大化するため `false`（ペン専用・指スクロールモード）を推奨デフォルトとするか、既存挙動を維持しつつユーザーが切り替えた値を記憶。

## Risks / Trade-offs

- **[Risk] 指スクロール中にApple Pencilを置いた場合の挙動**:
  - 指でスクロール中にペン先が接触した場合、スクロールとペン描画が競合する可能性がある。
  - **Mitigation**: `pointerdown`（`e.pointerType === 'pen'`）の瞬間に `e.cancelable` であれば `e.preventDefault()` を適用し、ペンの描画セッションを優先して開始する。
