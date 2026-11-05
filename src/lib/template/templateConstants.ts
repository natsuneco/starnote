import type { PageSize, PageTemplate } from '../../types/note'

export interface PageDimension {
  widthMm: number
  heightMm: number
  widthPt: number
  heightPt: number
}

export const PAGE_DIMENSIONS: Record<PageSize, PageDimension> = {
  A4: {
    widthMm: 210,
    heightMm: 297,
    widthPt: 595.28,
    heightPt: 841.89,
  },
  B5: {
    widthMm: 182,
    heightMm: 257,
    widthPt: 515.91,
    heightPt: 728.5,
  },
}

export interface RuledLineConfig {
  lineHeightMm: number
  lineCount: number
  topMarginMm: number
  sideMarginMm: number
}

export interface GridConfig {
  gridSizeMm: number
  marginMm: number
}

export const TEMPLATE_COLORS = {
  stroke: '#cbd5e1', // Slate-300
  strokeWidthMm: 0.3,
  pdfStroke: { r: 0.8, g: 0.84, b: 0.88 }, // Light slate
  pdfStrokeWidthPt: 0.6,
}

export function getRuledConfig(pageSize: PageSize, template: 'ruled-b' | 'ruled-a'): RuledLineConfig {
  const dim = PAGE_DIMENSIONS[pageSize]
  if (template === 'ruled-b') {
    // 6mm pitch
    if (pageSize === 'A4') {
      // 40 lines (41 horizontal lines)
      return {
        lineHeightMm: 6,
        lineCount: 40,
        topMarginMm: (dim.heightMm - 6 * 40) / 2, // 28.5mm
        sideMarginMm: 15,
      }
    } else {
      // B5: 35 lines (36 horizontal lines)
      return {
        lineHeightMm: 6,
        lineCount: 35,
        topMarginMm: (dim.heightMm - 6 * 35) / 2, // 23.5mm
        sideMarginMm: 12,
      }
    }
  } else {
    // 7mm pitch
    if (pageSize === 'A4') {
      // 35 lines (36 horizontal lines)
      return {
        lineHeightMm: 7,
        lineCount: 35,
        topMarginMm: (dim.heightMm - 7 * 35) / 2, // 26.0mm
        sideMarginMm: 15,
      }
    } else {
      // B5: 30 lines (31 horizontal lines)
      return {
        lineHeightMm: 7,
        lineCount: 30,
        topMarginMm: (dim.heightMm - 7 * 30) / 2, // 23.5mm
        sideMarginMm: 12,
      }
    }
  }
}

export function getGridConfig(_pageSize?: PageSize): GridConfig {
  return {
    gridSizeMm: 5,
    marginMm: 10,
  }
}

export const TEMPLATE_LABELS: Record<PageTemplate, { label: string; description: string }> = {
  blank: {
    label: '白紙',
    description: 'プレーンな無地の用紙',
  },
  'ruled-b': {
    label: 'B罫 (6mm)',
    description: '40行 (A4) / 35行 (B5) レポート・ノート用',
  },
  'ruled-a': {
    label: 'A罫 (7mm)',
    description: '35行 (A4) / 30行 (B5) ゆったり書ける罫線',
  },
  'grid-5mm': {
    label: '5mm 方眼',
    description: '図形や表が書きやすい正方形グリッド',
  },
}
