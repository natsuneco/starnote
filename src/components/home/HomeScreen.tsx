import React, { useState, useRef } from 'react'
import { Plus, Trash2, BookOpen, Clock, FileText, Upload, FileUp } from 'lucide-react'
import type { NoteMetadata } from '../../types/note'
import { Card, Button, IconButton, Modal, Input } from '../ui'

export interface HomeScreenProps {
  notes: NoteMetadata[]
  onSelectNote: (noteId: string) => void
  onCreateNote: (title: string) => Promise<NoteMetadata>
  onImportPdfNote?: (file: File) => Promise<NoteMetadata>
  onDeleteNote: (noteId: string) => Promise<void>
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  notes,
  onSelectNote,
  onCreateNote,
  onImportPdfNote,
  onDeleteNote,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const handleOpenCreateModal = () => {
    setNewTitle('')
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
      const created = await onCreateNote(newTitle)
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
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-sky-500 flex items-center justify-center text-white shadow-sm shadow-indigo-200">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 leading-tight">StarNote</h1>
            <p className="text-xs text-slate-500 font-medium">マイノート</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onImportPdfNote && (
            <Button
              variant="secondary"
              onClick={handleTriggerFileInput}
              icon={<Upload className="w-4 h-4" />}
              size="sm"
              disabled={isImporting}
            >
              {isImporting ? 'インポート中...' : 'PDFをインポート'}
            </Button>
          )}

          <Button
            onClick={handleOpenCreateModal}
            icon={<Plus className="w-4 h-4" />}
            size="sm"
          >
            新規ノート
          </Button>
        </div>
      </header>

      {/* ノート一覧グリッド */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-8">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
          {/* 新規作成タイル */}
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="group flex flex-col items-center justify-center aspect-[3/4] rounded-2xl border-2 border-dashed border-slate-300 hover:border-indigo-500 bg-white hover:bg-indigo-50/30 transition-all p-4 text-center cursor-pointer shadow-xs active:scale-[0.98]"
          >
            <div className="w-12 h-12 rounded-full bg-slate-100 group-hover:bg-indigo-600 group-hover:text-white text-slate-500 flex items-center justify-center transition-colors mb-3">
              <Plus className="w-6 h-6" />
            </div>
            <span className="text-sm font-semibold text-slate-700 group-hover:text-indigo-600">
              新規ノート作成
            </span>
            <span className="text-xs text-slate-400 mt-1">白紙ノート</span>
          </button>

          {/* PDFインポートタイル */}
          {onImportPdfNote && (
            <button
              type="button"
              onClick={handleTriggerFileInput}
              disabled={isImporting}
              className="group flex flex-col items-center justify-center aspect-[3/4] rounded-2xl border-2 border-dashed border-slate-300 hover:border-sky-500 bg-white hover:bg-sky-50/30 transition-all p-4 text-center cursor-pointer shadow-xs active:scale-[0.98]"
            >
              <div className="w-12 h-12 rounded-full bg-slate-100 group-hover:bg-sky-600 group-hover:text-white text-slate-500 flex items-center justify-center transition-colors mb-3">
                <FileUp className="w-6 h-6" />
              </div>
              <span className="text-sm font-semibold text-slate-700 group-hover:text-sky-600">
                {isImporting ? '読み込み中...' : 'PDFをインポート'}
              </span>
              <span className="text-xs text-slate-400 mt-1">PDF下敷きノート</span>
            </button>
          )}

          {/* 既存ノートカード */}
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

                {note.isPdf && (
                  <span className="absolute top-2 left-2 px-1.5 py-0.5 bg-sky-100 text-sky-700 font-bold text-[10px] rounded tracking-wide">
                    PDF
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
        maxWidth="sm"
      >
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <Input
            label="ノートタイトル"
            placeholder="例: アイデアメモ、授業ノート"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            autoFocus
          />

          <div className="flex items-center justify-end gap-2 pt-2">
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
