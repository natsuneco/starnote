import type { Stroke, StrokePoint, Bounds } from '../../types/drawing'
import { calculateBounds } from '../drawing/stroke'

export type RecognizedShapeType = 'line' | 'circle' | 'rectangle' | 'kanji-box'

export interface ShapeRecognitionResult {
  type: RecognizedShapeType
  points: StrokePoint[]
  bounds: Bounds
  /** 日本式「口」のように、以前のストロークを置き換える場合の対象ストロークID */
  replacedStrokeIds?: string[]
}

/**
 * 2点間の距離
 */
function dist(p1: { x: number; y: number }, p2: { x: number; y: number }): number {
  return Math.hypot(p2.x - p1.x, p2.y - p1.y)
}

/**
 * 点と線分の最短距離
 */
function distToSegment(
  p: StrokePoint,
  s1: StrokePoint,
  s2: StrokePoint
): number {
  const l2 = (s2.x - s1.x) ** 2 + (s2.y - s1.y) ** 2
  if (l2 === 0) return dist(p, s1)
  let t = ((p.x - s1.x) * (s2.x - s1.x) + (p.y - s1.y) * (s2.y - s1.y)) / l2
  t = Math.max(0, Math.min(1, t))
  const projX = s1.x + t * (s2.x - s1.x)
  const projY = s1.y + t * (s2.y - s1.y)
  return Math.hypot(p.x - projX, p.y - projY)
}

/**
 * 直線認識
 */
function tryRecognizeLine(rawPoints: StrokePoint[], defaultPressure: number): ShapeRecognitionResult | null {
  const points = deduplicatePoints(rawPoints, 2.5)
  if (points.length < 5) return null

  const start = points[0]
  const end = points[points.length - 1]
  const lineLength = dist(start, end)

  // 始点と終点が近すぎる場合は直線ではない（閉ループの可能性）
  if (lineLength < 30) return null

  // 全点の始点-終点線分からの最大乖離度をチェック
  let maxDeviation = 0
  for (let i = 1; i < points.length - 1; i++) {
    const d = distToSegment(points[i], start, end)
    if (d > maxDeviation) {
      maxDeviation = d
    }
  }

  // 許容乖離量: 長さの10%または最大20px
  const allowedDeviation = Math.max(12, Math.min(lineLength * 0.12, 25))
  if (maxDeviation <= allowedDeviation) {
    // 綺麗な直線ポイント列を生成（補間8点）
    const fittedPoints: StrokePoint[] = []
    const steps = Math.max(6, Math.min(20, Math.floor(lineLength / 15)))
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      fittedPoints.push({
        x: start.x + t * (end.x - start.x),
        y: start.y + t * (end.y - start.y),
        pressure: defaultPressure,
      })
    }

    return {
      type: 'line',
      points: fittedPoints,
      bounds: calculateBounds(fittedPoints, 10),
    }
  }

  return null
}

/**
 * 連続する近接点・静止滞留点を除去し、幾何形状認識のバイアスを排除する
 */
export function deduplicatePoints(points: StrokePoint[], minDistance = 2.5): StrokePoint[] {
  if (points.length < 2) return points
  const result: StrokePoint[] = [points[0]]
  for (let i = 1; i < points.length; i++) {
    if (dist(points[i], result[result.length - 1]) >= minDistance) {
      result.push(points[i])
    }
  }
  return result
}

/**
 * 正円・楕円認識
 * 
 * 終点ホールドによる滞留点の影響を受けないよう、外接矩形中心と累積回転角を用いて判定
 */
