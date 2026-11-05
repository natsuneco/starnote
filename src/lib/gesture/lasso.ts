import type { Stroke, StrokePoint, Bounds } from '../../types/drawing'

/**
 * 2点間のユークリッド距離
 */
function dist(p1: { x: number; y: number }, p2: { x: number; y: number }): number {
  return Math.hypot(p2.x - p1.x, p2.y - p1.y)
}

/**
 * 点と線分の最短距離の2乗
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
 * ストロークが丸囲み（閉ループ）かどうかを判定する
 */
export function isClosedLoop(points: StrokePoint[]): boolean {
  if (points.length < 8) return false

  const start = points[0]
  const end = points[points.length - 1]
  const closureDist = dist(start, end)

  let totalLength = 0
  for (let i = 1; i < points.length; i++) {
    totalLength += dist(points[i - 1], points[i])
  }

  // 始点と終点の距離が40px以下、かつ総経路長が60px以上
  return closureDist <= 45 && totalLength >= 60
}

/**
 * 点が閉ループの輪郭線（エッジ）の近傍にあるかを判定する
 */
export function isPointNearContour(
  point: { x: number; y: number },
  loopPoints: StrokePoint[],
  maxDistance = 25
): boolean {
  if (loopPoints.length < 2) return false
  const maxDistSq = maxDistance * maxDistance

  for (let i = 1; i < loopPoints.length; i++) {
    const p1 = loopPoints[i - 1]
    const p2 = loopPoints[i]
    if (distToSegmentSquared(point.x, point.y, p1.x, p1.y, p2.x, p2.y) <= maxDistSq) {
      return true
    }
  }

  return false
}

/**
 * Ray Casting アルゴリズムによる多角形の内包判定
 */
export function isPointInPolygon(
  point: { x: number; y: number },
  polygon: StrokePoint[]
): boolean {
  let inside = false
  const { x, y } = point
  const n = polygon.length

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i].x
    const yi = polygon[i].y
    const xj = polygon[j].x
    const yj = polygon[j].y

    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + 0.0000001) + xi
    if (intersect) {
      inside = !inside
    }
  }

  return inside
}

/**
 * なげなわ閉ループ内に含まれるストロークを抽出する
 */
export function findStrokesInLasso(
  strokes: Stroke[],
  loopPoints: StrokePoint[]
): Stroke[] {
  if (strokes.length === 0 || loopPoints.length < 3) return []

  return strokes.filter((stroke) => {
    if (stroke.points.length === 0) return false

    // ストローク内の点が一定割合（40%以上）ループ内にあるか、もしくは中心点が内側にあるか
    let insideCount = 0
    for (const p of stroke.points) {
      if (isPointInPolygon(p, loopPoints)) {
        insideCount++
      }
    }

    const ratio = insideCount / stroke.points.length
    return ratio >= 0.4
  })
}

/**
 * 複数ストローク全体の合成バウンディングボックスを計算
 */
export function getSelectionBounds(strokes: Stroke[]): Bounds | null {
  if (strokes.length === 0) return null

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const s of strokes) {
    if (s.bounds.minX < minX) minX = s.bounds.minX
    if (s.bounds.minY < minY) minY = s.bounds.minY
    if (s.bounds.maxX > maxX) maxX = s.bounds.maxX
    if (s.bounds.maxY > maxY) maxY = s.bounds.maxY
  }

  // 余白を少し持たせる
  const padding = 8
  return {
    minX: minX - padding,
    minY: minY - padding,
    maxX: maxX + padding,
    maxY: maxY + padding,
  }
}

/**
 * 選択状態のオブジェクトまたは選択領域にヒットしているか判定
 * （枠線のみならず、選択状態のオブジェクト本体および選択領域内部全体でドラッグ可能）
 */
export function isPointInSelection(
  point: { x: number; y: number },
  selectedStrokes: Stroke[],
  selectionBounds: Bounds | null
): boolean {
  if (!selectionBounds || selectedStrokes.length === 0) return false

  // 1. バウンディングボックス内部判定
  if (
    point.x >= selectionBounds.minX &&
    point.x <= selectionBounds.maxX &&
    point.y >= selectionBounds.minY &&
    point.y <= selectionBounds.maxY
  ) {
    return true
  }

  // 2. 選択ストロークの各点の近傍判定（念のため余白外に突出している場合）
  const thresholdSq = 20 * 20
  for (const s of selectedStrokes) {
    for (let i = 1; i < s.points.length; i++) {
      const p1 = s.points[i - 1]
      const p2 = s.points[i]
      if (distToSegmentSquared(point.x, point.y, p1.x, p1.y, p2.x, p2.y) <= thresholdSq) {
        return true
      }
    }
  }

  return false
}
