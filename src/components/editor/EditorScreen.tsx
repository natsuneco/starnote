import React, { useState, useRef, useEffect, useCallback } from 'react'
import {
  ChevronLeft,
  Pen,
  Highlighter,
  Eraser,
  Lasso,
  Undo2,
  Redo2,
  Plus,
  Download,
  CheckCircle2,
  Loader2,
  Hand,
} from 'lucide-react'
import type { NoteMetadata, PageSize, PageTemplate } from '../../types/note'
import type { EraserMode, Stroke } from '../../types/drawing'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Slider } from '@/components/ui/slider'
import { DrawingCanvas } from './DrawingCanvas'
import { TemplateBackground } from './TemplateBackground'
import { PdfPageBackground } from './PdfPageBackground'
import { TEMPLATE_LABELS, BASE_PAGE_WIDTH } from '../../lib/template/templateConstants'
import { usePageDrawing } from '../../hooks/usePageDrawing'
import { usePdfSync } from '../../hooks/usePdfSync'

export type ToolType = 'pen' | 'highlighter' | 'eraser' | 'lasso'

export interface EditorScreenProps {
  note: NoteMetadata
  onBack: () => void
  onUpdateTitle: (newTitle: string) => void
}

const PRESET_COLORS = [
  '#0f172a', // スレート黒
  '#2563eb', // ブルー
  '#dc2626', // レッド
  '#16a34a', // グリーン
  '#eab308', // イエロー (マーカー用)
  '#9333ea', // パープル
]

const STROKE_WIDTHS = [
  { label: '細', value: 2 },
  { label: '中', value: 4 },
  { label: '太', value: 8 },
]

// ページごとの紙面コンポーネント
interface PageItemProps {
  noteId: string
  pageNumber: number
  pageSize?: PageSize
  template?: PageTemplate
  isPdf?: boolean
  selectedTool: ToolType
  selectedColor: string
  selectedSize: number
  eraserMode: EraserMode
  allowFingerDrawing?: boolean
  onRegisterPageActions: (
    pageNumber: number,
    actions: { undo: () => void; redo: () => void; canUndo: boolean; canRedo: boolean }
  ) => void
  onFocusPage: (pageNumber: number) => void
  onStrokeChange: () => void
  onPinchZoom?: (
    scaleFactor: number,
    focalPoint: { x: number; y: number },
    deltaX: number,
    deltaY: number
  ) => void
  onPan?: (deltaX: number, deltaY: number) => void
}

