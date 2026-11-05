import { useState, useEffect, useCallback } from 'react'
import { db } from '../lib/db'
import type { NoteMetadata } from '../types/note'

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

  const createNote = useCallback(async (title: string): Promise<NoteMetadata> => {
    const newNote: NoteMetadata = {
      id: `note-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title: title.trim() || '無題のノート',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      pageCount: 1,
    }
    await db.notes.add(newNote)
    setNotes((prev) => [newNote, ...prev])
    return newNote
  }, [])

  const deleteNote = useCallback(async (id: string) => {
    await db.notes.delete(id)
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
    deleteNote,
    updateNoteTitle,
    reloadNotes: loadNotes,
  }
}
