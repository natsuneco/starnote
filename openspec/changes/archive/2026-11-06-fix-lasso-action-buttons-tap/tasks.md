# Tasks: なげなわ選択アクションボタンのペンタップ操作バグの修正

## 1. アクションバーのイベント遮断とガードの実装
- [x] 1.1 `DrawingCanvas.tsx` のアクションバーに `data-lasso-action-bar="true"` および `onPointerDown`/`onPointerUp`/`onTouchStart`/`onTouchEnd` の `stopPropagation` を追加
- [x] 1.2 `handleNativePointerDown` の先頭で `target.closest('[data-lasso-action-bar]')` を判定し、早期 `return` するガードを追加
- [x] 1.3 `handleDeleteSelected` および `handleClearSelection` 実行時に `redrawStaticCanvas()` を呼び出して画面描画を整合

## 2. ビルド・動作検証
- [x] 2.1 `npm run build` (`tsc -b && vite build`) の正常終了を確認
- [x] 2.2 ペンタップでの削除および選択解除が誤描画なく正常に実行されることを確認
