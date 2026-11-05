# Proposal

## Why

iPad Safari で短い間隔で続けてストロークを描くと、2本目のストロークが反映されない不具合があります（指・Apple Pencil の両方で発生し、間隔を十分に空けると描ける）。手書きノートでは文字を素早く連続で書くのが基本操作のため、最優先で修正が必要です。

## What Changes

- 描画面で iOS Safari のダブルタップ判定などのネイティブタッチジェスチャを確実に抑止する（非 passive なネイティブ `touchstart` / `touchmove` リスナーで `preventDefault`）
- `pointercancel` を `pointerup` と区別して扱い、ブラウザ都合で中断されたストロークも描画内容を失わないようにする
- 描画中のポインタを `pointerId` で追跡し、前のストロークの終了処理と次のストロークの開始が重なっても状態が壊れないようにする
- `usePageDrawing` の状態更新から副作用（履歴更新・IndexedDB保存）を分離し、React StrictMode 下でも履歴が重複・欠落しないようにする

## Capabilities

### New Capabilities
<!-- なし -->

### Modified Capabilities
- `drawing-engine`: 短い間隔での連続ストローク入力を確実に受け付ける要件を追加する。

## Impact

- `src/components/editor/DrawingCanvas.tsx`（入力イベント処理）
- `src/hooks/usePageDrawing.ts`（ストローク・履歴の状態管理）
- 依存: 変更 `drawing-engine` が先にアーカイブされ、`openspec/specs/drawing-engine/` が存在していること
