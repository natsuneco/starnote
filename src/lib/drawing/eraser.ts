import type { Stroke, StrokePoint } from '../../types/drawing'
import { calculateBounds } from './stroke'

/**
 * 2つの矩形（Bounding Box）が重なっているか判定
 */
function isBoundsIntersecting(
  b1: { minX: number; minY: number; maxX: number; maxY: number },
  b2: { minX: number; minY: number; maxX: number; maxY: number }
): boolean {
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
 * ストローク消しゴム: 消しゴムの移動軌跡 (p1 -> p2) と交差したストロークを丸ごと削除
 */
export function eraseByStroke(
  strokes: Stroke[],
  p1: StrokePoint,
  p2: StrokePoint,
  eraserRadius = 10
): Stroke[] {
  const eraserBounds = {
    minX: Math.min(p1.x, p2.x) - eraserRadius,
    minY: Math.min(p1.y, p2.y) - eraserRadius,
    maxX: Math.max(p1.x, p2.x) + eraserRadius,
    maxY: Math.max(p1.y, p2.y) + eraserRadius,
  }

  const radiusSq = eraserRadius * eraserRadius

  return strokes.filter((stroke) => {
    // 1. AABB による高速除外
    if (!isBoundsIntersecting(stroke.bounds, eraserBounds)) {
      return true
    }

    // 2. 詳細な点・線分距離判定
    for (let i = 0; i < stroke.points.length; i++) {
      const sp = stroke.points[i]
      const distSq = distToSegmentSquared(sp.x, sp.y, p1.x, p1.y, p2.x, p2.y)
      if (distSq <= radiusSq) {
        return false // ヒットしたため削除
      }
    }

    return true
  })
}

/**
 * 部分消しゴム: 消しゴムの接触円内にある点を除去し、ストロークを分割
 */
export function eraseByPrecision(
  strokes: Stroke[],
  center: StrokePoint,
  eraserRadius = 15
): Stroke[] {
  const radiusSq = eraserRadius * eraserRadius
  const eraserBounds = {
    minX: center.x - eraserRadius,
    minY: center.y - eraserRadius,
    maxX: center.x + eraserRadius,
    maxY: center.y + eraserRadius,
  }

  const newStrokes: Stroke[] = []

  for (const stroke of strokes) {
    if (!isBoundsIntersecting(stroke.bounds, eraserBounds)) {
      newStrokes.push(stroke)
      continue
    }

    // ストローク内の各点が消しゴム円内にあるかチェック
    const segments: StrokePoint[][] = []
    let currentSegment: StrokePoint[] = []

    for (const pt of stroke.points) {
      const dx = pt.x - center.x
      const dy = pt.y - center.y
      const distSq = dx * dx + dy * dy

      if (distSq > radiusSq) {
        // 円外の点は残す
        currentSegment.push(pt)
      } else {
        // 円内の点でセグメントを切断
        if (currentSegment.length >= 2) {
          segments.push(currentSegment)
        }
        currentSegment = []
      }
    }

    if (currentSegment.length >= 2) {
      segments.push(currentSegment)
    }

    if (segments.length === 0) {
      // 完全に消去された
      continue
    }

    // 分割されたセグメントを新しいストロークとして登録
    for (let i = 0; i < segments.length; i++) {
      const segPoints = segments[i]
      newStrokes.push({
        ...stroke,
        id: `${stroke.id}-split-${i}-${Date.now()}`,
        points: segPoints,
        bounds: calculateBounds(segPoints, stroke.size),
      })
    }
  }

  return newStrokes
}
