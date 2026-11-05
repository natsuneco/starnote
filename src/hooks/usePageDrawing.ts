import { useState, useEffect, useCallback, useRef } from 'react'
import { db } from '../lib/db'
import type { Stroke } from '../types/drawing'

export function usePageDrawing(noteId: string, pageNumber: number) {
  const [strokes, setStrokes] = useState<Stroke[]>([])
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)
  const [loading, setLoading] = useState(true)

  // 内部状態の正本を ref で保持（StrictMode や連続呼び出しでの不整合を防止）
  const strokesRef = useRef<Stroke[]>([])
  const historyRef = useRef<Stroke[][]>([])
  const redoStackRef = useRef<Stroke[][]>([])

  const pageKey = `${noteId}_page_${pageNumber}`

  // UI 状態を ref から更新するヘルパー
  const syncUiState = useCallback(() => {
    setStrokes([...strokesRef.current])
    setCanUndo(historyRef.current.length > 1)
    setCanRedo(redoStackRef.current.length > 0)
  }, [])

  // 1. IndexedDB からページストロークを読み込み
  useEffect(() => {
    let isMounted = true
    async function loadPageStrokes() {
      try {
        setLoading(true)
        const record = await db.pageStrokes.get(pageKey)
        if (isMounted) {
          const loadedStrokes = record ? record.strokes : []
          strokesRef.current = loadedStrokes
          historyRef.current = [loadedStrokes]
          redoStackRef.current = []
          syncUiState()
        }
      } catch (err) {
        console.error('Failed to load page strokes:', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadPageStrokes()
    return () => {
      isMounted = false
    }
  }, [noteId, pageNumber, pageKey, syncUiState])

  // 2. IndexedDB への保存処理
  const persistStrokes = useCallback(
    async (strokesToSave: Stroke[]) => {
      try {
        await db.pageStrokes.put({
          id: pageKey,
          noteId,
          pageNumber,
          strokes: strokesToSave,
          updatedAt: Date.now(),
        })
        await db.notes.update(noteId, { updatedAt: Date.now() })
      } catch (err) {
        console.error('Failed to save page strokes:', err)
      }
    },
    [noteId, pageNumber, pageKey]
  )

  // 3. ストロークの追加
  const addStroke = useCallback(
    (stroke: Stroke) => {
      const next = [...strokesRef.current, stroke]
      strokesRef.current = next
      historyRef.current.push(next)
      redoStackRef.current = []

      syncUiState()
      persistStrokes(next)
    },
    [persistStrokes, syncUiState]
  )

  // 4. ストロークの一括更新 (消しゴム操作後など)
  const applyStrokesUpdate = useCallback(
    (newStrokes: Stroke[]) => {
      strokesRef.current = newStrokes
      historyRef.current.push(newStrokes)
      redoStackRef.current = []

      syncUiState()
      persistStrokes(newStrokes)
    },
    [persistStrokes, syncUiState]
  )

  // 5. Undo
  const undo = useCallback(() => {
    if (historyRef.current.length <= 1) return

    const current = historyRef.current.pop()!
    redoStackRef.current.push(current)

    const previous = historyRef.current[historyRef.current.length - 1]
    strokesRef.current = previous

    syncUiState()
    persistStrokes(previous)
  }, [persistStrokes, syncUiState])

  // 6. Redo
  const redo = useCallback(() => {
    if (redoStackRef.current.length === 0) return

    const next = redoStackRef.current.pop()!
    historyRef.current.push(next)
    strokesRef.current = next

    syncUiState()
    persistStrokes(next)
  }, [persistStrokes, syncUiState])

  return {
    strokes,
    loading,
    addStroke,
    applyStrokesUpdate,
    undo,
    redo,
    canUndo,
    canRedo,
  }
}