function tryRecognizeCircle(rawPoints: StrokePoint[], defaultPressure: number): ShapeRecognitionResult | null {
  const points = deduplicatePoints(rawPoints, 2.5)
  if (points.length < 10) return null

  // バウンディングボックスを算出
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const p of points) {
    if (p.x < minX) minX = p.x
    if (p.y < minY) minY = p.y
    if (p.x > maxX) maxX = p.x
    if (p.y > maxY) maxY = p.y
  }

  const w = maxX - minX
  const h = maxY - minY
  if (w < 20 || h < 20) return null

  // 極端に細長い形状は円ではない（アスペクト比 0.55 〜 1.80）
  const ratio = w / h
  if (ratio < 0.55 || ratio > 1.8) return null

  // 4隅すべてにストロークが到達している場合は長方形に譲る
  const cornerThreshold = Math.max(12, Math.min(w, h) * 0.15)
  let hasTL = false
  let hasTR = false
  let hasBR = false
  let hasBL = false
  for (const p of points) {
    if (dist(p, { x: minX, y: minY }) <= cornerThreshold) hasTL = true
    if (dist(p, { x: maxX, y: minY }) <= cornerThreshold) hasTR = true
    if (dist(p, { x: maxX, y: maxY }) <= cornerThreshold) hasBR = true
    if (dist(p, { x: minX, y: maxY }) <= cornerThreshold) hasBL = true
  }
  if (hasTL && hasTR && hasBR && hasBL) {
    return null
  }

  // 中心座標（外接矩形の中心を用いることで、終点でホールド待機した点の偏りを完全排除）
  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2

  // 中心周りの累積回転角を計算（円周に沿って1周ぐるっと回っているかを検証）
  let totalAngle = 0
  let prevAngle = Math.atan2(points[0].y - cy, points[0].x - cx)
  for (let i = 1; i < points.length; i++) {
    const curAngle = Math.atan2(points[i].y - cy, points[i].x - cx)
    let delta = curAngle - prevAngle
    while (delta > Math.PI) delta -= 2 * Math.PI
    while (delta < -Math.PI) delta += 2 * Math.PI
    totalAngle += delta
    prevAngle = curAngle
  }
  const absAngle = Math.abs(totalAngle)
  // 260度（1.44π）〜540度（3.0π）の回転（適度なアンダーシュートやオーバーラップを許容）
  if (absAngle < Math.PI * 1.44 || absAngle > Math.PI * 3.2) {
    return null
  }

  // 中心からの各点への距離の平均と標準偏差を計算
  const distances = points.map((p) => dist(p, { x: cx, y: cy }))
  const avgRadius = distances.reduce((a, b) => a + b, 0) / distances.length
  if (avgRadius < 12) return null

  const variance =
    distances.reduce((acc, d) => acc + (d - avgRadius) ** 2, 0) / distances.length
  const stdDev = Math.sqrt(variance)

  // 変動係数（CV = stdDev / avgRadius）が小さければ正円（手書きの自然なゆらぎを十分に許容）
  if (stdDev / avgRadius < 0.28) {
    // 36分割の綺麗な円ポイント列を生成
    const fittedPoints: StrokePoint[] = []
    const segments = 36
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2
      fittedPoints.push({
        x: cx + avgRadius * Math.cos(theta),
        y: cy + avgRadius * Math.sin(theta),
        pressure: defaultPressure,
      })
    }

    return {
      type: 'circle',
      points: fittedPoints,
      bounds: calculateBounds(fittedPoints, 10),
    }
  }

  return null
}

/**
 * 一筆書き長方形の認識
 */
function tryRecognizeSingleStrokeRectangle(
  rawPoints: StrokePoint[],
  defaultPressure: number
): ShapeRecognitionResult | null {
  const points = deduplicatePoints(rawPoints, 2.5)
  if (points.length < 10) return null

  const start = points[0]
  const end = points[points.length - 1]
  const closureDist = dist(start, end)
  if (closureDist > 55) return null

  // バウンディングボックスを算出
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const p of points) {
    if (p.x < minX) minX = p.x
    if (p.y < minY) minY = p.y
    if (p.x > maxX) maxX = p.x
    if (p.y > maxY) maxY = p.y
  }

  const w = maxX - minX
  const h = maxY - minY
  if (w < 20 || h < 20) return null

  // 4つの角（左上、右上、右下、左下）の近傍に点が到達しているか確認
  // 円の場合は幾何学的に角から 0.207 * min(w, h) 離れているため、0.15 以下に設定することで円の誤認識を確実に排除
  const cornerThreshold = Math.max(12, Math.min(w, h) * 0.15)
  let hasTopLeft = false
  let hasTopRight = false
  let hasBottomRight = false
  let hasBottomLeft = false

  for (const p of points) {
    if (dist(p, { x: minX, y: minY }) <= cornerThreshold) hasTopLeft = true
    if (dist(p, { x: maxX, y: minY }) <= cornerThreshold) hasTopRight = true
    if (dist(p, { x: maxX, y: maxY }) <= cornerThreshold) hasBottomRight = true
    if (dist(p, { x: minX, y: maxY }) <= cornerThreshold) hasBottomLeft = true
  }

  // 4隅すべてに点が到達していなければ長方形ではない（円や三角形を排除）
  if (!hasTopLeft || !hasTopRight || !hasBottomRight || !hasBottomLeft) {
    return null
  }

  // 各点がバウンディングボックスの4辺のいずれかに近いかを評価
  let onPerimeterCount = 0
  const threshold = Math.max(10, Math.min(w, h) * 0.13)

  for (const p of points) {
    const dLeft = Math.abs(p.x - minX)
    const dRight = Math.abs(p.x - maxX)
    const dTop = Math.abs(p.y - minY)
    const dBottom = Math.abs(p.y - maxY)
    const minEdgeDist = Math.min(dLeft, dRight, dTop, dBottom)

    if (minEdgeDist <= threshold) {
      onPerimeterCount++
    }
  }

  const perimeterRatio = onPerimeterCount / points.length
  // 75%以上の点が矩形の外周近傍に存在すれば長方形とみなす
  if (perimeterRatio >= 0.75) {
    const fittedPoints: StrokePoint[] = [
      { x: minX, y: minY, pressure: defaultPressure },
      { x: maxX, y: minY, pressure: defaultPressure },
      { x: maxX, y: maxY, pressure: defaultPressure },
      { x: minX, y: maxY, pressure: defaultPressure },
      { x: minX, y: minY, pressure: defaultPressure },
    ]

    return {
      type: 'rectangle',
      points: fittedPoints,
      bounds: calculateBounds(fittedPoints, 10),
    }
  }

  return null
}

