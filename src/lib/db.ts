import Dexie, { type Table } from 'dexie'
import type { NoteMetadata } from '../types/note'
import type { PageStrokesData } from '../types/drawing'

export class StarNoteDatabase extends Dexie {
  notes!: Table<NoteMetadata, string>
  pageStrokes!: Table<PageStrokesData, string>

  constructor() {
    super('StarNoteDB')
    this.version(2).stores({
      notes: 'id, title, updatedAt, createdAt',
      pageStrokes: 'id, noteId, pageNumber, [noteId+pageNumber], updatedAt',
    })
  }
}

export const db = new StarNoteDatabase()
