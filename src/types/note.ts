export interface NoteMetadata {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  pageCount: number
  isPdf?: boolean
  originalFileName?: string
}

export interface PdfDocumentRecord {
  noteId: string
  data: Uint8Array
  updatedAt: number
}

