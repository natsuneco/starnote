import { useState } from 'react'
import { useNotes } from './hooks/useNotes'
import { HomeScreen } from './components/home/HomeScreen'
import { EditorScreen } from './components/editor/EditorScreen'

function App() {
  const { notes, loading, createNote, importPdfNote, deleteNote, updateNoteTitle } = useNotes()
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null)

  if (loading) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-slate-50 text-slate-400">
        <div className="animate-pulse text-sm font-medium">StarNote を読み込み中...</div>
      </div>
    )
  }

  const activeNote = notes.find((n) => n.id === activeNoteId)

  if (activeNote) {
    return (
      <EditorScreen
        note={activeNote}
        onBack={() => setActiveNoteId(null)}
        onUpdateTitle={(newTitle) => updateNoteTitle(activeNote.id, newTitle)}
      />
    )
  }

  return (
    <HomeScreen
      notes={notes}
      onSelectNote={(noteId) => setActiveNoteId(noteId)}
      onCreateNote={createNote}
      onImportPdfNote={importPdfNote}
      onDeleteNote={deleteNote}
    />
  )
}

export default App
