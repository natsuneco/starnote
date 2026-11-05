export type PageSize = 'A4' | 'B5'

export type PageTemplate = 'blank' | 'ruled-b' | 'ruled-a' | 'grid-5mm'

export interface NoteMetadata {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  pageCount: number
  isPdf?: boolean
  originalFileName?: string
  pageSize?: PageSize
  template?: PageTemplate
}

export interface PdfDocumentRecord {
  noteId: string
  data: Uint8Array
  originalData?: Uint8Array
  updatedAt: number
}