/**
 * 日本式「口」の書き順による四角形認識
 * 
 * 書き順:
 * 1画目: 左の縦棒（上から下へ）
 * 2画目: 上横から右縦の折れ線（左から右、そして上から下へ）
 * 3画目: 下の横棒（左から右へ）ホールド
 */
function tryRecognizeKanjiBox(
  currentPoints: StrokePoint[],
  recentStrokes: Stroke[],
  defaultPressure: number
): ShapeRecognitionResult | null {
  if (recentStrokes.length < 2 || currentPoints.length < 4) return null

  const s1 = recentStrokes[recentStrokes.length - 2] // 1画目
  const s2 = recentStrokes[recentStrokes.length - 1] // 2画目
  const s3Points = currentPoints // 3画目

  // 1画目チェック: 縦方向（下向き）
  const s1Start = s1.points[0]
  const s1End = s1.points[s1.points.length - 1]
  const s1Dx = s1End.x - s1Start.x
  const s1Dy = s1End.y - s1Start.y
  // 下向きであり、縦成分が横成分より大きい
  if (s1Dy <= 15 || Math.abs(s1Dy) < Math.abs(s1Dx) * 1.2) {
    return null
  }

  // 3画目チェック: 横方向（左から右へ）
  const s3Start = s3Points[0]
  const s3End = s3Points[s3Points.length - 1]
  const s3Dx = s3End.x - s3Start.x
  const s3Dy = s3End.y - s3Start.y
  // 右向きであり、横成分が縦成分より大きい
  if (s3Dx <= 15 || Math.abs(s3Dx) < Math.abs(s3Dy) * 1.2) {
    return null
  }

  // 2画目チェック: 折れ線（上が横、右が縦）
  // 2画目の始点は1画目の上端（s1Start）近傍
  const s2Start = s2.points[0]
  const s2End = s2.points[s2.points.length - 1]
  if (dist(s1Start, s2Start) > 40) {
    return null
  }

  // 3画目の始点は1画目の下端（s1End）近傍
  if (dist(s1End, s3Start) > 40) {
    return null
  }

  // 3画目の終点は2画目の終端（s2End）近傍
  if (dist(s2End, s3End) > 45) {
    return null
  }

  // 全ストローク（s1, s2, s3）の合成バウンディングボックスを計算
  const allPoints = [...s1.points, ...s2.points, ...s3Points]
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const p of allPoints) {
    if (p.x < minX) minX = p.x
    if (p.y < minY) minY = p.y
    if (p.x > maxX) maxX = p.x
    if (p.y > maxY) maxY = p.y
  }

  const w = maxX - minX
  const h = maxY - minY
  if (w < 20 || h < 20) return null

  // 綺麗な長方形ストロークを生成
  const fittedPoints: StrokePoint[] = [
    { x: minX, y: minY, pressure: defaultPressure },
    { x: maxX, y: minY, pressure: defaultPressure },
    { x: maxX, y: maxY, pressure: defaultPressure },
    { x: minX, y: maxY, pressure: defaultPressure },
    { x: minX, y: minY, pressure: defaultPressure },
  ]

  return {
    type: 'kanji-box',
    points: fittedPoints,
    bounds: calculateBounds(fittedPoints, 10),
    replacedStrokeIds: [s1.id, s2.id],
  }
}

/**
 * スナップ後のペン先ドラッグ座標に応じて図形（直線、円、四角形）を変形・リサイズする
 */
