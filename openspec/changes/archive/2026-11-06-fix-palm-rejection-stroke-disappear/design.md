# Design: パームリジェクション漏れによるストローク誤消去防止

## 1. 状態遷移とガードのアーキテクチャ

```
                                      [ ペン筆記イベント ]
                                               │
                                               ├─► pointerdown / move / up
                                               │   lastPenTimeRef = now
                                               │   multiTouchStateRef をリセット
                                               ▼
[ タッチイベント (手のひら / 指) ]
         │
         ├─► touchstart ───────────────► ペンが直近 600ms 以内に使用されたか？
         │                                   ├─► YES: マルチタッチ追跡を開始しない
         │                                   └─► NO : 通常のマルチタッチ追跡開始
         │
         ├─► touchcancel ──────────────► 【新規】handleTouchCancel
         │                                   └─► ジェスチャーを実行せず全タッチ状態をクリア
         │
         └─► touchend ─────────────────► 【修正】handleTouchEnd
                                             ├─► now - lastPenTimeRef < 600ms ?
                                             │     └─► 誤Undo防止のため即座に破棄・リターン
                                             └─► それ以外: 2本指タップ (Undo) / 3本指タップ (Redo)
```

## 2. 詳細コンポーネント設計 (`DrawingCanvas.tsx`)

### 2.1 タイムスタンプ参照の追加
```ts
const lastPenTimeRef = useRef<number>(0)
```
- ペンの `pointerdown`, `pointermove`, `pointerup` イベント発生時に `lastPenTimeRef.current = performance.now()` を更新。

### 2.2 ペン接触時のマルチタッチ即時リセット
- `handleNativePointerDown` の先頭（ペン判定時）:
  ```ts
  if (e.pointerType === 'pen') {
    lastPenTimeRef.current = performance.now()
    // 進行中のマルチタッチ状態を破棄（パーム接触の残存防止）
    multiTouchStateRef.current.activeFingerCount = 0
    multiTouchStateRef.current.hasMoved = true // タップ成立を防止
  }
  ```

### 2.3 `handleTouchCancel` の独立実装
- `container.removeEventListener('touchcancel', handleTouchEnd)` を廃止。
- 独立した `handleTouchCancel` を作成し、イベント登録:
  ```ts
  const handleTouchCancel = (e: TouchEvent) => {
    singleTouchPanRef.current = null
    multiTouchStateRef.current.activeFingerCount = 0
    multiTouchStateRef.current.hasMoved = true
    if (e.cancelable) {
      e.preventDefault()
    }
  }
  ```

### 2.4 `handleTouchEnd` におけるクールダウン判定
- ペン離脱直後（約600ms）のガードを追加:
  ```ts
  const now = performance.now()
  const isPenRecentlyActive = activePointerTypeRef.current === 'pen' || (now - lastPenTimeRef.current < 600)
  if (isPenRecentlyActive) {
    state.activeFingerCount = 0
    state.hasMoved = true
    return
  }
  ```
