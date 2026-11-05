import { useState, useEffect, useRef, useCallback } from 'react'
import { db } from '../lib/db'
import { exportHybridPdf } from '../lib/pdf/generator'
import { extractStrokesMetadataFromBytes } from '../lib/pdf/metadata'
import type { Stroke } from '../types/drawing'

export function usePdfSync(noteId: string, pageCount: number) {
  const [isSavingPdf, setIsSavingPdf] = useState(false)
  const [lastSavedTime, setLastSavedTime] = useState<number | null>(null)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isDirtyRef = useRef(false)

  // 1. 初回ロード時: PDFドキュメント内に埋め込まれたメタデータがあれば pageStrokes を復元
  useEffect(() => {
    let isMounted = true
    async function restoreFromPdfIfEmpty() {
      try {
        const pdfRecord = await db.pdfDocuments.get(noteId)
        if (!pdfRecord || !isMounted) return

        // 既存の pageStrokes があるか確認
        const existingPageStrokes = await db.pageStrokes.where('noteId').equals(noteId).count()
        if (existingPageStrokes > 0) {
          // すでにキャッシュがある場合はスキップ
          return
        }

        // PDFの添付メタデータから復元
        const metadata = await extractStrokesMetadataFromBytes(pdfRecord.data)
        if (metadata && isMounted) {
          for (const [pageNumStr, strokes] of Object.entries(metadata)) {
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
      } catch (err) {
        console.warn('Failed to restore strokes from PDF record:', err)
      }
    }

    restoreFromPdfIfEmpty()
    return () => {
      isMounted = false
    }
  }, [noteId])

  // 2. ハイブリッドPDFの非同期コンパイル＆保存処理
  const compileAndSavePdf = useCallback(async () => {
    try {
      setIsSavingPdf(true)

      // 全ページのストロークを取得
      const records = await db.pageStrokes.where('noteId').equals(noteId).toArray()
      const pageStrokes: Record<number, Stroke[]> = {}
      for (const rec of records) {
        pageStrokes[rec.pageNumber] = rec.strokes
      }

      // 元のPDFバイナリが存在するか確認
      const existingDoc = await db.pdfDocuments.get(noteId)
      const basePdfBytes = existingDoc?.data

      // ハイブリッドPDFを生成
      const pdfBytes = await exportHybridPdf({
        basePdfBytes,
        pageStrokes,
        pageCount,
      })

      // IndexedDB の pdfDocuments テーブルに永続化
      await db.pdfDocuments.put({
        noteId,
        data: pdfBytes,
        updatedAt: Date.now(),
      })

      isDirtyRef.current = false
      setLastSavedTime(Date.now())
    } catch (err) {
      console.error('Failed to compile and save hybrid PDF:', err)
    } finally {
      setIsSavingPdf(false)
    }
  }, [noteId, pageCount])

  // 3. 描画更新の通知（デバウンスでPDF保存を発火）
  const notifyDrawingUpdated = useCallback(() => {
    isDirtyRef.current = true
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    // アイドル3秒後にバックグラウンド保存
    debounceTimerRef.current = setTimeout(() => {
      compileAndSavePdf()
    }, 3000)
  }, [compileAndSavePdf])

  // 4. アンマウント（ノート離脱）時に未保存の変更があれば直ちに保存
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
      if (isDirtyRef.current) {
        // 非同期で即座に保存実行
        compileAndSavePdf()
      }
    }
  }, [compileAndSavePdf])

  // 5. PDFのダウンロードエクスポート
  const exportAndDownloadPdf = useCallback(
    async (title = 'note') => {
      try {
        setIsSavingPdf(true)
        // 最新のPDFを取得またはコンパイル
        const records = await db.pageStrokes.where('noteId').equals(noteId).toArray()
        const pageStrokes: Record<number, Stroke[]> = {}
        for (const rec of records) {
          pageStrokes[rec.pageNumber] = rec.strokes
        }

        const existingDoc = await db.pdfDocuments.get(noteId)
        const basePdfBytes = existingDoc?.data

        const pdfBytes = await exportHybridPdf({
          basePdfBytes,
          pageStrokes,
          pageCount,
        })

        // ブラウザダウンロード
        const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${title.endsWith('.pdf') ? title : `${title}.pdf`}`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)

        setLastSavedTime(Date.now())
      } catch (err) {
        console.error('Failed to export and download PDF:', err)
      } finally {
        setIsSavingPdf(false)
      }
    },
    [noteId, pageCount]
  )

  return {
    isSavingPdf,
    lastSavedTime,
    notifyDrawingUpdated,
    compileAndSavePdf,
    exportAndDownloadPdf,
  }
}
