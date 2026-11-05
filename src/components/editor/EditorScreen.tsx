import React, { useState } from 'react'
import {
  ChevronLeft,
  Pen,
  Highlighter,
  Eraser,
  Lasso,
  Undo2,
  Redo2,
  Plus,
} from 'lucide-react'
import type { NoteMetadata } from '../../types/note'
import { IconButton } from '../ui'

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

export const EditorScreen: React.FC<EditorScreenProps> = ({
  note,
  onBack,
  onUpdateTitle,
}) => {
  const [selectedTool, setSelectedTool] = useState<ToolType>('pen')
  const [selectedColor, setSelectedColor] = useState<string>(PRESET_COLORS[0])
  const [selectedWidth, setSelectedWidth] = useState<number>(4)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [titleInput, setTitleInput] = useState(note.title)
  const [pages, setPages] = useState<number[]>([1])

  const handleTitleSubmit = () => {
    setIsEditingTitle(false)
    if (titleInput.trim()) {
      onUpdateTitle(titleInput.trim())
    } else {
      setTitleInput(note.title)
    }
  }

  const handleAddPage = () => {
    setPages((prev) => [...prev, prev.length + 1])
  }

  return (
    <div className="w-screen h-screen flex flex-col bg-slate-200/90 overflow-hidden select-none touch-none">
      {/* 上部固定ツールバー */}
      <header className="h-14 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 flex items-center justify-between z-20 shadow-xs shrink-0">
        {/* 左側: 戻るボタン & タイトル */}
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
              className="text-sm font-bold text-slate-800 truncate hover:bg-slate-100 px-2 py-1 rounded-lg transition-colors cursor-pointer max-w-[180px] sm:max-w-xs text-left"
              title="クリックしてタイトル編集"
            >
              {note.title}
            </button>
          )}

          <div className="hidden sm:flex items-center gap-0.5 ml-2 text-slate-400">
            <IconButton label="元に戻す" size="sm" disabled>
              <Undo2 className="w-4 h-4" />
            </IconButton>
            <IconButton label="やり直す" size="sm" disabled>
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
            label="なげなわ選択"
            size="sm"
            onClick={() => setSelectedTool('lasso')}
          >
            <Lasso className="w-4 h-4" />
          </IconButton>
        </div>

        {/* 右側: カラーパレット & 太さ選択 */}
        <div className="flex items-center gap-3">
          {/* カラー選択 (消しゴム/なげなわ以外で表示) */}
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
      <main className="flex-1 w-full overflow-y-auto overflow-x-hidden p-6 md:p-10 flex flex-col items-center gap-8 overscroll-contain">
        {pages.map((pageNum) => (
          <div
            key={pageNum}
            className="relative w-full max-w-4xl aspect-[1/1.414] bg-white rounded-xl shadow-md border border-slate-300/80 flex flex-col overflow-hidden shrink-0 transition-shadow hover:shadow-lg"
          >
            {/* ページヘッダーラベル */}
            <div className="absolute top-3 right-4 text-xs font-mono font-medium text-slate-300 select-none">
              P.{pageNum}
            </div>

            {/* キャンバス描画領域（プレースホルダー） */}
            <div className="canvas-viewport w-full h-full relative cursor-crosshair flex items-center justify-center">
              <span className="text-xs text-slate-300 pointer-events-none select-none">
                Page {pageNum} Canvas
              </span>
            </div>
          </div>
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