const PageItem: React.FC<PageItemProps> = ({
  noteId,
  pageNumber,
  pageSize = 'A4',
  template = 'blank',
  isPdf = false,
  selectedTool,
  selectedColor,
  selectedSize,
  eraserMode,
  allowFingerDrawing = false,
  onRegisterPageActions,
  onFocusPage,
  onStrokeChange,
  onPinchZoom,
  onPan,
}) => {
  const [pdfAspectRatio, setPdfAspectRatio] = useState<number | null>(null)
  const { strokes, addStroke, applyStrokesUpdate, undo, redo, canUndo, canRedo } =
    usePageDrawing(noteId, pageNumber)

  // 親へ最新のアクション状態を通知
  useEffect(() => {
    onRegisterPageActions(pageNumber, { undo, redo, canUndo, canRedo })
  }, [pageNumber, undo, redo, canUndo, canRedo, onRegisterPageActions])

  const handleAddStroke = (stroke: Stroke) => {
    addStroke(stroke)
    onStrokeChange()
  }

  const handleUpdateStrokes = (newStrokes: Stroke[]) => {
    applyStrokesUpdate(newStrokes)
    onStrokeChange()
  }

  const aspectClass = isPdf
    ? pdfAspectRatio
      ? ''
      : 'aspect-[210/297]'
    : pageSize === 'B5'
      ? 'aspect-[182/257]'
      : 'aspect-[210/297]'

  const containerStyle =
    isPdf && pdfAspectRatio ? { aspectRatio: String(pdfAspectRatio) } : undefined

  return (
    <div
      onClick={() => onFocusPage(pageNumber)}
      style={containerStyle}
      className={`relative w-full ${aspectClass} bg-white rounded-xl shadow-md border border-slate-300/80 shrink-0 transition-shadow hover:shadow-lg overflow-hidden`}
    >
      {/* ページ背景: PDFノート時はPDFページ描画、通常ノート時はテンプレート罫線 */}
      {isPdf ? (
        <PdfPageBackground
          noteId={noteId}
          pageNumber={pageNumber}
          onAspectRatioLoaded={setPdfAspectRatio}
        />
      ) : (
        <TemplateBackground pageSize={pageSize} template={template} />
      )}

      {/* 手書きキャンバス: 用紙全体を確実にカバー */}
      <div className="absolute inset-0 w-full h-full z-1">
        <DrawingCanvas
          strokes={strokes}
          selectedTool={selectedTool}
          selectedColor={selectedColor}
          selectedSize={selectedSize}
          eraserMode={eraserMode}
          allowFingerDrawing={allowFingerDrawing}
          onAddStroke={handleAddStroke}
          onUpdateStrokes={handleUpdateStrokes}
          onUndo={undo}
          onRedo={redo}
          onPinchZoom={onPinchZoom}
          onPan={onPan}
        />
      </div>
    </div>
  )
}

