import type { Stroke, StrokePoint, Bounds } from '../../types/drawing'
import { calculateBounds } from '../drawing/stroke'

/**
 * 2つの矩形（Bounding Box）が重なっているか判定
 */
function isBoundsIntersecting(b1: Bounds, b2: Bounds): boolean {
  return !(
    b2.minX > b1.maxX ||
    b2.maxX < b1.minX ||
    b2.minY > b1.maxY ||
    b2.maxY < b1.minY
  )
}

/**
 * 点 (px, py) と 線分 (x1, y1)-(x2, y2) の最短距離の2乗
 */
function distToSegmentSquared(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1)
  if (l2 === 0) return (px - x1) * (px - x1) + (py - y1) * (py - y1)

  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2
  t = Math.max(0, Math.min(1, t))
  const projX = x1 + t * (x2 - x1)
  const projY = y1 + t * (y2 - y1)
  return (px - projX) * (px - projX) + (py - projY) * (py - projY)
}

/**
 * スクラブ（ぐちゃぐちゃ描いて消す）ジェスチャーかどうかを判定する
 * 
 * 判定条件:
 * 1. 一定以上の点数がある（10点以上）
 * 2. 急峻な方向反転（120°以上）が4回以上発生している
 * 3. 密集度（総経路長 / バウンディングボックス対角線長）が 2.2 以上
 */
export function isScribbleStroke(points: StrokePoint[]): boolean {
  if (points.length < 8) return false

  // 微小ジッター除去のための間引きサンプリング (最小移動距離 4px)
  const sampled: StrokePoint[] = [points[0]]
  for (let i = 1; i < points.length; i++) {
    const prev = sampled[sampled.length - 1]
    const cur = points[i]
    const distSq = (cur.x - prev.x) ** 2 + (cur.y - prev.y) ** 2
    if (distSq >= 16) {
      // 4px 以上移動したらサンプリング
      sampled.push(cur)
    }
  }

  if (sampled.length < 6) return false

  // 総経路長と急峻な反転回数を計測
  let totalLength = 0
  let reversals = 0

  const vectors: { x: number; y: number; len: number }[] = []
  for (let i = 1; i < sampled.length; i++) {
    const dx = sampled[i].x - sampled[i - 1].x
    const dy = sampled[i].y - sampled[i - 1].y
    const len = Math.hypot(dx, dy)
    totalLength += len
    if (len > 0.001) {
      vectors.push({ x: dx / len, y: dy / len, len })
    }
  }

  // 連続するベクトルの内積から角度をチェック
  for (let i = 1; i < vectors.length; i++) {
    const dot = vectors[i - 1].x * vectors[i].x + vectors[i - 1].y * vectors[i].y
    // cos(120°) = -0.5。-0.45（約117度）以下なら鋭角折り返しとみなす
    if (dot < -0.45) {
      reversals++
    }
  }

  // バウンディングボックスと対角線
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const p of sampled) {
    if (p.x < minX) minX = p.x
    if (p.y < minY) minY = p.y
    if (p.x > maxX) maxX = p.x
    if (p.y > maxY) maxY = p.y
  }

  const diag = Math.hypot(maxX - minX, maxY - minY)
  if (diag < 15) {
    // 小さすぎる振動は除外
    return false
  }

  const density = totalLength / diag

  // 反転が4回以上あり、かつ密集度（往復密度）が2.2以上
  return reversals >= 4 && density >= 2.2
}

/**
 * スクラブジェスチャーの軌跡と交差または近接するストロークのIDリストを取得する
 */
export function getScribbleEraseTargets(
  strokes: Stroke[],
  scribblePoints: StrokePoint[],
  hitRadius = 25
): string[] {
  if (strokes.length === 0 || scribblePoints.length === 0) return []

  const scribbleBounds = calculateBounds(scribblePoints, hitRadius)
  const radiusSq = hitRadius * hitRadius
  const targetIds: string[] = []

  // スクラブ軌跡を簡略化した線分リスト
  const segments: { p1: StrokePoint; p2: StrokePoint }[] = []
  for (let i = 1; i < scribblePoints.length; i++) {
    segments.push({ p1: scribblePoints[i - 1], p2: scribblePoints[i] })
  }

  for (const stroke of strokes) {
    // AABB による事前判定
    if (!isBoundsIntersecting(stroke.bounds, scribbleBounds)) {
      continue
    }

    // ストローク内のいずれかの点が、スクラブのいずれかの線分から hitRadius 以内にあるか
    let hit = false
    for (const sp of stroke.points) {
      for (const seg of segments) {
        const dSq = distToSegmentSquared(sp.x, sp.y, seg.p1.x, seg.p1.y, seg.p2.x, seg.p2.y)
        if (dSq <= radiusSq) {
          hit = true
          break
        }
      }
      if (hit) break
    }

    if (hit) {
      targetIds.push(stroke.id)
    }
  }

  return targetIds
}
