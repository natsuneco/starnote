# Design

## Context

See `proposal.md` for motivation.
本設計では、ジェスチャ機能（Scribble消去・なげなわ選択）を意図的に除外し、手書きノートの核となるインク描画、消去、およびデータ管理を堅牢かつ高速に実装します。

## Goals / Non-Goals

**Goals:**
- `perfect-freehand` を用いた自然な筆圧・傾き追従インク線の生成
- 2層構造のHTML5 Canvas（確定線レイヤー ＋ `desynchronized: true` 描画中レイヤー）によるProMotion 120Hz対応の低遅延描画
- ペンおよび蛍光ペン（`multiply` 合成モード）の描画サポート
- 消しゴムの2方式（ストローク丸ごと消去 / 接触部分のみ削る精密消去）の切り替えトグル
- 操作履歴スタックによる Undo / Redo 機能
- Dexie.js による IndexedDB への非同期ストローク永続化

**Non-Goals:**
- ぐちゃぐちゃ消去（Scribble to erase）および囲み長押し選択（Circle to lasso）ジェスチャの実装（後続の専用変更で実装）
- PDFレンダリングおよびエクスポート機能（後続変更で実装）

## Decisions

### Decision 1: `perfect-freehand` ＋ Path2D レンダリング
- **Rationale**: 点群 `[[x, y, pressure], ...]` から外形のアウトラインポリゴンを計算し、`Path2D` または SVG Path を作成して Canvas の `fill()` で塗りつぶします。これにより、ベジェ曲線の入り・抜きが滑らかになり、GoodNotesライクな高い筆記クオリティが得られます。

### Decision 2: 2層キャンバス（確定レイヤー ＋ アクティブレイヤー）
- **Rationale**:
  - **確定レイヤー（下層）**: ペンアップ時にストロークを焼き込む静的Canvas。毎フレーム再描画しないためCPU/GPU負荷が極小。
  - **アクティブレイヤー（上層）**: ペンダウン〜ペンアップ中のみ使用する軽量Canvas。`desynchronized: true` でブラウザの合成キューをバイパスして最速で描画。

### Decision 3: 消しゴムの2方式アルゴリズム
- **ストローク消しゴム**:
  - 消しゴムの移動軌跡（線分）と、各ストロークのバウンディングボックス（AABB）および線分の交差判定を行い、交差したストロークを丸ごと配列から削除。
- **部分消しゴム**:
  - 消しゴムの半径（円）内にあるストロークの点（Point）を除去し、ストロークを前後の独立した2つの新しいストロークに分割（Split）。

### Decision 4: Undo / Redo の差分・スナップショット設計
- **Rationale**: ストローク配列のイミュータブルなスナップショット履歴（Undoスタック / Redoスタック）を管理。Undo時は確定レイヤーCanvasをクリアして現在のストローク一覧を一括再描画。

## Risks / Trade-offs

- **[Risk] 部分消しゴムによるストロークオブジェクトの急増** → **Mitigation**: 部分消しゴムで分割された微小なストローク（点が2点未満など）は自動クリーンアップし、オブジェクトの肥大化を抑止する。
- **[Risk] iPadのパーム誤判定** → **Mitigation**: `pointerType === 'pen'` のイベントを優先し、スタイラス描画中は `touch` イベントを明示的に無視する。