export const EditorScreen: React.FC<EditorScreenProps> = ({
  note,
  onBack,
  onUpdateTitle,
}) => {
  const [selectedTool, setSelectedTool] = useState<ToolType>('pen')
  const [selectedColor, setSelectedColor] = useState<string>(PRESET_COLORS[0])
  const [selectedWidth, setSelectedWidth] = useState<number>(4)
  const [eraserMode, setEraserMode] = useState<EraserMode>('stroke')

  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [titleInput, setTitleInput] = useState(note.title)

  // ノートの初期ページ数からページ配列を初期化
  const initialPageCount = Math.max(1, note.pageCount || 1)
  const [pages, setPages] = useState<number[]>(() =>
    Array.from({ length: initialPageCount }, (_, i) => i + 1)
  )
  const [activePageNum, setActivePageNum] = useState<number>(1)

  // ビューポート要素 & 紙面コンテナ要素の参照
  const viewportRef = useRef<HTMLElement | null>(null)
  const paperContainerRef = useRef<HTMLDivElement | null>(null)

  // ズーム倍率（50%〜400%）およびパンオフセット管理
  const [zoomScale, setZoomScale] = useState<number>(1.0)
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [isResettingZoom, setIsResettingZoom] = useState(false)

  // 同期用 ref（高速な連続タッチイベント間での状態ドリフト防止）
  const zoomScaleRef = useRef(1.0)
  const panOffsetRef = useRef({ x: 0, y: 0 })

  // 2本指ピンチズーム & パン（Focal Point 不変モデル）
  const handlePinchZoom = useCallback(
    (
      scaleFactor: number,
      focalPoint: { x: number; y: number },
      deltaX: number,
      deltaY: number
    ) => {
      const container = paperContainerRef.current
      if (!container) return

      const rect = container.getBoundingClientRect()
      // 現在の描画位置（rect.left, rect.top）とピンチ中心点の距離
      const offsetX = focalPoint.x - rect.left
      const offsetY = focalPoint.y - rect.top

      const currentScale = zoomScaleRef.current
      const currentPan = panOffsetRef.current

      // ズーム倍率制約 (50%〜400%)
      const nextScale = Math.min(4.0, Math.max(0.5, currentScale * scaleFactor))
      const k = nextScale / currentScale

      // Focal Point 不変モデル:
      // X軸はFlexbox水平中央揃え (items-center) のため中心差分 (offsetX - rect.width / 2) をスケーリング
      // Y軸は上端揃え (flex-col top-aligned) のため上端差分 offsetY をスケーリング
      const newTx = currentPan.x + deltaX - (offsetX - rect.width / 2) * (k - 1)
      const newTy = currentPan.y + deltaY - offsetY * (k - 1)

      const roundedPan = {
        x: Math.round(newTx * 10) / 10,
        y: Math.round(newTy * 10) / 10,
      }
      const roundedScale = Math.round(nextScale * 100) / 100

      zoomScaleRef.current = roundedScale
      panOffsetRef.current = roundedPan

      setZoomScale(roundedScale)
      setPanOffset(roundedPan)
    },
    []
  )

  // 1本指パン（指描画OFF時）
  const handlePan = useCallback((deltaX: number, deltaY: number) => {
    const nextPan = {
      x: Math.round((panOffsetRef.current.x + deltaX) * 10) / 10,
      y: Math.round((panOffsetRef.current.y + deltaY) * 10) / 10,
    }
    panOffsetRef.current = nextPan
    setPanOffset(nextPan)
  }, [])

  // ズーム & パンのリセット（等倍・中央復帰）
  const handleResetZoom = useCallback(() => {
    setIsResettingZoom(true)
    zoomScaleRef.current = 1.0
    panOffsetRef.current = { x: 0, y: 0 }
    setZoomScale(1.0)
    setPanOffset({ x: 0, y: 0 })
    setTimeout(() => {
      setIsResettingZoom(false)
    }, 250)
  }, [])

  // マウスホイール & トラックパッドでのズーム・パン
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        // ピンチズーム
        const factor = e.deltaY < 0 ? 1.05 : 0.95
        handlePinchZoom(factor, { x: e.clientX, y: e.clientY }, 0, 0)
      } else {
        // パン移動
        handlePan(-e.deltaX, -e.deltaY)
      }
    },
    [handlePinchZoom, handlePan]
  )

  // 指で描画するか、指でのスクロールを許可するか（localStorageで永続化、初期値はペン最適化のfalse）
  const [allowFingerDrawing, setAllowFingerDrawing] = useState<boolean>(() => {
    const saved = localStorage.getItem('starnote:allowFingerDrawing')
    return saved !== null ? saved === 'true' : false
  })

  const handleToggleFingerDrawing = () => {
    setAllowFingerDrawing((prev) => {
      const next = !prev
      localStorage.setItem('starnote:allowFingerDrawing', String(next))
      return next
    })
  }

  // PDFネイティブ同期・エクスポート
  const {
    isSavingPdf,
    notifyDrawingUpdated,
    exportAndDownloadPdf,
  } = usePdfSync(
    note.id,
    pages.length,
    note.pageSize || 'A4',
    note.template || 'blank',
    Boolean(note.isPdf)
  )

  // 各ページのアクション参照マップ
  const pageActionsMap = useRef<
    Record<number, { undo: () => void; redo: () => void; canUndo: boolean; canRedo: boolean }>
  >({})

  const handleRegisterPageActions = (
    pageNumber: number,
    actions: { undo: () => void; redo: () => void; canUndo: boolean; canRedo: boolean }
  ) => {
    pageActionsMap.current[pageNumber] = actions
  }

  const activePageActions = pageActionsMap.current[activePageNum] || {
    undo: () => {},
    redo: () => {},
    canUndo: false,
    canRedo: false,
  }

  const handleTitleSubmit = () => {
    setIsEditingTitle(false)
    if (titleInput.trim()) {
      onUpdateTitle(titleInput.trim())
    } else {
      setTitleInput(note.title)
    }
  }

  const handleAddPage = () => {
    const nextNum = pages.length + 1
    setPages((prev) => [...prev, nextNum])
    setActivePageNum(nextNum)
    notifyDrawingUpdated()
  }

  return (
    <div className="w-screen h-screen flex flex-col bg-slate-200/90 overflow-hidden select-none">
      {/* 上部固定ツールバー */}
      <header className="h-14 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 flex items-center justify-between z-20 shadow-xs shrink-0">
        {/* 左側: 戻るボタン & タイトル & Undo/Redo & 保存ステータス */}
        <div className="flex items-center gap-2 min-w-0">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onBack}
            aria-label="一覧に戻る"
            title="一覧に戻る"
          >
            <ChevronLeft className="w-5 h-5 text-slate-700" />
          </Button>

          <div className="h-4 w-px bg-slate-200 mx-1" />

          {isEditingTitle ? (
            <input
              type="text"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              onBlur={handleTitleSubmit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleTitleSubmit()
                if (e.key === 'Escape') {
                  setIsEditingTitle(false)
                  setTitleInput(note.title)
                }
              }}
              autoFocus
              className="text-sm font-bold text-slate-800 bg-slate-100 px-2 py-1 rounded-lg border border-indigo-400 focus:outline-none"
            />
          ) : (
            <button
              type="button"
              onClick={() => {
                setTitleInput(note.title)
                setIsEditingTitle(true)
              }}
              className="text-sm font-bold text-slate-800 truncate hover:bg-slate-100 px-2 py-1 rounded-lg transition-colors cursor-pointer max-w-[130px] sm:max-w-xs text-left"
              title="クリックしてタイトル編集"
            >
              {note.title}
            </button>
          )}

          {/* 用紙サイズ・テンプレート情報バッジ */}
          <div className="hidden lg:flex items-center gap-1 text-[11px] text-slate-500 font-medium px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200">
            <span>{note.pageSize || 'A4'}</span>
            <span>•</span>
            <span>{TEMPLATE_LABELS[note.template || 'blank']?.label || '白紙'}</span>
          </div>

          {/* 保存ステータスバッジ */}
          <div className="hidden md:flex items-center gap-1 text-[11px] text-slate-400 font-medium px-1.5 py-0.5 rounded bg-slate-100">
            {isSavingPdf ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin text-indigo-500" />
                <span>PDF保存中...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                <span>保存済</span>
              </>
            )}
          </div>

          {/* Undo / Redo */}
          <div className="flex items-center gap-0.5 ml-1 text-slate-600">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => activePageActions.undo()}
              disabled={!activePageActions.canUndo}
              aria-label="元に戻す"
              title="元に戻す"
            >
              <Undo2 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => activePageActions.redo()}
              disabled={!activePageActions.canRedo}
              aria-label="やり直す"
              title="やり直す"
            >
              <Redo2 className="w-4 h-4" />
            </Button>

            {/* ズーム倍率インジケーター & リセットボタン */}
            <Button
              variant="outline"
              size="xs"
              onClick={handleResetZoom}
              className="ml-1 text-[11px] font-mono font-bold text-slate-600 h-6 px-2"
              title="クリックして等倍 (100%) にリセット"
            >
              {Math.round(zoomScale * 100)}%
            </Button>
          </div>
        </div>

        {/* 中央: 描画ツール選択 */}
        <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-2xl border border-slate-200/80 shadow-xs">
          <Button
            variant={selectedTool === 'pen' ? 'default' : 'ghost'}
            size="icon-sm"
            onClick={() => setSelectedTool('pen')}
            className={selectedTool === 'pen' ? 'bg-white text-indigo-600 shadow-xs hover:bg-white' : 'text-slate-600'}
            aria-label="ペン"
            title="ペン"
          >
            <Pen className="w-4 h-4" />
          </Button>

          <Button
            variant={selectedTool === 'highlighter' ? 'default' : 'ghost'}
            size="icon-sm"
            onClick={() => setSelectedTool('highlighter')}
            className={selectedTool === 'highlighter' ? 'bg-white text-indigo-600 shadow-xs hover:bg-white' : 'text-slate-600'}
            aria-label="蛍光ペン"
            title="蛍光ペン"
          >
            <Highlighter className="w-4 h-4" />
          </Button>

          <Button
            variant={selectedTool === 'eraser' ? 'default' : 'ghost'}
            size="icon-sm"
            onClick={() => setSelectedTool('eraser')}
            className={selectedTool === 'eraser' ? 'bg-white text-indigo-600 shadow-xs hover:bg-white' : 'text-slate-600'}
            aria-label="消しゴム"
            title="消しゴム"
          >
            <Eraser className="w-4 h-4" />
          </Button>

          <Button
            variant={selectedTool === 'lasso' ? 'default' : 'ghost'}
            size="icon-sm"
            onClick={() => setSelectedTool('lasso')}
            className={selectedTool === 'lasso' ? 'bg-white text-indigo-600 shadow-xs hover:bg-white' : 'text-slate-600'}
            aria-label="なげなわ選択"
            title="なげなわ選択"
          >
            <Lasso className="w-4 h-4" />
          </Button>

          <div className="h-4 w-px bg-slate-200 mx-0.5" />

          {/* 指描画 / 指スクロール 切り替えトグル */}
          <Button
            variant={allowFingerDrawing ? 'default' : 'ghost'}
            size="icon-sm"
            onClick={handleToggleFingerDrawing}
            className={allowFingerDrawing ? 'bg-indigo-600 text-white shadow-xs hover:bg-indigo-700' : 'text-slate-600'}
            aria-label={
              allowFingerDrawing
                ? '指で描画: ON (タップで指スクロールに切替)'
                : '指でスクロール: ON (ペン専用描画 / タップで指描画に切替)'
            }
            title={
              allowFingerDrawing
                ? '指で描画: ON (タップで指スクロールに切替)'
                : '指でスクロール: ON (ペン専用描画 / タップで指描画に切替)'
            }
          >
            <Hand className="w-4 h-4" />
          </Button>
        </div>

        {/* 右側: 消しゴムトグル / カラー / 太さ */}
        <div className="flex items-center gap-3">
          {/* 消しゴム選択時: ストローク消し / 部分消し 切り替えトグル */}
          {selectedTool === 'eraser' && (
            <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setEraserMode('stroke')}
                className={`px-2 py-1 rounded-md transition-all ${
                  eraserMode === 'stroke'
                    ? 'bg-white text-indigo-600 shadow-xs font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                ストローク消し
              </button>
              <button
                type="button"
                onClick={() => setEraserMode('precision')}
                className={`px-2 py-1 rounded-md transition-all ${
                  eraserMode === 'precision'
                    ? 'bg-white text-indigo-600 shadow-xs font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                部分消し
              </button>
            </div>
          )}

          {/* カラー選択 (ペン / 蛍光ペン) */}
          {(selectedTool === 'pen' || selectedTool === 'highlighter') && (
            <div className="hidden sm:flex items-center gap-1.5">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  style={{ backgroundColor: color }}
                  className={`w-5 h-5 rounded-full transition-transform ${
                    selectedColor === color
                      ? 'scale-125 ring-2 ring-offset-2 ring-indigo-500'
                      : 'hover:scale-110 opacity-90 hover:opacity-100'
                  }`}
                  aria-label={`色 ${color}`}
                />
              ))}
            </div>
          )}

          {/* 太さピル & 詳細設定 Popover */}
          {(selectedTool === 'pen' || selectedTool === 'highlighter') && (
            <div className="flex items-center gap-1.5">
              <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
                {STROKE_WIDTHS.map((w) => (
                  <button
                    key={w.value}
                    type="button"
                    onClick={() => setSelectedWidth(w.value)}
                    className={`px-2 py-0.5 text-xs font-semibold rounded-md transition-all ${
                      selectedWidth === w.value
                        ? 'bg-white text-indigo-600 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {w.label}
                  </button>
                ))}
              </div>

              {/* 詳細設定 Popover */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="xs"
                    className="h-7 px-2 text-xs gap-1 font-medium text-slate-700 bg-white"
                    title="太さ・カラー詳細設定"
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                      style={{ backgroundColor: selectedColor }}
                    />
                    <span>{selectedWidth}px</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-3 gap-3">
                  <div className="text-xs font-bold text-slate-700">ストロークの太さ: {selectedWidth}px</div>
                  <Slider
                    min={1}
                    max={24}
                    step={1}
                    value={[selectedWidth]}
                    onValueChange={(val) => val[0] && setSelectedWidth(val[0])}
                  />
                  <div className="text-xs font-bold text-slate-700 pt-1">カラーパレット</div>
                  <div className="grid grid-cols-6 gap-2 pt-1">
                    {PRESET_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setSelectedColor(color)}
                        style={{ backgroundColor: color }}
                        className={`w-7 h-7 rounded-full transition-transform ${
                          selectedColor === color
                            ? 'scale-110 ring-2 ring-offset-2 ring-indigo-500'
                            : 'hover:scale-105 opacity-90'
                        }`}
                        aria-label={`色 ${color}`}
                      />
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          )}

          <div className="h-4 w-px bg-slate-200 hidden sm:block" />

          {/* PDFエクスポート（ダウンロード）ボタン */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportAndDownloadPdf(note.title)}
            disabled={isSavingPdf}
            className="text-xs gap-1 text-sky-700 border-sky-200 hover:bg-sky-50"
            title="再編集メタデータ付きハイブリッドPDFとしてダウンロード"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">PDF出力</span>
          </Button>

          {/* ページ追加ボタン */}
          <Button
            variant="default"
            size="sm"
            onClick={handleAddPage}
            className="text-xs gap-1 bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">ページ追加</span>
          </Button>
        </div>
      </header>

      {/* メイン紙面ビューポート */}
      <main
        ref={viewportRef}
        onWheel={handleWheel}
        className="flex-1 w-full h-full overflow-hidden p-6 md:p-10 flex flex-col items-center gap-8 overscroll-none relative select-none"
        style={{ touchAction: 'none' }}
      >
        <div
          ref={paperContainerRef}
          className="flex flex-col items-center gap-8 shrink-0"
          style={{
            transform: `translate3d(${panOffset.x}px, ${panOffset.y}px, 0)`,
            width: `${Math.round(BASE_PAGE_WIDTH * zoomScale)}px`,
            transition: isResettingZoom ? 'transform 0.25s ease-out, width 0.25s ease-out' : 'none',
          }}
        >
          {pages.map((pageNum) => (
            <PageItem
              key={pageNum}
              noteId={note.id}
              pageNumber={pageNum}
              pageSize={note.pageSize || 'A4'}
              template={note.template || 'blank'}
              isPdf={Boolean(note.isPdf)}
              selectedTool={selectedTool}
              selectedColor={selectedColor}
              selectedSize={selectedTool === 'highlighter' ? selectedWidth * 3.5 : selectedWidth}
              eraserMode={eraserMode}
              allowFingerDrawing={allowFingerDrawing}
              onRegisterPageActions={handleRegisterPageActions}
              onFocusPage={setActivePageNum}
              onStrokeChange={notifyDrawingUpdated}
              onPinchZoom={handlePinchZoom}
              onPan={handlePan}
            />
          ))}

          {/* ページ追加フッター */}
          <button
            type="button"
            onClick={handleAddPage}
            className="my-4 py-3 px-6 rounded-2xl border-2 border-dashed border-slate-300 hover:border-indigo-400 bg-white/70 hover:bg-white text-slate-500 hover:text-indigo-600 font-medium text-sm flex items-center gap-2 transition-all shadow-xs cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>新しいページを追加</span>
          </button>
        </div>
      </main>
    </div>
  )
}
