import { useState, useEffect, useCallback } from 'react'
import { db } from '../lib/db'
import type { NoteMetadata, PageSize, PageTemplate } from '../types/note'
import { PDFDocument } from 'pdf-lib'
import { extractStrokesMetadata } from '../lib/pdf/metadata'
import type { Stroke } from '../types/drawing'

export function useNotes() {
  const [notes, setNotes] = useState<NoteMetadata[]>([])
  const [loading, setLoading] = useState<boolean>(true)

  const loadNotes = useCallback(async () => {
    try {
      setLoading(true)
      const allNotes = await db.notes.orderBy('updatedAt').reverse().toArray()
      if (allNotes.length === 0) {
        // 初回用のサンプルノート
        const initialNote: NoteMetadata = {
          id: 'welcome-note',
          title: 'クイックスタート & ガイド',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          pageCount: 1,
          pageSize: 'A4',
          template: 'ruled-b',
        }
        await db.notes.add(initialNote)
        setNotes([initialNote])
      } else {
        setNotes(allNotes)
      }
    } catch (err) {
      console.error('Failed to load notes from IndexedDB:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadNotes()
  }, [loadNotes])

  const createNote = useCallback(
    async (
      title: string,
      pageSize: PageSize = 'A4',
      template: PageTemplate = 'ruled-b'
    ): Promise<NoteMetadata> => {
      const newNote: NoteMetadata = {
        id: `note-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        title: title.trim() || '無題のノート',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        pageCount: 1,
        pageSize,
        template,
      }
      await db.notes.add(newNote)
      setNotes((prev) => [newNote, ...prev])
      return newNote
    },
    []
  )

  const importPdfNote = useCallback(async (file: File): Promise<NoteMetadata> => {
    const arrayBuffer = await file.arrayBuffer()
    const pdfBytes = new Uint8Array(arrayBuffer)
    const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true })
    const pageCount = pdfDoc.getPageCount()

    const noteId = `note-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
    const title = file.name.replace(/\.pdf$/i, '') || 'インポートしたPDF'

    // PDFバイナリを保存（原本データも保持）
    await db.pdfDocuments.put({
      noteId,
      data: pdfBytes,
      originalData: pdfBytes,
      updatedAt: Date.now(),
    })

    // メタデータから既存ストロークがあれば復元
    const restoredMetadata = extractStrokesMetadata(pdfDoc)
    if (restoredMetadata) {
      for (const [pageNumStr, strokes] of Object.entries(restoredMetadata)) {
        const pageNumber = parseInt(pageNumStr, 10)
        await db.pageStrokes.put({
          id: `${noteId}_page_${pageNumber}`,
          noteId,
          pageNumber,
          strokes: strokes as Stroke[],
          updatedAt: Date.now(),
        })
      }
    }

    const newNote: NoteMetadata = {
      id: noteId,
      title,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      pageCount: Math.max(1, pageCount),
      isPdf: true,
      originalFileName: file.name,
    }

    await db.notes.add(newNote)
    setNotes((prev) => [newNote, ...prev])
    return newNote
  }, [])

  const deleteNote = useCallback(async (id: string) => {
    await db.notes.delete(id)
    await db.pdfDocuments.delete(id)
    await db.pageStrokes.where('noteId').equals(id).delete()
    setNotes((prev) => prev.filter((note) => note.id !== id))
  }, [])

  const updateNoteTitle = useCallback(async (id: string, newTitle: string) => {
    const title = newTitle.trim() || '無題のノート'
    await db.notes.update(id, { title, updatedAt: Date.now() })
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, title, updatedAt: Date.now() } : n))
    )
  }, [])

  return {
    notes,
    loading,
    createNote,
    importPdfNote,
    deleteNote,
    updateNoteTitle,
    reloadNotes: loadNotes,
  }
}

