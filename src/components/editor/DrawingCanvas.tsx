import React, { useRef, useEffect, useState, useCallback } from 'react'
import type { Stroke, StrokePoint, StrokeTool, EraserMode } from '../../types/drawing'
import {
  calculateBounds,
  renderStroke,
  getStrokePath2D,
  renderDot,
  renderIncrementalSegment,
} from '../../lib/drawing/stroke'
import { predictNextPoint } from '../../lib/drawing/prediction'
import { eraseByStroke, eraseByPrecision } from '../../lib/drawing/eraser'
import { isScribbleStroke, getScribbleEraseTargets } from '../../lib/gesture/scribble'
import { recognizeShape, type ShapeRecognitionResult, transformSnappedShape } from '../../lib/gesture/shapes'
import {
  isClosedLoop,
  isPointNearContour,
  findStrokesInLasso,
  getSelectionBounds,
  isPointInSelection,
} from '../../lib/gesture/lasso'
import { Trash2, X } from 'lucide-react'
import { BASE_PAGE_WIDTH } from '../../lib/template/templateConstants'

export interface DrawingCanvasProps {
  strokes: Stroke[]
  selectedTool: 'pen' | 'highlighter' | 'eraser' | 'lasso'
  selectedColor: string
  selectedSize: number
  eraserMode: EraserMode
  allowFingerDrawing?: boolean
  onAddStroke: (stroke: Stroke) => void
  onUpdateStrokes: (strokes: Stroke[]) => void
  onUndo?: () => void
  onRedo?: () => void
  onPinchZoom?: (
    scaleFactor: number,
    focalPoint: { x: number; y: number },
    deltaX: number,
    deltaY: number
  ) => void
  onPan?: (deltaX: number, deltaY: number) => void
}

