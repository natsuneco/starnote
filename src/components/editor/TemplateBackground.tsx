import React, { useId } from 'react'
import type { PageSize, PageTemplate } from '../../types/note'
import {
  PAGE_DIMENSIONS,
  getRuledConfig,
  getGridConfig,
  TEMPLATE_COLORS,
} from '../../lib/template/templateConstants'

interface TemplateBackgroundProps {
  pageSize?: PageSize
  template?: PageTemplate
}

export const TemplateBackground: React.FC<TemplateBackgroundProps> = ({
  pageSize = 'A4',
  template = 'blank',
}) => {
  const patternId = useId()

  if (template === 'blank') {
    return null
  }

  const dim = PAGE_DIMENSIONS[pageSize] || PAGE_DIMENSIONS.A4

  if (template === 'ruled-b' || template === 'ruled-a') {
    const config = getRuledConfig(pageSize, template)
    const lines = []
    const x1 = config.sideMarginMm
    const x2 = dim.widthMm - config.sideMarginMm

    // lineCount本の行を作るため、lineCount + 1本の罫線を引く
    for (let i = 0; i <= config.lineCount; i++) {
      const y = config.topMarginMm + i * config.lineHeightMm
      lines.push(
        <line
          key={i}
          x1={x1}
          y1={y}
          x2={x2}
          y2={y}
          stroke={TEMPLATE_COLORS.stroke}
          strokeWidth={TEMPLATE_COLORS.strokeWidthMm}
          strokeLinecap="round"
        />
      )
    }

    return (
      <svg
        viewBox={`0 0 ${dim.widthMm} ${dim.heightMm}`}
        className="absolute inset-0 w-full h-full pointer-events-none select-none z-0"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {lines}
      </svg>
    )
  }

  if (template === 'grid-5mm') {
    const grid = getGridConfig(pageSize)
    const innerWidth = dim.widthMm - grid.marginMm * 2
    const innerHeight = dim.heightMm - grid.marginMm * 2

    return (
      <svg
        viewBox={`0 0 ${dim.widthMm} ${dim.heightMm}`}
        className="absolute inset-0 w-full h-full pointer-events-none select-none z-0"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <pattern
            id={patternId}
            width={grid.gridSizeMm}
            height={grid.gridSizeMm}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M ${grid.gridSizeMm} 0 L 0 0 0 ${grid.gridSizeMm}`}
              fill="none"
              stroke={TEMPLATE_COLORS.stroke}
              strokeWidth={TEMPLATE_COLORS.strokeWidthMm}
            />
          </pattern>
        </defs>
        <rect
          x={grid.marginMm}
          y={grid.marginMm}
          width={innerWidth}
          height={innerHeight}
          fill={`url(#${patternId})`}
          stroke={TEMPLATE_COLORS.stroke}
          strokeWidth={TEMPLATE_COLORS.strokeWidthMm}
        />
      </svg>
    )
  }

  return null
}
