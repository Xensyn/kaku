import { useEffect, useRef, useCallback, type CSSProperties } from 'react'
import { Check } from 'lucide-react'
import { useDrawingStore } from '../../store/useDrawingStore'
import { DrawingCanvas } from './DrawingCanvas'
import { DrawingToolbar } from './DrawingToolbar'
import { Button } from '../ui/Button'
import { saveMedia, deleteMedia } from '../../lib/media'
import type { DrawingStroke } from '../../types/card'

interface DrawingEditorProps {
  initialStrokes?: DrawingStroke[]
  drawingPngId?: string
  onSave: (strokes: DrawingStroke[], pngMediaId: string) => void
  onCancel: () => void
}

export function DrawingEditor({ initialStrokes, drawingPngId, onSave, onCancel }: DrawingEditorProps) {
  const { strokes, setStrokes } = useDrawingStore()
  const hasInitialized = useRef(false)

  // Charger les traits existants une seule fois
  useEffect(() => {
    if (!hasInitialized.current) {
      setStrokes(initialStrokes || [])
      hasInitialized.current = true
    }
  }, [initialStrokes, setStrokes])

  const handleSave = useCallback(async () => {
    // Créer un canvas temporaire pour l'export PNG
    const canvas = document.querySelector('canvas')
    if (!canvas) return

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/png')
    })
    if (!blob) return

    // Supprimer l'ancien PNG si existant
    if (drawingPngId) {
      await deleteMedia(drawingPngId)
    }

    // Sauvegarder le nouveau PNG
    const pngId = await saveMedia(blob, 'drawing-png', 'image/png')

    onSave([...strokes], pngId)
  }, [strokes, drawingPngId, onSave])

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Annuler
        </Button>
        <span style={{ fontWeight: 600, fontSize: '15px' }}>Dessin</span>
        <Button size="sm" onClick={handleSave}>
          <Check size={16} />
          Valider
        </Button>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '8px' }}>
        <DrawingCanvas />
      </div>

      <DrawingToolbar />
    </div>
  )
}

const containerStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 2000,
  background: 'var(--bg-primary)',
  display: 'flex',
  flexDirection: 'column',
}

const headerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '8px 12px',
  borderBottom: '1px solid var(--border)',
  minHeight: 'var(--header-height)',
}
