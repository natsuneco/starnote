import React, { useEffect, useRef, useState } from 'react'
import { db } from '../../lib/db'
import { getPdfDocumentProxy } from '../../lib/pdf/pdfViewer'
import type { PDFPageProxy, RenderTask } from 'pdfjs-dist'

export interface PdfPageBackgroundProps {
  noteId: string
  pageNumber: number
  onAspectRatioLoaded?: (aspectRatio: number) => void
}

export const PdfPageBackground: React.FC<PdfPageBackgroundProps> = ({
  noteId,
  pageNumber,
  onAspectRatioLoaded,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const renderTaskRef = useRef<RenderTask | null>(null)
  const pageProxyRef = useRef<PDFPageProxy | null>(null)

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 1. PDF ページのロード
  useEffect(() => {
    let isCancelled = false

    async function loadPdfPage() {
      try {
        setIsLoading(true)
        setError(null)

        const pdfRecord = await db.pdfDocuments.get(noteId)
        if (!pdfRecord) {
          throw new Error('PDF document not found in storage')
        }

        const data = pdfRecord.originalData || pdfRecord.data
        const pdfDoc = await getPdfDocumentProxy(noteId, data, pdfRecord.updatedAt)

        if (isCancelled) return

        if (pageNumber > pdfDoc.numPages) {
          // ページ番号が超過している場合はスキップ
          pageProxyRef.current = null
          setIsLoading(false)
          return
        }

        const page = await pdfDoc.getPage(pageNumber)
        if (isCancelled) return

        pageProxyRef.current = page

        // アスペクト比の通知（幅 / 高さ）
        const unscaledViewport = page.getViewport({ scale: 1 })
        if (unscaledViewport.height > 0 && onAspectRatioLoaded) {
          onAspectRatioLoaded(unscaledViewport.width / unscaledViewport.height)
        }

        setIsLoading(false)
        renderPage()
      } catch (err: unknown) {
        if (!isCancelled) {
          console.error(`Failed to load PDF page ${pageNumber}:`, err)
          setError(err instanceof Error ? err.message : 'Failed to load PDF page')
          setIsLoading(false)
        }
      }
    }

    loadPdfPage()

    return () => {
      isCancelled = true
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel()
        } catch {
          // キャンセル例外は無視
        }
      }
    }
  }, [noteId, pageNumber])

  // 2. Canvas へのレンダリング
  const renderPage = () => {
    const page = pageProxyRef.current
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!page || !container || !canvas) return

    const rect = container.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return

    // 前回のレンダリング処理をキャンセル
    if (renderTaskRef.current) {
      try {
        renderTaskRef.current.cancel()
      } catch {
        // キャンセルエラー無視
      }
      renderTaskRef.current = null
    }

    const dpr = Math.min(window.devicePixelRatio || 1, 3)
    const targetWidth = Math.round(rect.width * dpr)
    const targetHeight = Math.round(rect.height * dpr)

    canvas.width = targetWidth
    canvas.height = targetHeight

    const unscaledViewport = page.getViewport({ scale: 1 })
    // 親コンテナの横幅基準でスケールを決定
    const scale = targetWidth / unscaledViewport.width
    const viewport = page.getViewport({ scale })

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const task = page.render({
      canvasContext: ctx,
      viewport,
      canvas,
    })
    renderTaskRef.current = task

    task.promise
      .then(() => {
        if (renderTaskRef.current === task) {
          renderTaskRef.current = null
        }
      })
      .catch((err: unknown) => {
        // RenderingCancelledException 以外のエラーのみ出力
        if (err && typeof err === 'object' && 'name' in err && err.name === 'RenderingCancelledException') {
          return
        }
        console.warn(`Render cancelled or failed for page ${pageNumber}:`, err)
      })
  }

  // 3. コンテナサイズ変化の監視 (ズームやリサイズ時に高精細再描画)
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let debounceTimer: ReturnType<typeof setTimeout> | null = null

    const observer = new ResizeObserver(() => {
      if (debounceTimer) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        renderPage()
      }, 100)
    })

    observer.observe(container)

    return () => {
      observer.disconnect()
      if (debounceTimer) clearTimeout(debounceTimer)
    }
  }, [isLoading])

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 w-full h-full pointer-events-none select-none overflow-hidden"
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full object-contain pointer-events-none"
        style={{
          display: isLoading || error ? 'none' : 'block',
        }}
      />

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-50/60 backdrop-blur-xs">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <span className="w-3.5 h-3.5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <span>PDF読み込み中...</span>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-rose-50/50 p-4">
          <span className="text-xs text-rose-500">PDFページの読み込みに失敗しました</span>
        </div>
      )}
    </div>
  )
}
