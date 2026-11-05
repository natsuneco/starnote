import { PDFDocument, PDFPage, rgb, type RGB } from 'pdf-lib'
import { getStroke } from 'perfect-freehand'
import type { Stroke } from '../../types/drawing'
import type { PageSize, PageTemplate } from '../../types/note'
import {
  PAGE_DIMENSIONS,
  getRuledConfig,
  getGridConfig,
  TEMPLATE_COLORS,
} from '../template/templateConstants'
import { embedStrokesMetadata } from './metadata'

/** 1 mm あたりの pt 換算比率 (72 pt / 25.4 mm) */
const PT_PER_MM = 72 / 25.4

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
 * ストロークの丸ペン輪郭ポリゴンから PDF 座標系の SVG パス文字列を生成
 * 注意: pdf-lib の drawSvgPath(svgPath, { x: 0, y: pageHeight }) は内部で
 * [1, 0, 0, -1, 0, pageHeight] 変換行列を適用するため、SVG パスは左上原点・Y軸下向き正のまま出力する
 */
function strokeToPdfSvgPath(
  stroke: Stroke,
  scaleX: number,
  scaleY: number
): string {
  if (!stroke.points || stroke.points.length < 2) return ''

  const inputPoints = stroke.points.map((p) => [p.x, p.y, p.pressure])

  const outline = getStroke(inputPoints, {
    size: stroke.size,
    thinning: 0,
    smoothing: 0.5,
    streamline: 0,
    start: {
      cap: true,
      taper: 0,
    },
    end: {
      cap: true,
      taper: 0,
    },
  })

  if (outline.length === 0) return ''

  // Canvas座標（左上原点）から SVG座標への変換
  const toSvgCoord = (x: number, y: number) => {
    const px = (x * scaleX).toFixed(2)
    const py = (y * scaleY).toFixed(2)
    return `${px} ${py}`
  }

  const startCoord = toSvgCoord(outline[0][0], outline[0][1])
  let d = `M ${startCoord}`
  for (let i = 1; i < outline.length; i++) {
    d += ` L ${toSvgCoord(outline[i][0], outline[i][1])}`
  }
  d += ' Z'
  return d
}

/**
 * PDF ページにテンプレート（B罫、A罫、5mm方眼）のベクター罫線を背景描画する
 */
