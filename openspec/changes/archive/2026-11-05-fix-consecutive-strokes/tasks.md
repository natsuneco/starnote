# Tasks

## 1. 入力イベント処理の修正（DrawingCanvas）

- [x] 1.1 描画コンテナに非 passive のネイティブ `touchstart` / `touchmove` / `touchend` リスナーと `dblclick` / `contextmenu` 抑止を追加し、iPad Safari でダブルタップズームや長押しメニューが発生しないことを確認する
- [x] 1.2 ポインタイベントをネイティブリスナーに移行し、最新の props（ツール・色・太さ・消しゴムモード）を ref 経由で参照するようにして、ツール切り替え後も正しく描画されることを確認する
- [x] 1.3 描画中の `pointerId` を追跡し、未確定ストロークがある状態で次の `pointerdown` が来たら先に確定する処理を実装する
- [x] 1.4 `pointercancel` 時にそれまでの点でストロークを確定する処理を実装し、キャンセル後も次のストロークが描けることを確認する

## 2. 状態・履歴管理の修正（usePageDrawing）

- [x] 2.1 ストローク・Undo/Redo スタックを ref ベースで管理し、setState の updater 内から副作用（他の setState・IndexedDB 保存）を除去する
- [x] 2.2 StrictMode の開発サーバー上で連続ストローク後に Undo を実行し、1本ずつ逆順に取り消されることを確認する

## 3. 検証

- [x] 3.1 `npm run build` が型エラーなく成功することを確認する
- [x] 3.2 iPad Safari（Tailscale 経由）で、指とApple Pencilそれぞれで素早い連続ストローク・短い点の連打がすべて反映されることを確認する
