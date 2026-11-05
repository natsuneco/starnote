# Design

## Context

See `proposal.md` for motivation. 現状の入力処理（`DrawingCanvas.tsx`）と状態管理（`usePageDrawing.ts`）には以下の問題があります。

- **iOS Safari のダブルタップ判定**: タッチ終了後 約300〜500ms 以内に次のタッチが始まると、Safari がダブルタップ（ズーム等）として扱い、2本目のポインタイベントを遅延・キャンセルすることがある。症状（「間隔を空ければ描ける」）と一致する。React の合成イベントは passive に登録されるため、`onPointerDown` 内の `preventDefault()` ではこのジェスチャを止められない。
- **pointercancel の扱い**: `onPointerCancel` を `handlePointerUp` と同一処理にしているが、キャンセル時に `preventDefault` やキャプチャ解放が失敗するケースを考慮していない。
- **ポインタの混線**: `isDrawingRef` が単一の真偽値で、どのポインタのストロークかを区別していない。前のストロークの up と次の down が重なると状態が上書きされうる。
- **状態更新の副作用**: `addStroke` / `undo` / `redo` が `setStrokes` などの updater 関数の内部で `setHistory`・`saveStrokes` を呼んでいる。StrictMode では updater が2回実行されるため、履歴の重複や不整合が起きる。

## Goals / Non-Goals

**Goals:**
- 入力間隔に依存せず、すべての連続ストロークを描画・確定する
- StrictMode 下でも Undo/Redo 履歴が1ストローク単位で正しく積まれる

**Non-Goals:**
- ジェスチャ機能（Scribble消去・なげなわ選択）の実装
- 描画パフォーマンスの最適化（別途検討）

## Decisions

### Decision 1: ネイティブ touch リスナーで既定動作を抑止
- 描画コンテナに `addEventListener('touchstart' | 'touchmove' | 'touchend', handler, { passive: false })` を登録し、`preventDefault()` を呼ぶ。併せて `dblclick` / `contextmenu` も抑止する。
- CSS では描画コンテナに `touch-action: none` と `-webkit-user-select: none` / `-webkit-touch-callout: none` を維持する。
- **Alternatives considered**: CSS の `touch-action: none` のみ → iOS Safari ではダブルタップ判定を完全には防げないため不採用。

### Decision 2: ポインタイベントもネイティブ登録し、pointerId で追跡
- `pointerdown/move/up/cancel` をネイティブリスナーとして登録し、描画中の `pointerId` を ref に保持する。
- 新しい `pointerdown` が来たとき前のストロークが未確定なら、先に前のストロークを確定してから新しいストロークを開始する。
- `pointercancel` はそれまでの点で確定（2点未満は点として補完）する。
- **Alternatives considered**: React 合成イベントのまま修正 → passive 制約と再レンダー時のハンドラ差し替えが残るため不採用。

### Decision 3: 履歴管理を ref ベースの純粋な更新に変更
- `strokes` の正本を ref（`strokesRef`）に持ち、`history` / `redo` スタックも ref で管理。UI 再描画用に `strokes` と `canUndo` / `canRedo` を state に反映する。
- updater 関数内で他の setState や IndexedDB 保存を呼ばない。保存は確定後に1回だけ実行する。

## Risks / Trade-offs

- **[Risk] touchstart の preventDefault で描画面上のスクロールができなくなる** → 現仕様でも紙面上はスクロール不可（余白でスクロール）のため影響なし。将来の2本指スクロールはジェスチャ対応時に別途設計する。
- **[Risk] ネイティブリスナーの登録漏れ・解除漏れ** → `useEffect` で登録し、クリーンアップで確実に解除。最新の props は ref 経由で参照する。
