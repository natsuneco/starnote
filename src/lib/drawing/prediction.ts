import type { StrokePoint } from '../../types/drawing'

export interface PredictionOptions {
  /** 予測の強さ（通常 0.5〜0.8） */
  lookahead?: number
  /** 最大予測距離 (px) */
  maxDistance?: number
}

/**
 * 直近の入力点列から、次のフレーム（約8〜12ms先）にペン先が到達する予測座標を算出する
 * 
 * 急旋回や急減速時にはダンピング（減衰）を適用し、不自然な飛び出し（オーバーシュート）を防止します。
 */
export function predictNextPoint(
  points: StrokePoint[],
  options: PredictionOptions = {}
): StrokePoint | null {
  if (points.length < 2) return null

  const lookahead = options.lookahead ?? 0.7
  const maxDistance = options.maxDistance ?? 28

  const pCurrent = points[points.length - 1]
  const pPrev = points[points.length - 2]

  const dx1 = pCurrent.x - pPrev.x
  const dy1 = pCurrent.y - pPrev.y
  const dist1 = Math.hypot(dx1, dy1)

  // 速度が極小（静止に近い）なら予測しない
  if (dist1 < 2) return null

  let damping = 1.0

  // 3点以上あれば曲がり具合（角度変化）をチェックしてダンピング
  if (points.length >= 3) {
    const pPrev2 = points[points.length - 3]
    const dx0 = pPrev.x - pPrev2.x
    const dy0 = pPrev.y - pPrev2.y
    const dist0 = Math.hypot(dx0, dy0)

    if (dist0 > 1) {
      // 2つの移動ベクトルの内積 (cosθ)
      const dot = (dx0 * dx1 + dy0 * dy1) / (dist0 * dist1)
      if (dot < 0.3) {
        // 急激な方向転換（約72度以上の旋回・折り返し）では予測を急速に減衰
        damping = Math.max(0, dot)
      } else {
        // 緩やかなカーブでは滑らかに重み付け
        damping = Math.min(1.0, (dot + 0.2) / 1.2)
      }
    }
  }

  const effectiveFactor = lookahead * damping
  const predDx = dx1 * effectiveFactor
  const predDy = dy1 * effectiveFactor
  const predDist = Math.hypot(predDx, predDy)

  if (predDist > maxDistance) {
    const scale = maxDistance / predDist
    return {
      x: pCurrent.x + predDx * scale,
      y: pCurrent.y + predDy * scale,
      pressure: pCurrent.pressure,
    }
  }

  return {
    x: pCurrent.x + predDx,
    y: pCurrent.y + predDy,
    pressure: pCurrent.pressure,
  }
}
