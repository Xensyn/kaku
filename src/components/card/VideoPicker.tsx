import { useRef, type CSSProperties } from 'react'
import { Video, X } from 'lucide-react'
import { useMediaUrl } from '../../db/useMediaUrl'
import { saveMedia, deleteMedia } from '../../lib/media'
import { IconButton } from '../ui/IconButton'

interface VideoPickerProps {
  mediaId?: string
  onChange: (mediaId: string | undefined) => void
}

export function VideoPicker({ mediaId, onChange }: VideoPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const url = useMediaUrl(mediaId)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (mediaId) await deleteMedia(mediaId)

    const id = await saveMedia(file, 'video', file.type)
    onChange(id)
    if (inputRef.current) inputRef.current.value = ''
  }

  const handleRemove = async () => {
    if (mediaId) await deleteMedia(mediaId)
    onChange(undefined)
  }

  if (url) {
    return (
      <div style={previewContainerStyle}>
        <video src={url} controls style={videoStyle} />
        <IconButton
          onClick={handleRemove}
          label="Supprimer la vidéo"
          size={32}
          style={removeButtonStyle}
        >
          <X size={16} />
        </IconButton>
      </div>
    )
  }

  return (
    <div style={pickerStyle} onClick={() => inputRef.current?.click()}>
      <Video size={24} style={{ color: 'var(--text-muted)' }} />
      <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Ajouter une vidéo</span>
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />
    </div>
  )
}

const pickerStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  padding: '24px',
  border: '2px dashed var(--border)',
  borderRadius: 'var(--radius)',
  cursor: 'pointer',
  minHeight: '100px',
}

const previewContainerStyle: CSSProperties = {
  position: 'relative',
  borderRadius: 'var(--radius)',
  overflow: 'hidden',
}

const videoStyle: CSSProperties = {
  width: '100%',
  maxHeight: '300px',
  display: 'block',
  borderRadius: 'var(--radius)',
  background: '#000',
}

const removeButtonStyle: CSSProperties = {
  position: 'absolute',
  top: '8px',
  right: '8px',
  background: 'rgba(0,0,0,0.6)',
  color: '#fff',
  borderRadius: '50%',
}
