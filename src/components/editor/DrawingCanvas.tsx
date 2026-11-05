import React, { useRef, useEffect, useCallback } from 'react'
import type { Stroke, StrokePoint, StrokeTool, EraserMode } from '../../types/drawing'
import { calculateBounds, renderStroke, getStrokePath2D } from '../../lib/drawing/stroke'
import { eraseByStroke, eraseByPrecision } from '../../lib/drawing/eraser'

export interface DrawingCanvasProps {
  strokes: Stroke[]
  selectedTool: 'pen' | 'highlighter' | 'eraser' | 'lasso'
  selectedColor: string
  selectedSize: number
  eraserMode: EraserMode
  onAddStroke: (stroke: Stroke) => void
  onUpdateStrokes: (strokes: Stroke[]) => void
}

export const DrawingCanvas: React.FC<DrawingCanvasProps> = ({
  strokes,
  selectedTool,
  selectedColor,
  selectedSize,
  eraserMode,
  onAddStroke,
  onUpdateStrokes,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const staticCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const activeCanvasRef = useRef<HTMLCanvasElement | null>(null)

  // 最新の props を ref で保持（ネイティブイベントリスナーから常に最新値を参照）
  const propsRef = useRef({
    selectedTool,
    selectedColor,
    selectedSize,
    eraserMode,
    onAddStroke,
    onUpdateStrokes,
  })
  useEffect(() => {
    propsRef.current = {
      selectedTool,
      selectedColor,
      selectedSize,
      eraserMode,
      onAddStroke,
      onUpdateStrokes,
    }
  }, [selectedTool, selectedColor, selectedSize, eraserMode, onAddStroke, onUpdateStrokes])

  const isDrawingRef = useRef(false)
  const activePointerIdRef = useRef<number | null>(null)
  const activePointsRef = useRef<StrokePoint[]>([])
  const lastPointRef = useRef<StrokePoint | null>(null)
  const currentStrokesRef = useRef<Stroke[]>(strokes)
  const dimensionsRef = useRef<{ width: number; height: number; dpr: number }>({
    width: 0,
    height: 0,
    dpr: 1,
  })

  // 最新の strokes を同期
  useEffect(() => {
    currentStrokesRef.current = strokes
  }, [strokes])

  // 確定線 Canvas 全体の再描画
  const redrawStaticCanvas = useCallback(() => {
    const staticCanvas = staticCanvasRef.current
    if (!staticCanvas) return
    const ctx = staticCanvas.getContext('2d')
    if (!ctx) return

    const { width, height } = dimensionsRef.current
    if (width === 0 || height === 0) return

    ctx.clearRect(0, 0, width, height)

    for (const stroke of currentStrokesRef.current) {
      renderStroke(ctx, stroke)
    }
  }, [])

  // strokes 更新時の再描画
  useEffect(() => {
    redrawStaticCanvas()
  }, [strokes, redrawStaticCanvas])

  // Canvas 解像度のリサイズ・初期化処理
  const updateCanvasDimensions = useCallback(
    (width: number, height: number) => {
      const staticCanvas = staticCanvasRef.current
      const activeCanvas = activeCanvasRef.current
      if (!staticCanvas || !activeCanvas || width === 0 || height === 0) return

      const dpr = window.devicePixelRatio || 1
      dimensionsRef.current = { width, height, dpr }

      staticCanvas.width = Math.round(width * dpr)
      staticCanvas.height = Math.round(height * dpr)
      staticCanvas.style.width = `${width}px`
      staticCanvas.style.height = `${height}px`

      activeCanvas.width = Math.round(width * dpr)
      activeCanvas.height = Math.round(height * dpr)
      activeCanvas.style.width = `${width}px`
      activeCanvas.style.height = `${height}px`

      const staticCtx = staticCanvas.getContext('2d')
      if (staticCtx) {
        staticCtx.resetTransform?.()
        staticCtx.scale(dpr, dpr)
      }

      const activeCtx = activeCanvas.getContext('2d', { desynchronized: true })
      if (activeCtx) {
        activeCtx.resetTransform?.()
        activeCtx.scale(dpr, dpr)
      }

      redrawStaticCanvas()
    },
    [redrawStaticCanvas]
  )

  // ResizeObserver でコンテナサイズを確実に監視
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        if (width > 0 && height > 0) {
          updateCanvasDimensions(width, height)
        }
      }
    })

    observer.observe(container)

    const rect = container.getBoundingClientRect()
    if (rect.width > 0 && rect.height > 0) {
      updateCanvasDimensions(rect.width, rect.height)
    }

    return () => observer.disconnect()
  }, [updateCanvasDimensions])

  // 座標変換ヘルパー
  const getCanvasPointFromCoords = (
    clientX: number,
    clientY: number,
    pressure: number
  ): StrokePoint => {
    const container = containerRef.current
    if (!container) return { x: clientX, y: clientY, pressure: pressure > 0 ? pressure : 0.5 }
    const rect = container.getBoundingClientRect()
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
      pressure: pressure !== undefined && pressure > 0 ? pressure : 0.5,
    }
  }

  // アクティブストロークのコミット（確定線への転写＆状態追加）
  const commitActiveStroke = useCallback(() => {
    const points = activePointsRef.current
    const { selectedTool: toolName, selectedColor: color, selectedSize: size, onAddStroke: addStroke } =
      propsRef.current

    if (points.length >= 1 && (toolName === 'pen' || toolName === 'highlighter')) {
      const finalPoints =
        points.length === 1
          ? [points[0], { ...points[0], x: points[0].x + 0.1, y: points[0].y + 0.1 }]
          : points

      const tool: StrokeTool = toolName === 'highlighter' ? 'highlighter' : 'pen'
      const newStroke: Stroke = {
        id: `stroke-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        tool,
        color,
        size,
        points: finalPoints,
        bounds: calculateBounds(finalPoints, size),
        createdAt: Date.now(),
      }

      // 下層の確定 Canvas に直接転写
      const staticCanvas = staticCanvasRef.current
      if (staticCanvas) {
        const staticCtx = staticCanvas.getContext('2d')
        if (staticCtx) {
          renderStroke(staticCtx, newStroke)
        }
      }

      // 親へ通知
      addStroke(newStroke)
    }

    // 上層のアクティブ Canvas をクリア
    const activeCanvas = activeCanvasRef.current
    if (activeCanvas) {
      const activeCtx = activeCanvas.getContext('2d')
      if (activeCtx) {
        const { width, height } = dimensionsRef.current
        activeCtx.clearRect(0, 0, width, height)
      }
    }

    activePointsRef.current = []
    lastPointRef.current = null
  }, [])

  // --- ネイティブイベントリスナーの登録 ---
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // 1. iOS Safari のダブルタップズームや長押しメニューを完全に防止するための非 passive touch リスナー
    const handleTouchPrevent = (e: TouchEvent) => {
      // 描画面上でのブラウザ規定動作（ダブルタップ拡大、スクロール、長押しメニュー等）を確実に遮断
      if (e.cancelable) {
        e.preventDefault()
      }
    }

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault()
    }

    const handleDblClick = (e: MouseEvent) => {
      e.preventDefault()
    }

    container.addEventListener('touchstart', handleTouchPrevent, { passive: false })
    container.addEventListener('touchmove', handleTouchPrevent, { passive: false })
    container.addEventListener('touchend', handleTouchPrevent, { passive: false })
    container.addEventListener('touchcancel', handleTouchPrevent, { passive: false })
    container.addEventListener('contextmenu', handleContextMenu)
    container.addEventListener('dblclick', handleDblClick)

    // 2. ネイティブ Pointer イベントハンドラ
    const handleNativePointerDown = (e: PointerEvent) => {
      const { selectedTool: toolName, selectedColor: color, selectedSize: size, eraserMode: eMode, onUpdateStrokes: updateStrokes } =
        propsRef.current

      if (toolName === 'lasso') return

      if (e.cancelable) {
        e.preventDefault()
      }

      // 前のストロークが未確定であれば先に確定する（素早い連続ストローク対応）
      if (isDrawingRef.current && activePointsRef.current.length > 0) {
        commitActiveStroke()
      }

      activePointerIdRef.current = e.pointerId
      isDrawingRef.current = true

      try {
        container.setPointerCapture(e.pointerId)
      } catch {
        // noop
      }

      const pt = getCanvasPointFromCoords(e.clientX, e.clientY, e.pressure)
      lastPointRef.current = pt

      if (toolName === 'pen' || toolName === 'highlighter') {
        activePointsRef.current = [pt]

        // タップ時にも即座に点（ドット）を可視化
        const activeCanvas = activeCanvasRef.current
        if (activeCanvas) {
          const activeCtx = activeCanvas.getContext('2d')
          if (activeCtx) {
            const { width, height } = dimensionsRef.current
            activeCtx.clearRect(0, 0, width, height)
            const isHighlighter = toolName === 'highlighter'
            const previewPoints = [pt, { ...pt, x: pt.x + 0.1, y: pt.y + 0.1 }]
            const path = getStrokePath2D(previewPoints, size, isHighlighter)

            activeCtx.save()
            if (isHighlighter) {
              activeCtx.globalCompositeOperation = 'multiply'
              activeCtx.globalAlpha = 0.5
              activeCtx.fillStyle = color
            } else {
              activeCtx.globalCompositeOperation = 'source-over'
              activeCtx.globalAlpha = 1.0
              activeCtx.fillStyle = color
            }
            activeCtx.fill(path)
            activeCtx.restore()
          }
        }
      } else if (toolName === 'eraser') {
        if (eMode === 'stroke') {
          const next = eraseByStroke(currentStrokesRef.current, pt, pt, 20)
          if (next.length !== currentStrokesRef.current.length) {
            currentStrokesRef.current = next
            updateStrokes(next)
          }
        } else {
          const next = eraseByPrecision(currentStrokesRef.current, pt, 20)
          if (next.length !== currentStrokesRef.current.length) {
            currentStrokesRef.current = next
            updateStrokes(next)
          }
        }
      }
    }

    const handleNativePointerMove = (e: PointerEvent) => {
      if (!isDrawingRef.current || activePointerIdRef.current !== e.pointerId) return
      if (e.cancelable) {
        e.preventDefault()
      }

      const { selectedTool: toolName, selectedColor: color, selectedSize: size, eraserMode: eMode, onUpdateStrokes: updateStrokes } =
        propsRef.current

      const coalesced = typeof e.getCoalescedEvents === 'function' ? e.getCoalescedEvents() : []
      const pointsList: StrokePoint[] =
        coalesced.length > 0
          ? coalesced.map((ev) => getCanvasPointFromCoords(ev.clientX, ev.clientY, ev.pressure))
          : [getCanvasPointFromCoords(e.clientX, e.clientY, e.pressure)]

      if (toolName === 'pen' || toolName === 'highlighter') {
        for (const pt of pointsList) {
          activePointsRef.current.push(pt)
          lastPointRef.current = pt
        }

        const activeCanvas = activeCanvasRef.current
        if (!activeCanvas) return
        const activeCtx = activeCanvas.getContext('2d')
        if (!activeCtx) return

        const { width, height } = dimensionsRef.current
        activeCtx.clearRect(0, 0, width, height)

        const isHighlighter = toolName === 'highlighter'
        const path = getStrokePath2D(activePointsRef.current, size, isHighlighter)

        activeCtx.save()
        if (isHighlighter) {
          activeCtx.globalCompositeOperation = 'multiply'
          activeCtx.globalAlpha = 0.5
          activeCtx.fillStyle = color
        } else {
          activeCtx.globalCompositeOperation = 'source-over'
          activeCtx.globalAlpha = 1.0
          activeCtx.fillStyle = color
        }
        activeCtx.fill(path)
        activeCtx.restore()
      } else if (toolName === 'eraser') {
        let updated = false
        let current = currentStrokesRef.current

        for (const pt of pointsList) {
          const prev = lastPointRef.current || pt

          if (eMode === 'stroke') {
            const next = eraseByStroke(current, prev, pt, 20)
            if (next.length !== current.length) {
              current = next
              updated = true
            }
          } else {
            const next = eraseByPrecision(current, pt, 20)
            if (next.length !== current.length) {
              current = next
              updated = true
            }
          }
          lastPointRef.current = pt
        }

        if (updated) {
          currentStrokesRef.current = current
          updateStrokes(current)
        }
      }
    }

    const handleNativePointerEnd = (e: PointerEvent) => {
      if (!isDrawingRef.current || activePointerIdRef.current !== e.pointerId) return
      isDrawingRef.current = false
      activePointerIdRef.current = null

      if (e.cancelable) {
        e.preventDefault()
      }

      try {
        container.releasePointerCapture(e.pointerId)
      } catch {
        // noop
      }

      // ストロークを確定
      commitActiveStroke()
    }

    container.addEventListener('pointerdown', handleNativePointerDown, { passive: false })
    container.addEventListener('pointermove', handleNativePointerMove, { passive: false })
    container.addEventListener('pointerup', handleNativePointerEnd, { passive: false })
    container.addEventListener('pointercancel', handleNativePointerEnd, { passive: false })

    return () => {
      container.removeEventListener('touchstart', handleTouchPrevent)
      container.removeEventListener('touchmove', handleTouchPrevent)
      container.removeEventListener('touchend', handleTouchPrevent)
      container.removeEventListener('touchcancel', handleTouchPrevent)
      container.removeEventListener('contextmenu', handleContextMenu)
      container.removeEventListener('dblclick', handleDblClick)

      container.removeEventListener('pointerdown', handleNativePointerDown)
      container.removeEventListener('pointermove', handleNativePointerMove)
      container.removeEventListener('pointerup', handleNativePointerEnd)
      container.removeEventListener('pointercancel', handleNativePointerEnd)
    }
  }, [commitActiveStroke])

  return (
    <div
      ref={containerRef}
      className="canvas-interactive absolute inset-0 w-full h-full overflow-hidden select-none cursor-crosshair"
      style={{ touchAction: 'none' }}
    >
      {/* 下層: 確定線 Canvas (静的キャッシュ) */}
      <canvas
        ref={staticCanvasRef}
        className="absolute inset-0 block pointer-events-none"
      />

      {/* 上層: 描画中ストローク Canvas (低遅延) */}
      <canvas
        ref={activeCanvasRef}
        className="absolute inset-0 block pointer-events-none"
      />
    </div>
  )
}
