import { PDFDocument, PDFPage, rgb, type RGB } from 'pdf-lib'
import { getStroke } from 'perfect-freehand'
import type { Stroke } from '../../types/drawing'
import { embedStrokesMetadata } from './metadata'

/** A4 縦向き標準サイズ (pt: 1/72 inch) */
export const A4_WIDTH_PT = 595.28
export const A4_HEIGHT_PT = 841.89

/**
 * 16進数カラーコード（#RRGGBB または #RGB）を pdf-lib の RGB オブジェクトに変換
 */
function parseColorToPdfRgb(hexColor: string): RGB {
  let hex = hexColor.replace(/^#/, '')
  if (hex.length === 3) {
    hex = hex
      .split('')
      .map((c) => c + c)
      .join('')
  }

  const num = parseInt(hex, 16)
  if (isNaN(num) || hex.length !== 6) {
    return rgb(0, 0, 0)
  }

  const r = ((num >> 16) & 255) / 255
  const g = ((num >> 8) & 255) / 255
  const b = (num & 255) / 255
  return rgb(r, g, b)
}

/**
 * ストロークの perfect-freehand 輪郭ポリゴンから PDF 座標系の SVG パス文字列を生成
 */
function strokeToPdfSvgPath(
  stroke: Stroke,
  scaleX: number,
  scaleY: number,
  pageHeight: number
): string {
  const isHighlighter = stroke.tool === 'highlighter'
  const inputPoints = stroke.points.map((p) => [p.x, p.y, p.pressure])

  const outline = getStroke(inputPoints, {
    size: stroke.size,
    thinning: isHighlighter ? 0.1 : 0.6,
    smoothing: 0.5,
    streamline: 0.55,
    easing: (t) => t,
    start: {
      cap: true,
      taper: isHighlighter ? 0 : stroke.size * 0.5,
    },
    end: {
      cap: true,
      taper: isHighlighter ? 0 : stroke.size * 0.5,
    },
  })

  if (outline.length === 0) return ''

  // Canvas座標（左上原点）から PDF座標（左下原点）への変換
  const toPdfCoord = (x: number, y: number) => {
    const px = (x * scaleX).toFixed(2)
    const py = (pageHeight - y * scaleY).toFixed(2)
    return `${px} ${py}`
  }

  const startCoord = toPdfCoord(outline[0][0], outline[0][1])
  let d = `M ${startCoord}`
  for (let i = 1; i < outline.length; i++) {
    d += ` L ${toPdfCoord(outline[i][0], outline[i][1])}`
  }
  d += ' Z'
  return d
}

/**
 * 単一の PDF ページに手書きストローク群をベクターグラフィックスとして描画する
 */
export function renderStrokesToPdfPage(
  page: PDFPage,
  strokes: Stroke[],
  canvasWidth: number,
  canvasHeight: number
) {
  if (strokes.length === 0 || canvasWidth <= 0 || canvasHeight <= 0) return

  const pageWidth = page.getWidth()
  const pageHeight = page.getHeight()
  const scaleX = pageWidth / canvasWidth
  const scaleY = pageHeight / canvasHeight

  for (const stroke of strokes) {
    if (stroke.points.length === 0) continue

    const svgPath = strokeToPdfSvgPath(stroke, scaleX, scaleY, pageHeight)
    if (!svgPath) continue

    const color = parseColorToPdfRgb(stroke.color)
    const isHighlighter = stroke.tool === 'highlighter'
    const opacity = isHighlighter ? 0.45 : 1.0

    try {
      page.drawSvgPath(svgPath, {
        color,
        opacity,
      })
    } catch (err) {
      console.warn('Failed to draw stroke to PDF page:', err)
    }
  }
}

/**
 * 白紙の PDF ドキュメントを新規作成する
 */
export async function createBlankPdfDocument(
  pageCount = 1,
  width = A4_WIDTH_PT,
  height = A4_HEIGHT_PT
): Promise<PDFDocument> {
  const doc = await PDFDocument.create()
  for (let i = 0; i < pageCount; i++) {
    doc.addPage([width, height])
  }
  return doc
}

export interface ExportHybridPdfParams {
  /** 元となるPDFバイナリ（インポートしたPDFの場合）。省略時は白紙PDFを作成 */
  basePdfBytes?: Uint8Array
  /** ページ番号 (1-based) をキーとする各ページのストローク一覧 */
  pageStrokes: Record<number, Stroke[]>
  /** ノートの総ページ数 */
  pageCount: number
  /** エディタCanvasの基準幅（省略時はA4比率） */
  canvasWidth?: number
  /** エディタCanvasの基準高さ（省略時はA4比率） */
  canvasHeight?: number
}

/**
 * 閲覧用ベクター手書きグラフィックスと再編集用メタデータを併せ持つハイブリッドPDFを生成・保存する
 */
export async function exportHybridPdf(params: ExportHybridPdfParams): Promise<Uint8Array> {
  const {
    basePdfBytes,
    pageStrokes,
    pageCount,
    canvasWidth = 794, // 96 DPI A4 基準
    canvasHeight = 1123,
  } = params

  let pdfDoc: PDFDocument
  if (basePdfBytes && basePdfBytes.length > 0) {
    pdfDoc = await PDFDocument.load(basePdfBytes, { ignoreEncryption: true })
  } else {
    pdfDoc = await createBlankPdfDocument(pageCount)
  }

  // ページ数の調整（必要に応じて末尾に追加）
  while (pdfDoc.getPageCount() < pageCount) {
    const firstPage = pdfDoc.getPage(0)
    pdfDoc.addPage([firstPage.getWidth(), firstPage.getHeight()])
  }

  // 各ページにストロークをベクター描画
  const totalPages = pdfDoc.getPageCount()
  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    const strokes = pageStrokes[pageNum]
    if (strokes && strokes.length > 0) {
      const page = pdfDoc.getPage(pageNum - 1)
      renderStrokesToPdfPage(page, strokes, canvasWidth, canvasHeight)
    }
  }

  // StarNote の完全なストローク編集データを埋め込み
  await embedStrokesMetadata(pdfDoc, pageStrokes)

  // PDFバイナリを書き出し
  const pdfBytes = await pdfDoc.save()
  return pdfBytes
}