export const DrawingCanvas: React.FC<DrawingCanvasProps> = ({
  strokes,
  selectedTool,
  selectedColor,
  selectedSize,
  eraserMode,
  allowFingerDrawing = true,
  onAddStroke,
  onUpdateStrokes,
  onUndo,
  onRedo,
  onPinchZoom,
  onPan,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const staticCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const activeCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const predictiveCanvasRef = useRef<HTMLCanvasElement | null>(null)

  // なげなわ選択状態
  const [selectedStrokeIds, setSelectedStrokeIds] = useState<string[]>([])
  const selectedStrokeIdsRef = useRef<string[]>([])
  useEffect(() => {
    selectedStrokeIdsRef.current = selectedStrokeIds
  }, [selectedStrokeIds])

  // 最新の props を ref で保持
  const propsRef = useRef({
    selectedTool,
    selectedColor,
    selectedSize,
    eraserMode,
    allowFingerDrawing,
    onAddStroke,
    onUpdateStrokes,
    onUndo,
    onRedo,
    onPinchZoom,
    onPan,
  })
  useEffect(() => {
    propsRef.current = {
      selectedTool,
      selectedColor,
      selectedSize,
      eraserMode,
      allowFingerDrawing,
      onAddStroke,
      onUpdateStrokes,
      onUndo,
      onRedo,
      onPinchZoom,
      onPan,
    }
  }, [
    selectedTool,
    selectedColor,
    selectedSize,
    eraserMode,
    allowFingerDrawing,
    onAddStroke,
    onUpdateStrokes,
    onUndo,
    onRedo,
    onPinchZoom,
    onPan,
  ])

  const isDrawingRef = useRef(false)
  const activePointerIdRef = useRef<number | null>(null)
  const activePointerTypeRef = useRef<string | null>(null)
  const activePointsRef = useRef<StrokePoint[]>([])
  const lastDrawnPointRef = useRef<StrokePoint | null>(null)
  const currentStrokesRef = useRef<Stroke[]>(strokes)
  const dimensionsRef = useRef<{ width: number; height: number; dpr: number }>({
    width: 0,
    height: 0,
    dpr: 1,
  })

  // 1本指パン（指描画OFF時）追跡
  const singleTouchPanRef = useRef<{ x: number; y: number } | null>(null)

  // マルチタッチジェスチャ（Undo/Redoタップ & ピンチズーム）管理
  const multiTouchStateRef = useRef<{
    activeFingerCount: number
    startTime: number
    hasMoved: boolean
    startPositions: Array<{ x: number; y: number }>
    initialDistance: number
    lastDistance: number
    lastCenter: { x: number; y: number }
    startCenter: { x: number; y: number }
  }>({
    activeFingerCount: 0,
    startTime: 0,
    hasMoved: false,
    startPositions: [],
    initialDistance: 0,
    lastDistance: 0,
    lastCenter: { x: 0, y: 0 },
    startCenter: { x: 0, y: 0 },
  })

  // ジェスチャー関連の ref
  // 1. 直前の閉ループストローク（輪郭ホールド判定用）
  const candidateLoopRef = useRef<{ strokeId: string; points: StrokePoint[] } | null>(null)
  // 2. 輪郭ホールドタイマー
  const contourHoldTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const contourHoldAnchorRef = useRef<{ x: number; y: number } | null>(null)
  // 3. 図形スナップ用ホールドタイマー
  const shapeHoldTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const shapeHoldAnchorRef = useRef<{ x: number; y: number } | null>(null)
  const snappedShapeRef = useRef<ShapeRecognitionResult | null>(null)
  const snappedShapeInitialRef = useRef<{
    shape: ShapeRecognitionResult
    initialPointer: { x: number; y: number }
  } | null>(null)
  // 4. なげなわ選択中のドラッグ操作
  const isDraggingSelectionRef = useRef(false)
  const dragStartPointRef = useRef<{ x: number; y: number } | null>(null)
  const dragDeltaRef = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 })

  // 最新の strokes を同期
  useEffect(() => {
    currentStrokesRef.current = strokes
  }, [strokes])

  // 確定線 Canvas 全体の再描画
  const redrawStaticCanvas = useCallback((excludeIds: string[] = []) => {
    const staticCanvas = staticCanvasRef.current
    if (!staticCanvas) return
    const ctx = staticCanvas.getContext('2d')
    if (!ctx) return

    ctx.save()
    ctx.resetTransform()
    ctx.clearRect(0, 0, staticCanvas.width, staticCanvas.height)
    ctx.restore()

    for (const stroke of currentStrokesRef.current) {
      if (!excludeIds.includes(stroke.id)) {
        renderStroke(ctx, stroke)
      }
    }
  }, [])

  // strokes 更新時の再描画
  useEffect(() => {
    redrawStaticCanvas()
  }, [strokes, redrawStaticCanvas])

  // Canvas 解像度のリサイズ・初期化処理（用紙の実寸拡大に連動した High-DPI ベクタースケーリング）
  const updateCanvasDimensions = useCallback(
    (width: number, height: number) => {
      const staticCanvas = staticCanvasRef.current
      const activeCanvas = activeCanvasRef.current
      const predictiveCanvas = predictiveCanvasRef.current
      if (!staticCanvas || !activeCanvas || !predictiveCanvas || width === 0 || height === 0) return

      const dpr = window.devicePixelRatio || 1
      // iPad Safari の Canvas テクスチャ上限（長辺 4096px）に対する安全装置
      const maxDim = Math.max(width, height) * dpr
      const safeDpr = maxDim > 4096 ? dpr * (4096 / maxDim) : dpr

      dimensionsRef.current = { width, height, dpr: safeDpr }

      // 基準幅（840px）に対する現在の用紙実寸比率
      const baseScale = width / BASE_PAGE_WIDTH

      const canvases = [staticCanvas, activeCanvas, predictiveCanvas]
      for (const c of canvases) {
        const pixelW = Math.round(width * safeDpr)
        const pixelH = Math.round(height * safeDpr)

        if (c.width !== pixelW || c.height !== pixelH) {
          c.width = pixelW
          c.height = pixelH
        }
        c.style.width = `${width}px`
        c.style.height = `${height}px`

        const ctx = c.getContext('2d', c === staticCanvas ? undefined : { desynchronized: true })
        if (ctx) {
          // 基準座標系（0 〜 840）から現在の画面サイズへのマトリックス変換
          ctx.setTransform(safeDpr * baseScale, 0, 0, safeDpr * baseScale, 0, 0)
        }
      }

      redrawStaticCanvas()
    },
    [redrawStaticCanvas]
  )

  // ResizeObserver でコンテナサイズ（ズーム連動の実寸サイズ）を監視
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

  // 座標変換ヘルパー（現在の用紙実寸から基準座標系 BASE_PAGE_WIDTH に正規化）
  const getCanvasPointFromCoords = (
    clientX: number,
    clientY: number,
    pressure: number
  ): StrokePoint => {
    const container = containerRef.current
    if (!container) return { x: clientX, y: clientY, pressure: pressure > 0 ? pressure : 0.5 }
    const rect = container.getBoundingClientRect()
    // 用紙の現在幅と基準幅 840px の比率で割ることで、基準座標系（0 〜 840）に正規化
    const scale = rect.width > 0 ? rect.width / BASE_PAGE_WIDTH : 1
    return {
      x: (clientX - rect.left) / scale,
      y: (clientY - rect.top) / scale,
      pressure: pressure !== undefined && pressure > 0 ? pressure : 0.5,
    }
  }

  // ホールドタイマーのクリア
  const clearShapeHoldTimer = () => {
    if (shapeHoldTimerRef.current) {
      clearTimeout(shapeHoldTimerRef.current)
      shapeHoldTimerRef.current = null
    }
    shapeHoldAnchorRef.current = null
  }

  const clearContourHoldTimer = () => {
    if (contourHoldTimerRef.current) {
      clearTimeout(contourHoldTimerRef.current)
      contourHoldTimerRef.current = null
    }
    contourHoldAnchorRef.current = null
  }

  // 予測・オーバーレイCanvasをクリア
  const clearPredictiveCanvas = useCallback(() => {
    const predictiveCanvas = predictiveCanvasRef.current
    if (!predictiveCanvas) return
    const ctx = predictiveCanvas.getContext('2d')
    if (!ctx) return
    ctx.save()
    ctx.resetTransform()
    ctx.clearRect(0, 0, predictiveCanvas.width, predictiveCanvas.height)
    ctx.restore()
  }, [])

  // アクティブCanvas（差分描画）をクリア
  const clearActiveCanvas = useCallback(() => {
    const activeCanvas = activeCanvasRef.current
    if (!activeCanvas) return
    const ctx = activeCanvas.getContext('2d')
    if (!ctx) return
    ctx.save()
    ctx.resetTransform()
    ctx.clearRect(0, 0, activeCanvas.width, activeCanvas.height)
    ctx.restore()
  }, [])

  // スナップ図形のプレビュー描画
  const renderSnappedShapePreview = useCallback(
    (shape: ShapeRecognitionResult) => {
      // 差分描画層をクリアし、スナッププレビューをオーバーレイ層に描画
      clearActiveCanvas()

      const predictiveCanvas = predictiveCanvasRef.current
      if (!predictiveCanvas) return
      const ctx = predictiveCanvas.getContext('2d')
      if (!ctx) return

      const { width, height } = dimensionsRef.current
      ctx.clearRect(0, 0, width, height)

      const { selectedTool: toolName, selectedColor: color, selectedSize: size } = propsRef.current
      const isHighlighter = toolName === 'highlighter'
      const path = getStrokePath2D(shape.points, size, isHighlighter)

      ctx.save()
      if (isHighlighter) {
        ctx.globalCompositeOperation = 'multiply'
        ctx.globalAlpha = 0.5
        ctx.strokeStyle = color
        ctx.fillStyle = color
      } else {
        ctx.globalCompositeOperation = 'source-over'
        ctx.globalAlpha = 1.0
        ctx.strokeStyle = color
        ctx.fillStyle = color
      }

      ctx.lineWidth = size
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.stroke(path)

      // スナップ時の視覚的アクセント（青い破線ハイライト）
      ctx.strokeStyle = '#3b82f6'
      ctx.lineWidth = 1.5
      ctx.setLineDash([4, 4])
      ctx.stroke(path)
      ctx.restore()
    },
    [clearActiveCanvas]
  )

  // アクティブストロークの確定コミット（ペン離脱時に perfect-freehand で高精度清書）
  const commitActiveStroke = useCallback(() => {
    clearShapeHoldTimer()
    clearContourHoldTimer()
    clearPredictiveCanvas()

    const points = activePointsRef.current
    const snapped = snappedShapeRef.current
    const { selectedTool: toolName, selectedColor: color, selectedSize: size, onAddStroke: addStroke, onUpdateStrokes: updateStrokes } =
      propsRef.current

    if (snapped) {
      // スナップ図形が確定された場合
      let current = currentStrokesRef.current
      if (snapped.replacedStrokeIds && snapped.replacedStrokeIds.length > 0) {
        // 日本式「口」などで以前のストロークを置換
        current = current.filter((s) => !snapped.replacedStrokeIds?.includes(s.id))
        currentStrokesRef.current = current
        updateStrokes(current)
      }

      const tool: StrokeTool = toolName === 'highlighter' ? 'highlighter' : 'pen'
      const newStroke: Stroke = {
        id: `stroke-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        tool,
        color,
        size,
        points: snapped.points,
        bounds: snapped.bounds,
        createdAt: Date.now(),
      }

      addStroke(newStroke)
      snappedShapeRef.current = null
      snappedShapeInitialRef.current = null
    } else if (points.length >= 1 && (toolName === 'pen' || toolName === 'highlighter')) {
      const tool: StrokeTool = toolName === 'highlighter' ? 'highlighter' : 'pen'
      const newStroke: Stroke = {
        id: `stroke-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        tool,
        color,
        size,
        points: [...points],
        bounds: calculateBounds(points, size),
        createdAt: Date.now(),
      }

      // 閉ループか判定（輪郭ホールド選択候補として記録）
      if (isClosedLoop(points)) {
        candidateLoopRef.current = { strokeId: newStroke.id, points: [...points] }
      } else {
        candidateLoopRef.current = null
      }

      // 下層の確定線 Canvas に直接転写（丸ペンによる均一ストローク）
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

    // 中層・上層のアクティブCanvasを完全クリア
    clearActiveCanvas()
    activePointsRef.current = []
    lastDrawnPointRef.current = null
  }, [clearActiveCanvas, clearPredictiveCanvas])

  // 選択中のストロークを削除
  const handleDeleteSelected = () => {
    if (selectedStrokeIds.length === 0) return
    const next = currentStrokesRef.current.filter((s) => !selectedStrokeIds.includes(s.id))
    currentStrokesRef.current = next
    propsRef.current.onUpdateStrokes(next)
    setSelectedStrokeIds([])
    redrawStaticCanvas()
  }

  // 選択解除
  const handleClearSelection = () => {
    setSelectedStrokeIds([])
    redrawStaticCanvas()
  }

  // --- ネイティブイベントリスナーの登録 ---
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleTouchStart = (e: TouchEvent) => {
      // なげなわアクションバーやUI要素のタッチ操作は早期リターン（描画・パンを抑止しない）
      const target = e.target as HTMLElement | null
      if (target && target.closest('[data-lasso-action-bar]')) {
        return
      }

      // 1. スタイラス（Apple Pencil）のタッチが含まれるか判定
      let isStylus = false
      for (let i = 0; i < e.touches.length; i++) {
        const touch = e.touches[i] as unknown as { touchType?: string }
        if (touch.touchType === 'stylus') {
          isStylus = true
          break
        }
      }

      if (isStylus || activePointerTypeRef.current === 'pen') {
        if (e.cancelable) {
          e.preventDefault()
        }
        return
      }

      // 2. マルチタッチ（2本指・3本指）の開始検出
      if (e.touches.length >= 2) {
        singleTouchPanRef.current = null

        // 直前の1本指ドット等の誤描画があれば即座にクリア
        if (activePointsRef.current.length > 0) {
          activePointsRef.current = []
          isDrawingRef.current = false
          activePointerIdRef.current = null
          clearActiveCanvas()
          clearPredictiveCanvas()
        }

        let dist = 0
        let center = { x: 0, y: 0 }
        if (e.touches.length >= 2) {
          const p1 = { x: e.touches[0].clientX, y: e.touches[0].clientY }
          const p2 = { x: e.touches[1].clientX, y: e.touches[1].clientY }
          dist = Math.hypot(p2.x - p1.x, p2.y - p1.y)
          center = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 }
        }

        multiTouchStateRef.current = {
          activeFingerCount: e.touches.length,
          startTime: performance.now(),
          hasMoved: false,
          startPositions: Array.from(e.touches).map((t) => ({ x: t.clientX, y: t.clientY })),
          initialDistance: dist,
          lastDistance: dist,
          lastCenter: center,
          startCenter: center,
        }

        if (e.cancelable) {
          e.preventDefault()
        }
        return
      }

      // 3. 1本指の場合
      if (!propsRef.current.allowFingerDrawing) {
        // 指描画OFF時は1本指パンの開始点を記録
        singleTouchPanRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
        if (e.cancelable) {
          e.preventDefault()
        }
        return
      }

      singleTouchPanRef.current = null
      if (e.cancelable) {
        e.preventDefault()
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      // スタイラス描画中
      if (activePointerTypeRef.current === 'pen') {
        if (e.cancelable) {
          e.preventDefault()
        }
        return
      }

      const state = multiTouchStateRef.current

      // 2本指ピンチズーム & パンの処理
      if (e.touches.length === 2) {
        const p1 = { x: e.touches[0].clientX, y: e.touches[0].clientY }
        const p2 = { x: e.touches[1].clientX, y: e.touches[1].clientY }
        const currentDist = Math.hypot(p2.x - p1.x, p2.y - p1.y)
        const currentCenter = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 }

        const deltaX = currentCenter.x - state.lastCenter.x
        const deltaY = currentCenter.y - state.lastCenter.y

        // 開始位置からの総移動量または指間距離の変化でジェスチャ移動を判定（タップ誤認防止）
        const totalMove = Math.hypot(
          currentCenter.x - state.startCenter.x,
          currentCenter.y - state.startCenter.y
        )
        const totalDistDiff = Math.abs(currentDist - state.initialDistance)
        if (totalMove > 8 || totalDistDiff > 8) {
          state.hasMoved = true
        }

        if (state.lastDistance > 0 && propsRef.current.onPinchZoom) {
          const scaleDelta = currentDist / state.lastDistance
          if (scaleDelta > 0.5 && scaleDelta < 2.0) {
            propsRef.current.onPinchZoom(scaleDelta, currentCenter, deltaX, deltaY)
          }
        }
        state.lastDistance = currentDist
        state.lastCenter = currentCenter

        if (e.cancelable) {
          e.preventDefault()
        }
        return
      }

      // 3本指の場合の移動監視
      if (e.touches.length === 3) {
        state.hasMoved = true
        if (e.cancelable) {
          e.preventDefault()
        }
        return
      }

      // 1本指の場合
      if (!propsRef.current.allowFingerDrawing) {
        // 指描画OFF時の1本指パン処理
        if (singleTouchPanRef.current) {
          const dx = e.touches[0].clientX - singleTouchPanRef.current.x
          const dy = e.touches[0].clientY - singleTouchPanRef.current.y
          if (dx !== 0 || dy !== 0) {
            propsRef.current.onPan?.(dx, dy)
            singleTouchPanRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
          }
        }
        if (e.cancelable) {
          e.preventDefault()
        }
        return
      }

      if (e.cancelable) {
        e.preventDefault()
      }
    }

    const handleTouchEnd = (e: TouchEvent) => {
      if (activePointerTypeRef.current === 'pen') {
        if (e.cancelable) {
          e.preventDefault()
        }
        return
      }

      // すべての指が離れた瞬間にタップ判定
      if (e.touches.length === 0) {
        singleTouchPanRef.current = null
        const state = multiTouchStateRef.current
        if (state.activeFingerCount >= 2 && !state.hasMoved) {
          const elapsed = performance.now() - state.startTime
          if (elapsed < 350) {
            if (state.activeFingerCount === 2) {
              propsRef.current.onUndo?.()
            } else if (state.activeFingerCount === 3) {
              propsRef.current.onRedo?.()
            }
          }
        }
        state.activeFingerCount = 0
        state.hasMoved = false
      }

      if (!propsRef.current.allowFingerDrawing) {
        if (e.cancelable) {
          e.preventDefault()
        }
        return
      }

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

    container.addEventListener('touchstart', handleTouchStart, { passive: false })
    container.addEventListener('touchmove', handleTouchMove, { passive: false })
    container.addEventListener('touchend', handleTouchEnd, { passive: false })
    container.addEventListener('touchcancel', handleTouchEnd, { passive: false })
    container.addEventListener('contextmenu', handleContextMenu)
    container.addEventListener('dblclick', handleDblClick)

    // ポインタ押下イベント
    const handleNativePointerDown = (e: PointerEvent) => {
      // なげなわアクションバーやUI要素の操作は早期リターン（描画セッション開始・選択解除・ポインター強奪を抑止）
      const target = e.target as HTMLElement | null
      if (target && target.closest('[data-lasso-action-bar]')) {
        return
      }

      const {
        selectedTool: toolName,
        selectedColor: color,
        selectedSize: size,
        eraserMode: eMode,
        allowFingerDrawing: allowFinger,
        onUpdateStrokes: updateStrokes,
      } = propsRef.current

      // マルチタッチ操作中（2本指・3本指）の場合は描画を開始しない
      if (multiTouchStateRef.current.activeFingerCount >= 2 && e.pointerType === 'touch') {
        activePointerTypeRef.current = null
        return
      }

      // 指で描画が無効で、かつポインターが指（touch）の場合は描画セッションを開始しない
      if (!allowFinger && e.pointerType === 'touch') {
        activePointerTypeRef.current = null
        return
      }

      activePointerTypeRef.current = e.pointerType

      if (e.cancelable) {
        e.preventDefault()
      }

      const pt = getCanvasPointFromCoords(e.clientX, e.clientY, e.pressure)
      activePointerIdRef.current = e.pointerId
      isDrawingRef.current = true

      try {
        container.setPointerCapture(e.pointerId)
      } catch {
        // noop
      }

      // A. なげなわ選択中の場合: ドラッグ判定または選択解除
      const currentSelectedIds = selectedStrokeIdsRef.current
      if (currentSelectedIds.length > 0) {
        const selectedStrokes = currentStrokesRef.current.filter((s) =>
          currentSelectedIds.includes(s.id)
        )
        const selBounds = getSelectionBounds(selectedStrokes)

        if (isPointInSelection(pt, selectedStrokes, selBounds)) {
          isDraggingSelectionRef.current = true
          dragStartPointRef.current = pt
          dragDeltaRef.current = { dx: 0, dy: 0 }
          return
        } else {
          // 選択領域外タップで選択解除
          setSelectedStrokeIds([])
        }
      }

      // B. 丸囲み輪郭ホールド選択の判定
      if (candidateLoopRef.current && (toolName === 'pen' || toolName === 'highlighter')) {
        const loop = candidateLoopRef.current
        if (isPointNearContour(pt, loop.points, 25)) {
          contourHoldAnchorRef.current = { x: pt.x, y: pt.y }
          contourHoldTimerRef.current = setTimeout(() => {
            const remaining = currentStrokesRef.current.filter((s) => s.id !== loop.strokeId)
            currentStrokesRef.current = remaining
            updateStrokes(remaining)

            const enclosed = findStrokesInLasso(remaining, loop.points)
            if (enclosed.length > 0) {
              const ids = enclosed.map((s) => s.id)
              setSelectedStrokeIds(ids)
              isDraggingSelectionRef.current = true
              dragStartPointRef.current = pt
              dragDeltaRef.current = { dx: 0, dy: 0 }
            }

            candidateLoopRef.current = null
            activePointsRef.current = []
            clearActiveCanvas()
            clearPredictiveCanvas()
          }, 750)
        }
      }

      // 前のストロークが未確定であれば確定
      if (activePointsRef.current.length > 0) {
        commitActiveStroke()
      }

      snappedShapeRef.current = null
      snappedShapeInitialRef.current = null
      clearActiveCanvas()
      clearPredictiveCanvas()

      if (toolName === 'pen' || toolName === 'highlighter') {
        activePointsRef.current = [pt]
        lastDrawnPointRef.current = pt

        // タップ直後の初期点（ドット）を即座に描画
        const activeCanvas = activeCanvasRef.current
        if (activeCanvas) {
          const activeCtx = activeCanvas.getContext('2d')
          if (activeCtx) {
            renderDot(activeCtx, pt, size, color, toolName === 'highlighter')
          }
        }

        // 図形認識ホールドタイマーの開始準備
        shapeHoldAnchorRef.current = { x: pt.x, y: pt.y }
      } else if (toolName === 'lasso') {
        activePointsRef.current = [pt]
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

    // ポインタ移動イベント（超高速インクリメンタル描画 ＋ 先行予測）
    const handleNativePointerMove = (e: PointerEvent) => {
      if (!isDrawingRef.current || activePointerIdRef.current !== e.pointerId) return
      if (e.cancelable) {
        e.preventDefault()
      }

      const { selectedTool: toolName, selectedColor: color, selectedSize: size, eraserMode: eMode, onUpdateStrokes: updateStrokes } = propsRef.current

      const coalesced = typeof e.getCoalescedEvents === 'function' ? e.getCoalescedEvents() : []
      const pointsList: StrokePoint[] =
        coalesced.length > 0
          ? coalesced.map((ev) => getCanvasPointFromCoords(ev.clientX, ev.clientY, ev.pressure))
          : [getCanvasPointFromCoords(e.clientX, e.clientY, e.pressure)]

      const latestPt = pointsList[pointsList.length - 1]

      // A. なげなわ選択ストロークのドラッグ移動中
      if (isDraggingSelectionRef.current && dragStartPointRef.current) {
        const dx = latestPt.x - dragStartPointRef.current.x
        const dy = latestPt.y - dragStartPointRef.current.y
        dragDeltaRef.current = { dx, dy }

        const predictiveCanvas = predictiveCanvasRef.current
        if (predictiveCanvas) {
          const ctx = predictiveCanvas.getContext('2d')
          if (ctx) {
            ctx.save()
            ctx.resetTransform()
            ctx.clearRect(0, 0, predictiveCanvas.width, predictiveCanvas.height)
            ctx.restore()

            const currentSelectedIds = selectedStrokeIdsRef.current
            const selected = currentStrokesRef.current.filter((s) =>
              currentSelectedIds.includes(s.id)
            )

            redrawStaticCanvas(currentSelectedIds)

            ctx.save()
            ctx.translate(dx, dy)
            for (const s of selected) {
              renderStroke(ctx, s)
            }
            ctx.restore()
          }
        }
        return
      }

      // B. 輪郭ホールドの監視（半径 12px を超えたらキャンセル）
      if (contourHoldAnchorRef.current) {
        const d = Math.hypot(
          latestPt.x - contourHoldAnchorRef.current.x,
          latestPt.y - contourHoldAnchorRef.current.y
        )
        if (d > 12) {
          clearContourHoldTimer()
        }
      }

      // C. なげなわツールによる手動囲み
      if (toolName === 'lasso') {
        for (const pt of pointsList) {
          activePointsRef.current.push(pt)
        }

        const predictiveCanvas = predictiveCanvasRef.current
        if (predictiveCanvas) {
          const ctx = predictiveCanvas.getContext('2d')
          if (ctx) {
            const { width, height } = dimensionsRef.current
            ctx.clearRect(0, 0, width, height)

            const pts = activePointsRef.current
            if (pts.length > 1) {
              ctx.save()
              ctx.strokeStyle = '#3b82f6'
              ctx.lineWidth = 2
              ctx.setLineDash([6, 6])
              ctx.beginPath()
              ctx.moveTo(pts[0].x, pts[0].y)
              for (let i = 1; i < pts.length; i++) {
                ctx.lineTo(pts[i].x, pts[i].y)
              }
              ctx.stroke()
              ctx.restore()
            }
          }
        }
        return
      }

      // D. ペン・蛍光ペンの超高速差分追記描画 (O(1)) ＋ ペン先予測
      if (toolName === 'pen' || toolName === 'highlighter') {
        const latestPt = pointsList[pointsList.length - 1]

        // 1. スナップ図形が既に存在する場合: ペン先ドラッグによる動的リサイズ・変形
        if (snappedShapeRef.current && snappedShapeInitialRef.current) {
          const transformed = transformSnappedShape(
            snappedShapeInitialRef.current.shape,
            latestPt,
            snappedShapeInitialRef.current.initialPointer
          )
          snappedShapeRef.current = transformed
          renderSnappedShapePreview(transformed)
          return
        }

        const activeCanvas = activeCanvasRef.current
        const activeCtx = activeCanvas?.getContext('2d')
        const isHighlighter = toolName === 'highlighter'

        // 2. 各点を差分追記（clearRectなし！過去点への再計算なし！）
        if (activeCtx) {
          for (const pt of pointsList) {
            const prev = lastDrawnPointRef.current || pt
            renderIncrementalSegment(activeCtx, prev, pt, size, color, isHighlighter)
            activePointsRef.current.push(pt)
            lastDrawnPointRef.current = pt
          }
        }

        // 3. ペン先予測インクの描画（最上層の predictiveCanvas に先端セグメントのみ瞬時に描画）
        const predictiveCanvas = predictiveCanvasRef.current
        if (predictiveCanvas && !snappedShapeRef.current) {
          const predCtx = predictiveCanvas.getContext('2d')
          if (predCtx) {
            const { width, height } = dimensionsRef.current
            predCtx.clearRect(0, 0, width, height)

            const predicted = predictNextPoint(activePointsRef.current)
            if (predicted && lastDrawnPointRef.current) {
              renderIncrementalSegment(
                predCtx,
                lastDrawnPointRef.current,
                predicted,
                size,
                color,
                isHighlighter
              )
            }
          }
        }

        // 4. 図形ホールドタイマー（終点で静止している時間のみを正確に計測）
        // 手ブレ（14px以内）を超える移動がある間は描画中とみなしタイマーをリセット
        // ペン先が終点で静止してから 750ms 経過した時点で図形認識を発火する
        if (!snappedShapeRef.current) {
          if (!shapeHoldAnchorRef.current) {
            shapeHoldAnchorRef.current = { x: latestPt.x, y: latestPt.y }
          }

          const distFromAnchor = Math.hypot(
            latestPt.x - shapeHoldAnchorRef.current.x,
            latestPt.y - shapeHoldAnchorRef.current.y
          )

          // 手ブレ許容値（14px）を超えて移動している間は描画中とみなし、タイマーをリセット
          if (distFromAnchor > 14) {
            shapeHoldAnchorRef.current = { x: latestPt.x, y: latestPt.y }
            clearShapeHoldTimer()
          }

          // 静止状態であり、かつタイマーが走っていなければ 750ms 静止計測を開始
          if (!shapeHoldTimerRef.current) {
            shapeHoldTimerRef.current = setTimeout(() => {
              // 終点でペン先が静止し続けた場合のみ図形認識を発火
              const recognized = recognizeShape(
                activePointsRef.current,
                currentStrokesRef.current
              )
              if (recognized) {
                snappedShapeRef.current = recognized
                snappedShapeInitialRef.current = {
                  shape: recognized,
                  initialPointer: { x: latestPt.x, y: latestPt.y },
                }
                if (recognized.replacedStrokeIds) {
                  redrawStaticCanvas(recognized.replacedStrokeIds)
                }
                renderSnappedShapePreview(recognized)
              }
            }, 750)
          }
        }
      } else if (toolName === 'eraser') {
        let updated = false
        let current = currentStrokesRef.current

        for (const pt of pointsList) {
          const prev = lastDrawnPointRef.current || pt

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
          lastDrawnPointRef.current = pt
        }

        if (updated) {
          currentStrokesRef.current = current
          updateStrokes(current)
        }
      }
    }

    // ポインタ離脱イベント
    const handleNativePointerEnd = (e: PointerEvent) => {
      if (!isDrawingRef.current || activePointerIdRef.current !== e.pointerId) return
      isDrawingRef.current = false
      activePointerIdRef.current = null
      activePointerTypeRef.current = null

      clearShapeHoldTimer()
      clearContourHoldTimer()
      clearPredictiveCanvas()

      if (e.cancelable) {
        e.preventDefault()
      }

      try {
        container.releasePointerCapture(e.pointerId)
      } catch {
        // noop
      }

      const { onUpdateStrokes: updateStrokes } = propsRef.current

      // A. なげなわ選択ストロークのドラッグ移動完了
      if (isDraggingSelectionRef.current) {
        isDraggingSelectionRef.current = false
        const { dx, dy } = dragDeltaRef.current
        dragStartPointRef.current = null
        dragDeltaRef.current = { dx: 0, dy: 0 }

        if (dx !== 0 || dy !== 0) {
          const currentSelectedIds = selectedStrokeIdsRef.current
          const next = currentStrokesRef.current.map((s) => {
            if (!currentSelectedIds.includes(s.id)) return s
            const movedPoints = s.points.map((p) => ({
              ...p,
              x: p.x + dx,
              y: p.y + dy,
            }))
            return {
              ...s,
              points: movedPoints,
              bounds: calculateBounds(movedPoints, s.size),
            }
          })
          currentStrokesRef.current = next
          updateStrokes(next)
        }

        clearActiveCanvas()
        clearPredictiveCanvas()
        redrawStaticCanvas()
        return
      }

      // B. なげなわツールでの囲み完了
      if (propsRef.current.selectedTool === 'lasso') {
        const activePts = activePointsRef.current
        if (activePts.length > 5) {
          const enclosed = findStrokesInLasso(currentStrokesRef.current, activePts)
          if (enclosed.length > 0) {
            setSelectedStrokeIds(enclosed.map((s) => s.id))
          }
        }

        clearActiveCanvas()
        clearPredictiveCanvas()
        activePointsRef.current = []
        return
      }

      // C. スクラブ消去判定（ぐちゃぐちゃ描いて消す）
      const activePts = activePointsRef.current
      if (!snappedShapeRef.current && isScribbleStroke(activePts)) {
        clearActiveCanvas()
        clearPredictiveCanvas()
        activePointsRef.current = []
        lastDrawnPointRef.current = null

        const eraseTargetIds = getScribbleEraseTargets(currentStrokesRef.current, activePts)
        if (eraseTargetIds.length > 0) {
          const remaining = currentStrokesRef.current.filter(
            (s) => !eraseTargetIds.includes(s.id)
          )
          currentStrokesRef.current = remaining
          updateStrokes(remaining)
        }
        candidateLoopRef.current = null
        return
      }

      // D. 通常ストロークまたは図形スナップの確定コミット
      commitActiveStroke()
    }

    container.addEventListener('pointerdown', handleNativePointerDown, { passive: false })
    container.addEventListener('pointermove', handleNativePointerMove, { passive: false })
    container.addEventListener('pointerup', handleNativePointerEnd, { passive: false })
    container.addEventListener('pointercancel', handleNativePointerEnd, { passive: false })

    return () => {
      clearShapeHoldTimer()
      clearContourHoldTimer()

      container.removeEventListener('touchstart', handleTouchStart)
      container.removeEventListener('touchmove', handleTouchMove)
      container.removeEventListener('touchend', handleTouchEnd)
      container.removeEventListener('touchcancel', handleTouchEnd)
      container.removeEventListener('contextmenu', handleContextMenu)
      container.removeEventListener('dblclick', handleDblClick)

      container.removeEventListener('pointerdown', handleNativePointerDown)
      container.removeEventListener('pointermove', handleNativePointerMove)
      container.removeEventListener('pointerup', handleNativePointerEnd)
      container.removeEventListener('pointercancel', handleNativePointerEnd)
    }
  }, [clearActiveCanvas, clearPredictiveCanvas, commitActiveStroke, redrawStaticCanvas, renderSnappedShapePreview, updateCanvasDimensions])

  // なげなわ選択状態のバウンディングボックス計算
  const selectedStrokes = strokes.filter((s) => selectedStrokeIds.includes(s.id))
  const selectionBounds = getSelectionBounds(selectedStrokes)

  // 基準幅（840px）から現在の画面実寸への表示スケール比率
  const currentContainerW = containerRef.current?.clientWidth || dimensionsRef.current.width || BASE_PAGE_WIDTH
  const displayScale = currentContainerW / BASE_PAGE_WIDTH

  return (
    <div
      ref={containerRef}
      className="canvas-interactive absolute inset-0 w-full h-full overflow-hidden select-none cursor-crosshair"
      style={{ touchAction: allowFingerDrawing ? 'none' : 'pan-y' }}
    >
      {/* 1層目: 確定線 Canvas (静的キャッシュ) */}
      <canvas
        ref={staticCanvasRef}
        className="absolute inset-0 block pointer-events-none"
      />

      {/* 2層目: 描画中ストローク Canvas (低遅延差分追記 O(1)) */}
      <canvas
        ref={activeCanvasRef}
        className="absolute inset-0 block pointer-events-none"
      />

      {/* 3層目: ペン先先行予測インク & オーバーレイ Canvas */}
      <canvas
        ref={predictiveCanvasRef}
        className="absolute inset-0 block pointer-events-none"
      />

      {/* なげなわ選択オーバーレイ UI（現在の用紙スケールに合わせて正確にマッピング） */}
      {selectionBounds && selectedStrokeIds.length > 0 && (() => {
        const topPx = selectionBounds.minY * displayScale
        const heightPx = (selectionBounds.maxY - selectionBounds.minY) * displayScale
        // 用紙上端に近すぎる（45px未満）場合は、枠の下側にアクションバーを表示
        const isCloseToTop = topPx < 45

        return (
          <div
            className="absolute border-2 border-dashed border-blue-500 rounded pointer-events-none transition-all duration-75 z-10"
            style={{
              left: `${selectionBounds.minX * displayScale}px`,
              top: `${topPx}px`,
              width: `${(selectionBounds.maxX - selectionBounds.minX) * displayScale}px`,
              height: `${heightPx}px`,
              backgroundColor: 'rgba(59, 130, 246, 0.08)',
            }}
          >
            {/* アクションバー（削除 & 解除ボタン） */}
            <div
              data-lasso-action-bar="true"
              className={`absolute left-0 flex items-center gap-1 bg-white shadow-lg border border-slate-200 rounded-lg px-2 py-1 pointer-events-auto z-20 select-none ${
                isCloseToTop ? '-bottom-10' : '-top-10'
              }`}
              onPointerDown={(e) => e.stopPropagation()}
              onPointerUp={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onTouchEnd={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onPointerUp={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation()
                  handleDeleteSelected()
                }}
                className="flex items-center gap-1 text-xs font-medium text-red-600 hover:bg-red-50 active:bg-red-100 px-2 py-1 rounded transition-colors cursor-pointer"
                title="削除"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>削除</span>
              </button>
              <div className="w-[1px] h-3 bg-slate-200" />
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onPointerUp={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation()
                  handleClearSelection()
                }}
                className="flex items-center text-slate-500 hover:bg-slate-100 active:bg-slate-200 p-1 rounded transition-colors cursor-pointer"
                title="選択解除"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