export function renderTemplateToPdfPage(
  page: PDFPage,
  template: PageTemplate = 'blank',
  pageSize: PageSize = 'A4'
) {
  if (template === 'blank') return

  const pageWidth = page.getWidth()
  const pageHeight = page.getHeight()
  const lineColor = rgb(
    TEMPLATE_COLORS.pdfStroke.r,
    TEMPLATE_COLORS.pdfStroke.g,
    TEMPLATE_COLORS.pdfStroke.b
  )
  const thickness = TEMPLATE_COLORS.pdfStrokeWidthPt

  if (template === 'ruled-b' || template === 'ruled-a') {
    const config = getRuledConfig(pageSize, template)
    const x1 = config.sideMarginMm * PT_PER_MM
    const x2 = pageWidth - config.sideMarginMm * PT_PER_MM

    for (let i = 0; i <= config.lineCount; i++) {
      const topOffsetMm = config.topMarginMm + i * config.lineHeightMm
      // PDF座標系は左下原点のため上端から差し引く
      const y = pageHeight - topOffsetMm * PT_PER_MM

      if (y >= 0 && y <= pageHeight) {
        page.drawLine({
          start: { x: x1, y },
          end: { x: x2, y },
          thickness,
          color: lineColor,
        })
      }
    }
  } else if (template === 'grid-5mm') {
    const grid = getGridConfig(pageSize)
    const marginPt = grid.marginMm * PT_PER_MM
    const gridPt = grid.gridSizeMm * PT_PER_MM

    const xMin = marginPt
    const xMax = pageWidth - marginPt
    const yMin = marginPt
    const yMax = pageHeight - marginPt

    // 水平グリッド線
    for (let y = yMin; y <= yMax + 0.1; y += gridPt) {
      page.drawLine({
        start: { x: xMin, y },
        end: { x: xMax, y },
        thickness,
        color: lineColor,
      })
    }

    // 垂直グリッド線
    for (let x = xMin; x <= xMax + 0.1; x += gridPt) {
      page.drawLine({
        start: { x, y: yMin },
        end: { x, y: yMax },
        thickness,
        color: lineColor,
      })
    }
  }
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
    if (!stroke.points || stroke.points.length === 0) continue

    const color = parseColorToPdfRgb(stroke.color)
    const isHighlighter = stroke.tool === 'highlighter'
    const opacity = isHighlighter ? 0.45 : 1.0

    if (stroke.points.length === 1) {
      // 単一タップ: 正円ドット（半径 size / 2）
      const p = stroke.points[0]
      const px = p.x * scaleX
      const py = pageHeight - p.y * scaleY
      const radius = (stroke.size * scaleX) / 2
      try {
        page.drawCircle({
          x: px,
          y: py,
          size: radius,
          color,
          opacity,
        })
      } catch (err) {
        console.warn('Failed to draw dot to PDF page:', err)
      }
      continue
    }

    const svgPath = strokeToPdfSvgPath(stroke, scaleX, scaleY)
    if (!svgPath) continue

    try {
      page.drawSvgPath(svgPath, {
        x: 0,
        y: pageHeight,
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
  pageSize: PageSize = 'A4'
): Promise<PDFDocument> {
  const dim = PAGE_DIMENSIONS[pageSize] || PAGE_DIMENSIONS.A4
  const doc = await PDFDocument.create()
  for (let i = 0; i < pageCount; i++) {
    doc.addPage([dim.widthPt, dim.heightPt])
  }
  return doc
}

export interface ExportHybridPdfParams {
  /** 元となるPDFバイナリ（インポートしたPDFの場合）。省略時は新規白紙PDFを作成 */
  basePdfBytes?: Uint8Array
  /** ページ番号 (1-based) をキーとする各ページのストローク一覧 */
  pageStrokes: Record<number, Stroke[]>
  /** ノートの総ページ数 */
  pageCount: number
  /** 用紙サイズ (A4 / B5) */
  pageSize?: PageSize
  /** テンプレート種別 */
  template?: PageTemplate
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
    pageSize = 'A4',
    template = 'blank',
    canvasWidth = 840,
    canvasHeight,
  } = params

  let pdfDoc: PDFDocument
  if (basePdfBytes && basePdfBytes.length > 0) {
    pdfDoc = await PDFDocument.load(basePdfBytes, { ignoreEncryption: true })
  } else {
    pdfDoc = await createBlankPdfDocument(pageCount, pageSize)
  }

  // ページ数の調整（必要に応じて末尾に追加）
  while (pdfDoc.getPageCount() < pageCount) {
    const firstPage = pdfDoc.getPage(0)
    pdfDoc.addPage([firstPage.getWidth(), firstPage.getHeight()])
  }

  // 各ページにテンプレート罫線と手書きストロークを描画
  const totalPages = pdfDoc.getPageCount()
  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    const page = pdfDoc.getPage(pageNum - 1)

    // 1. 下敷きテンプレート罫線をベクター描画（元のインポートPDFがない場合のみ、または常にテンプレート適用）
    if (!basePdfBytes && template !== 'blank') {
      renderTemplateToPdfPage(page, template, pageSize)
    }

    // 2. 手書きストロークをベクター描画
    const strokes = pageStrokes[pageNum]
    if (strokes && strokes.length > 0) {
      const pWidth = page.getWidth()
      const pHeight = page.getHeight()
      const effectiveCanvasHeight =
        canvasHeight ?? Math.round((canvasWidth * pHeight) / pWidth)
      renderStrokesToPdfPage(page, strokes, canvasWidth, effectiveCanvasHeight)
    }
  }

  // StarNote の完全なストローク編集データを埋め込み
  await embedStrokesMetadata(pdfDoc, pageStrokes)

  // PDFバイナリを書き出し
  const pdfBytes = await pdfDoc.save()
  return pdfBytes
}
