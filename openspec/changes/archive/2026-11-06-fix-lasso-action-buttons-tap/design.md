# Design: なげなわ選択アクションボタンのイベント競合解消

## 1. 課題構造

```
[ Apple Pencil タップ ]
         │
         ▼
[ アクションバーのボタン (<button>) ]
         │
         │ (pointerdown がバブリング)
         ▼
[ DrawingCanvas コンテナ (div.canvas-interactive) ]
         │
   handleNativePointerDown
         ├─► e.preventDefault()                  (※ click イベントが抑止される)
         ├─► container.setPointerCapture()       (※ ポインターを強奪)
         ├─► isPointInSelection(pt) === false    (※ ボタンは選択矩形の外側)
         │       └─► setSelectedStrokeIds([])    (※ ボタンが DOM から即座に消失)
         └─► isDrawingRef.current = true         (※ ボタンの位置にインクを描画)
```

## 2. 解決設計

### 2.1 イベントリスナーのガード（Guard in handleNativePointerDown）
用紙コンテナに登録されている `handleNativePointerDown` の冒頭に、クリック対象の要素を検査するガードを導入する：

```ts
const target = e.target as HTMLElement | null
if (target && target.closest('[data-lasso-action-bar]')) {
  // アクションバーまたはその中のボタンが操作された場合は描画セッションを開始しない
  return
}
```

同様に、`handleNativePointerMove` や `handleNativePointerEnd` においても、アクティブなポインターがアクションバー起因である場合はスキップする。

### 2.2 React コンポーネント側でのイベント伝播遮断
アクションバー要素に属性 `data-lasso-action-bar="true"` を付与し、かつイベントハンドラーを設定：

```tsx
<div
  data-lasso-action-bar="true"
  className="absolute -top-10 left-0 flex items-center gap-1 bg-white shadow-lg border border-slate-200 rounded-lg px-2 py-1 pointer-events-auto z-20"
  onPointerDown={(e) => e.stopPropagation()}
  onPointerUp={(e) => e.stopPropagation()}
  onTouchStart={(e) => e.stopPropagation()}
  onTouchEnd={(e) => e.stopPropagation()}
  onClick={(e) => e.stopPropagation()}
>
  <button
    type="button"
    onClick={handleDeleteSelected}
    className="..."
  >
    <Trash2 className="w-3.5 h-3.5" />
    <span>削除</span>
  </button>
  ...
</div>
```

### 2.3 状態整合性の保証
- 削除実行時（`handleDeleteSelected`）:
  - 選択ストロークの除外リストを作成
  - `onUpdateStrokes` で親および IndexedDB を更新
  - `setSelectedStrokeIds([])` で選択解除
  - 静的キャンバス（`redrawStaticCanvas`）を再描画
- 解除実行時（`handleClearSelection`）:
  - `setSelectedStrokeIds([])`
  - 静的キャンバスを再描画
