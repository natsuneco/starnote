import React, { useState, useRef, useEffect } from 'react'
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
} from 'lucide-react'
import type { NoteMetadata, PageSize, PageTemplate } from '../../types/note'
import type { EraserMode, Stroke } from '../../types/drawing'
import { IconButton } from '../ui'
import { DrawingCanvas } from './DrawingCanvas'
import { TemplateBackground } from './TemplateBackground'
import { TEMPLATE_LABELS } from '../../lib/template/templateConstants'
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
  selectedTool: ToolType
  selectedColor: string
  selectedSize: number
  eraserMode: EraserMode
  onRegisterPageActions: (
    pageNumber: number,
    actions: { undo: () => void; redo: () => void; canUndo: boolean; canRedo: boolean }
  ) => void
  onFocusPage: (pageNumber: number) => void
  onStrokeChange: () => void
}

const PageItem: React.FC<PageItemProps> = ({
  noteId,
  pageNumber,
  pageSize = 'A4',
  template = 'blank',
  selectedTool,
  selectedColor,
  selectedSize,
  eraserMode,
  onRegisterPageActions,
  onFocusPage,
  onStrokeChange,
}) => {
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

  const aspectClass = pageSize === 'B5' ? 'aspect-[182/257]' : 'aspect-[210/297]'

  return (
    <div
      onClick={() => onFocusPage(pageNumber)}
      className={`relative w-full max-w-4xl ${aspectClass} bg-white rounded-xl shadow-md border border-slate-300/80 shrink-0 transition-shadow hover:shadow-lg overflow-hidden`}
    >
      {/* ページヘッダーラベル */}
      <div className="absolute top-3 right-4 text-xs font-mono font-medium text-slate-400 select-none pointer-events-none z-10">
        P.{pageNumber}
      </div>

      {/* テンプレート罫線・方眼背景（手書き描画スレッドに影響しない軽量SVG） */}
      <TemplateBackground pageSize={pageSize} template={template} />

      {/* 手書きキャンバス: 用紙全体を確実にカバー */}
      <div className="absolute inset-0 w-full h-full z-1">
        <DrawingCanvas
          strokes={strokes}
          selectedTool={selectedTool}
          selectedColor={selectedColor}
          selectedSize={selectedSize}
          eraserMode={eraserMode}
          onAddStroke={handleAddStroke}
          onUpdateStrokes={handleUpdateStrokes}
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

  // PDFネイティブ同期・エクスポート
  const {
    isSavingPdf,
    notifyDrawingUpdated,
    exportAndDownloadPdf,
  } = usePdfSync(note.id, pages.length, note.pageSize || 'A4', note.template || 'blank')

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
          <IconButton label="一覧に戻る" size="sm" onClick={onBack}>
            <ChevronLeft className="w-5 h-5 text-slate-700" />
          </IconButton>

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
          <div className="flex items-center gap-0.5 ml-2 text-slate-600">
            <IconButton
              label="元に戻す"
              size="sm"
              onClick={() => activePageActions.undo()}
              disabled={!activePageActions.canUndo}
            >
              <Undo2 className="w-4 h-4" />
            </IconButton>
            <IconButton
              label="やり直す"
              size="sm"
              onClick={() => activePageActions.redo()}
              disabled={!activePageActions.canRedo}
            >
              <Redo2 className="w-4 h-4" />
            </IconButton>
          </div>
        </div>

        {/* 中央: 描画ツール選択 */}
        <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200/80 shadow-xs">
          <IconButton
            variant="tool"
            active={selectedTool === 'pen'}
            label="ペン"
            size="sm"
            onClick={() => setSelectedTool('pen')}
          >
            <Pen className="w-4 h-4" />
          </IconButton>

          <IconButton
            variant="tool"
            active={selectedTool === 'highlighter'}
            label="蛍光ペン"
            size="sm"
            onClick={() => setSelectedTool('highlighter')}
          >
            <Highlighter className="w-4 h-4" />
          </IconButton>

          <IconButton
            variant="tool"
            active={selectedTool === 'eraser'}
            label="消しゴム"
            size="sm"
            onClick={() => setSelectedTool('eraser')}
          >
            <Eraser className="w-4 h-4" />
          </IconButton>

          <IconButton
            variant="tool"
            active={selectedTool === 'lasso'}
            label="なげなわ選択 (後日対応)"
            size="sm"
            onClick={() => setSelectedTool('lasso')}
          >
            <Lasso className="w-4 h-4" />
          </IconButton>
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

          {/* 太さピル */}
          {(selectedTool === 'pen' || selectedTool === 'highlighter') && (
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
          )}

          <div className="h-4 w-px bg-slate-200 hidden sm:block" />

          {/* PDFエクスポート（ダウンロード）ボタン */}
          <button
            type="button"
            onClick={() => exportAndDownloadPdf(note.title)}
            disabled={isSavingPdf}
            className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100 transition-colors"
            title="再編集メタデータ付きハイブリッドPDFとしてダウンロード"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">PDF出力</span>
          </button>

          {/* ページ追加ボタン */}
          <button
            type="button"
            onClick={handleAddPage}
            className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-100 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">ページ追加</span>
          </button>
        </div>
      </header>

      {/* メイン縦スクロール紙面ビューポート */}
      <main
        className="flex-1 w-full overflow-y-auto overflow-x-hidden p-6 md:p-10 flex flex-col items-center gap-8 overscroll-contain"
        style={{ touchAction: 'pan-y' }}
      >
        {pages.map((pageNum) => (
          <PageItem
            key={pageNum}
            noteId={note.id}
            pageNumber={pageNum}
            pageSize={note.pageSize || 'A4'}
            template={note.template || 'blank'}
            selectedTool={selectedTool}
            selectedColor={selectedColor}
            selectedSize={selectedTool === 'highlighter' ? selectedWidth * 3.5 : selectedWidth}
            eraserMode={eraserMode}
            onRegisterPageActions={handleRegisterPageActions}
            onFocusPage={setActivePageNum}
            onStrokeChange={notifyDrawingUpdated}
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
      </main>
    </div>
  )
}