export function transformSnappedShape(
  shape: ShapeRecognitionResult,
  currentPoint: { x: number; y: number },
  initialPointer: { x: number; y: number }
): ShapeRecognitionResult {
  const defaultPressure = shape.points[0]?.pressure || 0.5

  if (shape.type === 'line') {
    // 直線: 始点を固定し、終点を現在ドラッグ座標に合わせて伸縮・回転
    const start = shape.points[0]
    const end = { x: currentPoint.x, y: currentPoint.y }
    const lineLength = Math.hypot(end.x - start.x, end.y - start.y)

    const steps = Math.max(6, Math.min(24, Math.floor(Math.max(lineLength, 15) / 15)))
    const fittedPoints: StrokePoint[] = []
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      fittedPoints.push({
        x: start.x + t * (end.x - start.x),
        y: start.y + t * (end.y - start.y),
        pressure: defaultPressure,
      })
    }

    return {
      type: 'line',
      points: fittedPoints,
      bounds: calculateBounds(fittedPoints, 10),
    }
  }

  if (shape.type === 'circle') {
    // 円: スナップ時の中心点を保持し、ペン先と中心の距離に応じて半径を動的リサイズ
    let sumX = 0
    let sumY = 0
    for (const p of shape.points) {
      sumX += p.x
      sumY += p.y
    }
    const cx = sumX / shape.points.length
    const cy = sumY / shape.points.length
    const newRadius = Math.max(8, Math.hypot(currentPoint.x - cx, currentPoint.y - cy))

    const segments = 36
    const fittedPoints: StrokePoint[] = []
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2
      fittedPoints.push({
        x: cx + newRadius * Math.cos(theta),
        y: cy + newRadius * Math.sin(theta),
        pressure: defaultPressure,
      })
    }

    return {
      type: 'circle',
      points: fittedPoints,
      bounds: calculateBounds(fittedPoints, 10),
    }
  }

  if (shape.type === 'rectangle' || shape.type === 'kanji-box') {
    // 四角形: スナップ発生時のペン位置に対向する角を固定アンカーとしてリサイズ
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    for (const p of shape.points) {
      if (p.x < minX) minX = p.x
      if (p.y < minY) minY = p.y
      if (p.x > maxX) maxX = p.x
      if (p.y > maxY) maxY = p.y
    }

    const anchorX = initialPointer.x >= (minX + maxX) / 2 ? minX : maxX
    const anchorY = initialPointer.y >= (minY + maxY) / 2 ? minY : maxY

    const newMinX = Math.min(anchorX, currentPoint.x)
    const newMaxX = Math.max(anchorX, currentPoint.x)
    const newMinY = Math.min(anchorY, currentPoint.y)
    const newMaxY = Math.max(anchorY, currentPoint.y)

    const fittedPoints: StrokePoint[] = [
      { x: newMinX, y: newMinY, pressure: defaultPressure },
      { x: newMaxX, y: newMinY, pressure: defaultPressure },
      { x: newMaxX, y: newMaxY, pressure: defaultPressure },
      { x: newMinX, y: newMaxY, pressure: defaultPressure },
      { x: newMinX, y: newMinY, pressure: defaultPressure },
    ]

    return {
      type: shape.type,
      points: fittedPoints,
      bounds: calculateBounds(fittedPoints, 10),
      replacedStrokeIds: shape.replacedStrokeIds,
    }
  }

  return shape
}

/**
 * ストロークのホールド時に幾何図形を自動認識する総合関数
 */
export function recognizeShape(
  currentPoints: StrokePoint[],
  recentStrokes: Stroke[] = []
): ShapeRecognitionResult | null {
  if (currentPoints.length < 4) return null

  const defaultPressure =
    currentPoints.reduce((acc, p) => acc + (p.pressure || 0.5), 0) / currentPoints.length

  // 1. 日本式「口」チェック（直前2ストロークとの結合）
  const kanjiResult = tryRecognizeKanjiBox(currentPoints, recentStrokes, defaultPressure)
  if (kanjiResult) return kanjiResult

  // 2. 円・楕円チェック（円は重心からの分散が非常に小さいため長方形より先に判定）
  const circleResult = tryRecognizeCircle(currentPoints, defaultPressure)
  if (circleResult) return circleResult

  // 3. 一筆書き長方形チェック
  const rectResult = tryRecognizeSingleStrokeRectangle(currentPoints, defaultPressure)
  if (rectResult) return rectResult

  // 4. 直線チェック
  const lineResult = tryRecognizeLine(currentPoints, defaultPressure)
  if (lineResult) return lineResult

  return null
}
