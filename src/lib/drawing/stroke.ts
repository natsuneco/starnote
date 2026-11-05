import { getStroke } from 'perfect-freehand'
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
 * perfect-freehand で計算された輪郭多角形から Path2D を作成する
 */
export function getStrokePath2D(
  points: StrokePoint[],
  size: number,
  isHighlighter = false
): Path2D {
  // perfect-freehand は [x, y, pressure] の配列を受け取る
  const inputPoints = points.map((p) => [p.x, p.y, p.pressure])

  const outline = getStroke(inputPoints, {
    size,
    thinning: isHighlighter ? 0.1 : 0.6,
    smoothing: 0.5,
    streamline: 0.55,
    easing: (t) => t,
    start: {
      cap: true,
      taper: isHighlighter ? 0 : size * 0.5,
    },
    end: {
      cap: true,
      taper: isHighlighter ? 0 : size * 0.5,
    },
  })

  const path = new Path2D()
  if (outline.length === 0) return path

  path.moveTo(outline[0][0], outline[0][1])
  for (let i = 1; i < outline.length; i++) {
    path.lineTo(outline[i][0], outline[i][1])
  }
  path.closePath()
  return path
}

/**
 * 単一ストロークを Canvas コンテキストに描画する
 */
export function renderStroke(ctx: CanvasRenderingContext2D, stroke: Stroke) {
  const isHighlighter = stroke.tool === 'highlighter'
  const path = getStrokePath2D(stroke.points, stroke.size, isHighlighter)

  ctx.save()
  if (isHighlighter) {
    // 蛍光ペンは乗算ブレンド + 半透明
    ctx.globalCompositeOperation = 'multiply'
    ctx.globalAlpha = 0.5
    ctx.fillStyle = stroke.color
  } else {
    ctx.globalCompositeOperation = 'source-over'
    ctx.globalAlpha = 1.0
    ctx.fillStyle = stroke.color
  }

  ctx.fill(path)
  ctx.restore()
}
