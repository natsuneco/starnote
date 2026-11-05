import React, { useState, useRef } from 'react'
import { Plus, Trash2, BookOpen, Clock, FileText, Upload, FileUp, Check } from 'lucide-react'
import type { NoteMetadata, PageSize, PageTemplate } from '../../types/note'
import { Card, Button, IconButton, Modal, Input } from '../ui'
import { TEMPLATE_LABELS } from '../../lib/template/templateConstants'

export interface HomeScreenProps {
  notes: NoteMetadata[]
  onSelectNote: (noteId: string) => void
  onCreateNote: (title: string, pageSize?: PageSize, template?: PageTemplate) => Promise<NoteMetadata>
  onImportPdfNote?: (file: File) => Promise<NoteMetadata>
  onDeleteNote: (noteId: string) => Promise<void>
}

const TEMPLATE_OPTIONS: Array<{
  id: PageTemplate
  title: string
  subtitle: string
  previewType: 'ruled-b' | 'ruled-a' | 'grid' | 'blank'
}> = [
  {
    id: 'ruled-b',
    title: 'B罫 (6mm)',
    subtitle: '40行 (A4) / 35行 (B5)',
    previewType: 'ruled-b',
  },
  {
    id: 'ruled-a',
    title: 'A罫 (7mm)',
    subtitle: '35行 (A4) / 30行 (B5)',
    previewType: 'ruled-a',
  },
  {
    id: 'grid-5mm',
    title: '5mm 方眼',
    subtitle: '図表・アイデア用グリッド',
    previewType: 'grid',
  },
  {
    id: 'blank',
    title: '白紙',
    subtitle: '自由なキャンバス',
    previewType: 'blank',
  },
]

