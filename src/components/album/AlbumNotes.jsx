import { useState } from 'react'

// Nota personal de un álbum dentro de la AlbumCard.
// Muestra la nota (o un "+ Añadir nota") y permite editarla inline.
export default function AlbumNotes({ notes, onSave, disabled }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(notes || '')
  const [saving, setSaving] = useState(false)

  const start = () => {
    setValue(notes || '')
    setEditing(true)
  }

  const cancel = () => {
    setValue(notes || '')
    setEditing(false)
  }

  const save = async () => {
    setSaving(true)
    try {
      await onSave(value)
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  if (editing) {
    return (
      <div className="mt-2">
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={2}
          maxLength={500}
          autoFocus
          placeholder="Tu nota sobre este álbum..."
          className="w-full bg-gray-800 text-gray-200 text-xs rounded-lg p-2 outline-none resize-none placeholder-gray-500 focus:ring-1 focus:ring-gray-600"
        />
        <div className="flex gap-1.5 mt-1">
          <button
            onClick={save}
            disabled={saving}
            className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-700 hover:bg-gray-600 text-white transition-colors disabled:opacity-50"
          >
            {saving ? '...' : 'Guardar'}
          </button>
          <button
            onClick={cancel}
            disabled={saving}
            className="text-xs font-medium px-2.5 py-1 rounded-full text-gray-400 hover:text-white transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
        </div>
      </div>
    )
  }

  if (notes) {
    return (
      <button
        onClick={start}
        disabled={disabled}
        className="mt-2 text-left w-full group disabled:opacity-50"
        title="Editar nota"
      >
        <p className="text-gray-400 text-xs italic line-clamp-2 group-hover:text-gray-300 transition-colors">
          “{notes}”
        </p>
      </button>
    )
  }

  return (
    <button
      onClick={start}
      disabled={disabled}
      className="mt-2 text-gray-600 hover:text-gray-400 text-xs transition-colors disabled:opacity-50"
    >
      + Añadir nota
    </button>
  )
}
