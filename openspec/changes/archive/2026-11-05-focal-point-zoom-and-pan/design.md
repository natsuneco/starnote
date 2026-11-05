# Design

## Context

See `proposal.md` for motivation.
前回の実装では単一の `scale(zoomScale)` のみを適用していたため、ズーム原点がコンテナ上端中央に固定され、2本指や1本指でのパン移動も行えませんでした。2本指の中心位置（Focal Point）を不変とするズーム計算と、1本指（指描画OFF時）および2本指での自由パン移動を統合したトランスフォーム管理を導入します。

## Goals / Non-Goals

**Goals:**
- 2本指の中心点 $(cx, cy)$ を不動点としたピンチズーム計算。
- 2本指の移動ベクトル $(\Delta x, \Delta y)$ に直感的に追従する自由パン移動。
- 「指で描画: OFF」時の1本指ドラッグによる上下左右360度の滑らかな自由パン移動。
- ズーム（拡大率 50%〜400%）とパンの同時並行動作。
- 拡大・縮小およびパン移動中の Apple Pencil 筆記座標の完全な整合性維持。
- リセット操作による等倍・中央位置復帰。

**Non-Goals:**
- 画面の回転（向きは縦向き固定）。

## Decisions

### Decision 1: Focal Point ズームとパンの数学的更新モデル
- **Rationale**:
  - ビューポートの左上原点からの2指の中心点を $C = (cx, cy)$、直前の中心点を $C_{prev} = (cx_{prev}, cy_{prev})$ とする。
  - 現在の表示パラメータを倍率 $s$、パンオフセット $T = (tx, ty)$ とする。
  - 指間距離の変化比率を $k = d_{curr} / d_{prev}$、次倍率を $s' = \text{clamp}(s \cdot k, 0.5, 4.0)$、実効比率を $k_{actual} = s' / s$ とする。
  - 指の移動ベクトルは $\Delta C = C - C_{prev}$。
  - 中心点 $C$ の直下にある紙面座標が、拡大後も移動後の中心点 $C + \Delta C$ に位置し続けるための新パンオフセット $T'$ は:
    $$T' = T + \Delta C + (1 - k_{actual}) \cdot (C - T)$$
  - これにより、指の平行移動と拡大縮小が単一の式で完全に同期して動作する。

### Decision 2: 1本指パン（指描画OFF時）の統合
- **Rationale**:
  - 「指で描画: OFF」のとき、1本指タッチ（`touchType === 'direct'`）のドラッグ差分 $(\Delta x, \Delta y)$ を検出し、直接 $T \leftarrow T + (\Delta x, \Delta y)$ を更新。
  - ブラウザのスクロールバーやネイティブスクロールの制約を受けず、上下左右・斜めに自由自在かつスムーズに紙面を移動できる。
  - 「指で描画: ON」のときは、1本指タッチは従来どおり手書きストローク描画として動作。

### Decision 3: コンテナのレンダリングスタイル
- **Rationale**:
  - 紙面ラッパーコンテナに以下を適用:
    ```tsx
    style={{
      transform: `translate3d(${panOffset.x}px, ${panOffset.y}px, 0) scale(${zoomScale})`,
      transformOrigin: '0 0',
      willChange: 'transform',
    }}
    ```
  - `transformOrigin: '0 0'` にすることで、数式の $T$ および $s$ と DOM のアフィン変換が完全に1対1対応し、計算の丸め誤差やレイアウトシフトをゼロに抑える。

### Decision 4: ペン描画の座標整合性
- **Rationale**:
  - `DrawingCanvas` の `getCanvasPointFromCoords` は `container.getBoundingClientRect()` を参照して座標を正規化している。
  - ブラウザの `getBoundingClientRect()` は `translate` と `scale` の両方が合成された最終的なクライアント矩形を正確に返すため、パン・ズームがどれだけ変化してもペン描画座標の補正計算を追加することなく、自動的にペン先に完全一致する。

## Risks / Trade-offs

- **[Risk] パン移動しすぎて紙面が見失われる**:
  - **Mitigation**: ツールバーのズーム倍率ボタンをクリックすることで、いつでもワンタップで $s = 1.0, T = (0, 0)$ にリセットできるようにする。