export const HomeScreen: React.FC<HomeScreenProps> = ({
  notes,
  onSelectNote,
  onCreateNote,
  onImportPdfNote,
  onDeleteNote,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [selectedPageSize, setSelectedPageSize] = useState<PageSize>('A4')
  const [selectedTemplate, setSelectedTemplate] = useState<PageTemplate>('ruled-b')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const handleOpenCreateModal = () => {
    setNewTitle('')
    setSelectedPageSize('A4')
    setSelectedTemplate('ruled-b')
    setIsModalOpen(true)
  }

  const handleTriggerFileInput = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !onImportPdfNote) return

    try {
      setIsImporting(true)
      const imported = await onImportPdfNote(file)
      onSelectNote(imported.id)
    } catch (err) {
      console.error('PDF import failed:', err)
      alert('PDFのインポートに失敗しました。ファイルが破損していないかご確認ください。')
    } finally {
      setIsImporting(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting) return

    try {
      setIsSubmitting(true)
      const created = await onCreateNote(newTitle, selectedPageSize, selectedTemplate)
      setIsModalOpen(false)
      onSelectNote(created.id)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (e: React.MouseEvent, noteId: string) => {
    e.stopPropagation()
    if (window.confirm('このノートを削除してもよろしいですか？')) {
      setDeletingId(noteId)
      try {
        await onDeleteNote(noteId)
      } finally {
        setDeletingId(null)
      }
    }
  }

  const formatDate = (timestamp: number) => {
    const d = new Date(timestamp)
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col select-none">
      {/* 隠しPDFファイル入力 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* ホームヘッダー */}
      <header className="h-16 bg-white border-b border-slate-200/80 px-6 flex items-center justify-between sticky top-0 z-10 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center text-white shadow-sm shadow-indigo-200">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 leading-tight">StarNote</h1>
            <p className="text-xs text-slate-400 font-medium">手書きノート & PDF</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* PDFインポートボタン */}
          {onImportPdfNote && (
            <Button
              variant="secondary"
              size="md"
              onClick={handleTriggerFileInput}
              disabled={isImporting}
              className="gap-1.5"
            >
              {isImporting ? (
                <>
                  <Upload className="w-4 h-4 animate-bounce" />
                  <span className="hidden sm:inline">インポート中...</span>
                </>
              ) : (
                <>
                  <FileUp className="w-4 h-4 text-indigo-600" />
                  <span className="hidden sm:inline">PDFを読み込む</span>
                </>
              )}
            </Button>
          )}

          {/* 新規ノート作成ボタン */}
          <Button
            variant="primary"
            size="md"
            onClick={handleOpenCreateModal}
            className="gap-1.5 shadow-sm shadow-indigo-200"
          >
            <Plus className="w-4 h-4" />
            <span>新規ノート</span>
          </Button>
        </div>
      </header>

      {/* メインコンテンツ: ノート一覧グリッド */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-base font-bold text-slate-800">すべてのノート ({notes.length})</h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
          {/* 新規作成クイックカード */}
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="group flex flex-col items-center justify-center aspect-[3/4] rounded-2xl border-2 border-dashed border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/30 transition-all cursor-pointer p-4 text-slate-400 hover:text-indigo-600 shadow-xs"
          >
            <div className="w-12 h-12 rounded-full bg-slate-100 group-hover:bg-indigo-100 flex items-center justify-center transition-colors mb-3">
              <Plus className="w-6 h-6 text-slate-400 group-hover:text-indigo-600 transition-colors" />
            </div>
            <span className="text-xs font-semibold">ノートを作成</span>
          </button>

          {/* ノートカード一覧 */}
          {notes.map((note) => (
            <Card
              key={note.id}
              interactive
              onClick={() => onSelectNote(note.id)}
              className="group flex flex-col aspect-[3/4] relative overflow-hidden border-slate-200/90"
            >
              {/* 表紙・プレビュー領域 */}
              <div className="flex-1 bg-gradient-to-b from-slate-100/70 to-slate-50 flex items-center justify-center p-4 border-b border-slate-100 relative">
                <FileText className="w-12 h-12 text-slate-300 group-hover:text-indigo-400 group-hover:scale-110 transition-all" />

                {note.isPdf ? (
                  <span className="absolute top-2 left-2 px-1.5 py-0.5 bg-sky-100 text-sky-700 font-bold text-[10px] rounded tracking-wide">
                    PDF
                  </span>
                ) : (
                  <span className="absolute top-2 left-2 px-1.5 py-0.5 bg-slate-200/80 text-slate-600 font-semibold text-[10px] rounded tracking-wide">
                    {note.pageSize || 'A4'} • {TEMPLATE_LABELS[note.template || 'blank']?.label || '白紙'}
                  </span>
                )}

                {/* 削除ボタン */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <IconButton
                    variant="danger"
                    size="sm"
                    label="削除"
                    onClick={(e) => handleDelete(e, note.id)}
                    disabled={deletingId === note.id}
                  >
                    <Trash2 className="w-4 h-4" />
                  </IconButton>
                </div>
              </div>

              {/* タイトル & 更新情報 */}
              <div className="p-3 bg-white">
                <h3 className="text-sm font-bold text-slate-800 truncate" title={note.title}>
                  {note.title}
                </h3>
                <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-400 font-medium">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{formatDate(note.updatedAt)}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </main>

      {/* 新規作成モーダル */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="新規ノートを作成"
        maxWidth="md"
      >
        <form onSubmit={handleCreate} className="flex flex-col gap-5">
          <Input
            label="ノートタイトル"
            placeholder="例: アイデアメモ、授業ノート"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            autoFocus
          />

          {/* 用紙サイズ選択 */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-600">用紙サイズ</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSelectedPageSize('A4')}
                className={`py-2 px-3 rounded-xl border text-sm font-semibold flex items-center justify-between transition-all cursor-pointer ${
                  selectedPageSize === 'A4'
                    ? 'border-indigo-600 bg-indigo-50/50 text-indigo-700 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                }`}
              >
                <div className="flex flex-col text-left">
                  <span>A4</span>
                  <span className="text-[11px] font-normal text-slate-400">210 × 297 mm</span>
                </div>
                {selectedPageSize === 'A4' && <Check className="w-4 h-4 text-indigo-600" />}
              </button>

              <button
                type="button"
                onClick={() => setSelectedPageSize('B5')}
                className={`py-2 px-3 rounded-xl border text-sm font-semibold flex items-center justify-between transition-all cursor-pointer ${
                  selectedPageSize === 'B5'
                    ? 'border-indigo-600 bg-indigo-50/50 text-indigo-700 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                }`}
              >
                <div className="flex flex-col text-left">
                  <span>B5</span>
                  <span className="text-[11px] font-normal text-slate-400">182 × 257 mm</span>
                </div>
                {selectedPageSize === 'B5' && <Check className="w-4 h-4 text-indigo-600" />}
              </button>
            </div>
          </div>

          {/* テンプレート選択 */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-600">用紙テンプレート</label>
            <div className="grid grid-cols-2 gap-3">
              {TEMPLATE_OPTIONS.map((tpl) => {
                const isSelected = selectedTemplate === tpl.id
                return (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => setSelectedTemplate(tpl.id)}
                    className={`p-3 rounded-xl border text-left flex flex-col gap-2 transition-all cursor-pointer relative overflow-hidden ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/40 ring-1 ring-indigo-600 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    {/* ミニチュアプレビュー */}
                    <div className="w-full h-14 bg-white border border-slate-200 rounded-md overflow-hidden relative shadow-2xs flex flex-col justify-center">
                      {tpl.previewType === 'ruled-b' && (
                        <div className="flex flex-col justify-evenly h-full py-1.5 px-3">
                          <div className="w-full h-[1px] bg-slate-300" />
                          <div className="w-full h-[1px] bg-slate-300" />
                          <div className="w-full h-[1px] bg-slate-300" />
                          <div className="w-full h-[1px] bg-slate-300" />
                        </div>
                      )}
                      {tpl.previewType === 'ruled-a' && (
                        <div className="flex flex-col justify-evenly h-full py-1.5 px-3">
                          <div className="w-full h-[1px] bg-slate-300" />
                          <div className="w-full h-[1px] bg-slate-300" />
                          <div className="w-full h-[1px] bg-slate-300" />
                        </div>
                      )}
                      {tpl.previewType === 'grid' && (
                        <div
                          className="w-full h-full"
                          style={{
                            backgroundImage:
                              'linear-gradient(to right, #cbd5e1 1px, transparent 1px), linear-gradient(to bottom, #cbd5e1 1px, transparent 1px)',
                            backgroundSize: '8px 8px',
                          }}
                        />
                      )}
                      {tpl.previewType === 'blank' && (
                        <div className="w-full h-full bg-white flex items-center justify-center text-[10px] text-slate-300">
                          無地
                        </div>
                      )}
                    </div>

                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-xs font-bold text-slate-800">{tpl.title}</div>
                        <div className="text-[11px] text-slate-400">{tpl.subtitle}</div>
                      </div>
                      {isSelected && (
                        <div className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsModalOpen(false)}
            >
              キャンセル
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? '作成中...' : 'ノートを作成'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
