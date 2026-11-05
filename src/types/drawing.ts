export interface StrokePoint {
  x: number
  y: number
  pressure: number
}

export interface Bounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

export type StrokeTool = 'pen' | 'highlighter'

export type EraserMode = 'stroke' | 'precision'

export interface Stroke {
  id: string
  tool: StrokeTool
  color: string
  size: number
  points: StrokePoint[]
  bounds: Bounds
  createdAt: number
}

export interface PageStrokesData {
  id?: string // Dexie composite key or unique id
  noteId: string
  pageNumber: number
  strokes: Stroke[]
  updatedAt: number
}
