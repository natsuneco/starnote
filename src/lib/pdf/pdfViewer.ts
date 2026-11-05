import * as pdfjsLib from 'pdfjs-dist'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

// Vite環境でWeb Workerを確実に初期化
if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker
}

const docCache = new Map<string, { promise: Promise<pdfjsLib.PDFDocumentProxy>; updatedAt: number }>()

/**
 * IndexedDB のバイナリデータから PDFDocumentProxy を取得（キャッシュ付き）
 */
export function getPdfDocumentProxy(
  noteId: string,
  data: Uint8Array,
  updatedAt: number
): Promise<pdfjsLib.PDFDocumentProxy> {
  const cached = docCache.get(noteId)
  if (cached && cached.updatedAt === updatedAt) {
    return cached.promise
  }

  // Uint8Array のコピーを渡す（Worker転送によるDetached ArrayBuffer対策）
  const dataCopy = new Uint8Array(data)
  const loadingTask = pdfjsLib.getDocument({
    data: dataCopy,
    cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.6.205/cmaps/',
    cMapPacked: true,
  })

  const promise = loadingTask.promise
  docCache.set(noteId, { promise, updatedAt })
  return promise
}

export function clearPdfDocumentCache(noteId?: string) {
  if (noteId) {
    docCache.delete(noteId)
  } else {
    docCache.clear()
  }
}
