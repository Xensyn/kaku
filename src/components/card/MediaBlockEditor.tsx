import { useState, type CSSProperties } from 'react'
import { Trash2, GripVertical, Pencil } from 'lucide-react'
import type { MediaBlock } from '../../types/card'
import { ImagePicker } from './ImagePicker'
import { AudioRecorder } from './AudioRecorder'
import { VideoPicker } from './VideoPicker'
import { DrawingEditor } from '../drawing/DrawingEditor'
import { useMediaUrl } from '../../db/useMediaUrl'
import { IconButton } from '../ui/IconButton'

interface MediaBlockEditorProps {
  block: MediaBlock
  onUpdate: (block: MediaBlock) => void
  onRemove: () => void
  showRemove: boolean
}

export function MediaBlockEditor({ block, onUpdate, onRemove, showRemove }: MediaBlockEditorProps) {
  const [showDrawing, setShowDrawing] = useState(false)

  const renderEditor = () => {
    switch (block.type) {
      case 'text':
        return (
          <textarea
            style={textareaStyle}
            placeholder="Texte..."
            value={block.textContent || ''}
            onChange={(e) => onUpdate({ ...block, textContent: e.target.value })}
            rows={3}
          />
        )
      case 'image':
        return (
          <ImagePicker
            mediaId={block.mediaId}
            onChange={(mediaId) => onUpdate({ ...block, mediaId })}
          />
        )
      case 'audio':
        return (
          <AudioRecorder
            mediaId={block.mediaId}
            onChange={(mediaId) => onUpdate({ ...block, mediaId })}
          />
        )
      case 'video':
        return (
          <VideoPicker
            mediaId={block.mediaId}
            onChange={(mediaId) => onUpdate({ ...block, mediaId })}
          />
        )
      case 'drawing':
        return (
          <DrawingBlockEditor
            block={block}
            onUpdate={onUpdate}
            showDrawing={showDrawing}
            setShowDrawing={setShowDrawing}
          />
        )
      default:
        return null
    }
  }

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <GripVertical size={16} style={{ color: 'var(--text-muted)', cursor: 'grab' }} />
        <span style={typeLabel}>{TYPE_LABELS[block.type]}</span>
        {showRemove && (
          <IconButton onClick={onRemove} label="Supprimer le bloc" size={28}>
            <Trash2 size={14} />
          </IconButton>
        )}
      </div>
      {renderEditor()}
    </div>
  )
}

const TYPE_LABELS: Record<string, string> = {
  text: 'Texte',
  image: 'Image',
  audio: 'Audio',
  video: 'Vidéo',
  drawing: 'Dessin',
}

const containerStyle: CSSProperties = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
  overflow: 'hidden',
}

const headerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '6px 8px',
  background: 'var(--bg-elevated)',
  borderBottom: '1px solid var(--border)',
}

const typeLabel: CSSProperties = {
  flex: 1,
  fontSize: '11px',
  fontWeight: 600,
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
}

const textareaStyle: CSSProperties = {
  width: '100%',
  padding: '12px',
  background: 'transparent',
  border: 'none',
  color: 'var(--text-primary)',
  fontSize: '15px',
  lineHeight: 1.6,
  resize: 'vertical',
  fontFamily: 'inherit',
  minHeight: '80px',
}

// Sous-composant pour les blocs de dessin
function DrawingBlockEditor({
  block,
  onUpdate,
  showDrawing,
  setShowDrawing,
}: {
  block: MediaBlock
  onUpdate: (block: MediaBlock) => void
  showDrawing: boolean
  setShowDrawing: (v: boolean) => void
}) {
  const pngUrl = useMediaUrl(block.drawingPngId)

  if (showDrawing) {
    return (
      <DrawingEditor
        initialStrokes={block.drawingStrokes}
        drawingPngId={block.drawingPngId}
        onSave={(strokes, pngMediaId) => {
          onUpdate({ ...block, drawingStrokes: strokes, drawingPngId: pngMediaId })
          setShowDrawing(false)
        }}
        onCancel={() => setShowDrawing(false)}
      />
    )
  }

  if (pngUrl) {
    return (
      <div
        style={{ padding: '8px', cursor: 'pointer', position: 'relative' }}
        onClick={() => setShowDrawing(true)}
      >
        <img
          src={pngUrl}
          alt="Dessin"
          style={{ width: '100%', borderRadius: 'var(--radius-sm)', background: 'var(--bg-elevated)' }}
        />
        <div style={{
          position: 'absolute', bottom: '16px', right: '16px',
          background: 'var(--accent)', color: '#fff', borderRadius: '50%',
          width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Pencil size={16} />
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: '8px', padding: '24px', cursor: 'pointer',
      }}
      onClick={() => setShowDrawing(true)}
    >
      <Pencil size={24} style={{ color: 'var(--text-muted)' }} />
      <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Dessiner</span>
    </div>
  )
}
