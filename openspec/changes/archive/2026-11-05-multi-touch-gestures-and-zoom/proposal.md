# Proposal

## Why

iPad等の手書きアプリ（GoodNotes、Procreate、Freeformなど）において、ツールバーまでペン先を動かさずに手元で直感的にUndo/Redoや画面拡大・縮小を行えるマルチタッチジェスチャーは、思考を妨げない手書き体験の要となる機能です。現在、StarNoteではツールバーのボタン押下でのみUndo/Redoが可能で、紙面の拡大縮小（ピンチズーム）は未対応であるため、手書き作業の快適性を劇的に高めるマルチタッチ操作を導入します。

## What Changes

- **2本指タップによる取り消し (Two-finger tap to Undo)**:
  - キャンバス面を2本指で素早くタップしたとき、直前のストロークまたは消去操作を1ステップ元に戻します（Undo）。
- **3本指タップによるやり直し (Three-finger tap to Redo)**:
  - キャンバス面を3本指で素早くタップしたとき、取り消した操作を1ステップやり直します（Redo）。
- **2本指ピンチ操作によるズーム＆パン (Pinch to Zoom & Two-finger Pan)**:
  - 2本指の接触距離の変化に応じて、紙面の表示倍率をスムーズに拡大・縮小（50%〜300%）します。
  - 2本指の中心点の移動に合わせて、紙面を滑らかにパン移動します。
  - 拡大・縮小表示中であっても、Apple Pencil による手書き描画（ベクター座標変換・筆圧検知）は正確に追従し、高精細な描画品質を維持します。
- **ズーム倍率表示 & リセットUI**:
  - エディタヘッダーに現在のズーム倍率（例: `100%`）を表示し、タップで即座に `100%`（等倍）にリセットできるようにします。

## Capabilities

### New Capabilities
<!-- なし -->

### Modified Capabilities
- `drawing-gestures`: マルチタッチジェスチャー（2本指Undo、3本指Redo、2本指ピンチズーム＆パン）要件を追加

## Impact

- `src/components/editor/DrawingCanvas.tsx`: タッチイベント（`touchstart`, `touchmove`, `touchend`）でのマルチタッチ（2本指・3本指）判定、タップ判定時間（例: 250ms以内・移動微小）、ピンチ距離・中心点計算。
- `src/components/editor/EditorScreen.tsx`: ビューポート全体のズーム倍率（`zoomScale`）およびパンオフセットの管理、ズームバッジ表示、`PageItem` へのスケール伝達と座標変換。
- 既存のシングルタッチでの指スクロール/指描画トグル、Apple Pencilによる手書き描画ロジックとの完全な共存を保証します。
