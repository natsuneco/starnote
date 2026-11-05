import Dexie, { type Table } from 'dexie'
import type { NoteMetadata } from '../types/note'

export class StarNoteDatabase extends Dexie {
  notes!: Table<NoteMetadata, string>

  constructor() {
    super('StarNoteDB')
    this.version(1).stores({
      notes: 'id, title, updatedAt, createdAt',
    })
  }
}

export const db = new StarNoteDatabase()
