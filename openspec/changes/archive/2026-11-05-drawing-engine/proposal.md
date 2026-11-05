# Proposal

## Why

StarNoteのコアとなる快適な手書き描画体験を実現するため、ジェスチャ機能（Scribble消去・なげなわ選択）を除く基幹描画エンジンを実装します。Apple Pencilの筆圧検知・低遅延描画、ペンおよび蛍光ペン描画、2種類の消しゴム切り替え、Undo/Redo、およびIndexedDBへのストローク永続化を構築します。

## What Changes

- `perfect-freehand` を活用した滑らかなインク外形パス生成エンジンの実装
- 描画中レイヤー（低遅延）と確定線レイヤーを分離した多層HTML5 Canvasコンポーネントの実装
- `PointerEvent` による筆圧検知、`getCoalescedEvents()` による精密トラッキング、およびパームリジェクションの実装
- ペンツールおよび蛍光ペンツール（乗算ブレンド `multiply`）の実装
- 消しゴムツール（「ストローク消去」と「部分消去」の2方式切り替えトグル）の実装
- 操作履歴の Undo / Redo（元に戻す / やり直す）機能の実装
- ページ単位でのストロークデータ永続化（IndexedDB / Dexie.js）の実装

## Capabilities

### New Capabilities
- `drawing-engine`: Apple Pencil最適化された低遅延ペン・マーカー描画、2方式消しゴム、Undo/Redo、およびストローク永続化を提供する手書き描画エンジン。

### Modified Capabilities
<!-- なし -->

## Impact

- 編集画面（`EditorScreen`）のキャンバスプレースホルダーが実際の手書きキャンバスへ置き換わる
- `src/types/drawing.ts`, `src/lib/drawing/`, `src/hooks/useDrawing.ts` などの描画モジュールを追加
- ツールバーの Undo/Redo ボタンおよび消しゴム切り替えUIが機能するようになる
