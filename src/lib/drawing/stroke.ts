import type { Stroke, StrokePoint, Bounds } from '../../types/drawing'

export function calculateBounds(points: StrokePoint[], size: number): Bounds {
  if (points.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 }
  }

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

  const padding = size * 1.5
  return {
    minX: minX - padding,
    minY: minY - padding,
    maxX: maxX + padding,
    maxY: maxY + padding,
  }
}

/**
 * ストロークの線経路を表す Path2D を作成する
 */
export function getStrokePath2D(
  points: StrokePoint[],
  size: number,
  _isHighlighter = false
): Path2D {
  const path = new Path2D()
  if (points.length === 0) return path

  if (points.length === 1) {
    // 1点のみのタップ・ドット
    path.arc(points[0].x, points[0].y, size / 2, 0, Math.PI * 2)
    return path
  }

  path.moveTo(points[0].x, points[0].y)
  for (let i = 1; i < points.length; i++) {
    path.lineTo(points[i].x, points[i].y)
  }
  return path
}

/**
 * 単一ストロークを Canvas コンテキストに丸ペン（ボールペン）として描画する
 */
export function renderStroke(ctx: CanvasRenderingContext2D, stroke: Stroke) {
  const { points, size, color, tool } = stroke
  if (!points || points.length === 0) return

  const isHighlighter = tool === 'highlighter'

  ctx.save()
  if (isHighlighter) {
    // 蛍光ペンは乗算ブレンド + 半透明
    ctx.globalCompositeOperation = 'multiply'
    ctx.globalAlpha = 0.5
    ctx.fillStyle = color
    ctx.strokeStyle = color
  } else {
    ctx.globalCompositeOperation = 'source-over'
    ctx.globalAlpha = 1.0
    ctx.fillStyle = color
    ctx.strokeStyle = color
  }

  if (points.length === 1) {
    // 単一タップ: 正円ドット（半径 size / 2）
    ctx.beginPath()
    ctx.arc(points[0].x, points[0].y, size / 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
    return
  }

  // 複数点ストローク: 均一な丸ペン線（Round Cap & Join）
  ctx.lineWidth = size
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  ctx.beginPath()
  ctx.moveTo(points[0].x, points[0].y)
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y)
  }
  ctx.stroke()
  ctx.restore()
}

/**
 * 差分描画用: タップまたは書き始めの1点を高速に描画する
 */
export function renderDot(
  ctx: CanvasRenderingContext2D,
  point: StrokePoint,
  size: number,
  color: string,
  isHighlighter = false
) {
  ctx.save()
  if (isHighlighter) {
    ctx.globalCompositeOperation = 'multiply'
    ctx.globalAlpha = 0.5
    ctx.fillStyle = color
  } else {
    ctx.globalCompositeOperation = 'source-over'
    ctx.globalAlpha = 1.0
    ctx.fillStyle = color
  }

  ctx.beginPath()
  ctx.arc(point.x, point.y, size / 2, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

/**
 * 差分描画用: 2点間をつなぐ最新セグメントを直接追記描画する (O(1))
 */
export function renderIncrementalSegment(
  ctx: CanvasRenderingContext2D,
  p1: StrokePoint,
  p2: StrokePoint,
  size: number,
  color: string,
  isHighlighter = false
) {
  ctx.save()
  if (isHighlighter) {
    ctx.globalCompositeOperation = 'multiply'
    ctx.globalAlpha = 0.5
    ctx.strokeStyle = color
  } else {
    ctx.globalCompositeOperation = 'source-over'
    ctx.globalAlpha = 1.0
    ctx.strokeStyle = color
  }

  ctx.lineWidth = size
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  ctx.beginPath()
  ctx.moveTo(p1.x, p1.y)
  ctx.lineTo(p2.x, p2.y)
  ctx.stroke()
  ctx.restore()
}

