import { useRef, type CSSProperties } from 'react'
import { ImagePlus, X } from 'lucide-react'
import { useMediaUrl } from '../../db/useMediaUrl'
import { saveMedia, deleteMedia, compressImage } from '../../lib/media'
import { IconButton } from '../ui/IconButton'

interface ImagePickerProps {
  mediaId?: string
  onChange: (mediaId: string | undefined) => void
}

export function ImagePicker({ mediaId, onChange }: ImagePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const url = useMediaUrl(mediaId)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Compresser si c'est une image
    let blob: Blob = file
    if (file.type.startsWith('image/') && file.size > 500_000) {
      try { blob = await compressImage(file) } catch { blob = file }
    }

    // Supprimer l'ancien media si existant
    if (mediaId) await deleteMedia(mediaId)

    const id = await saveMedia(blob, 'image', blob.type)
    onChange(id)
    // Réinitialiser l'input
    if (inputRef.current) inputRef.current.value = ''
  }

  const handleRemove = async () => {
    if (mediaId) await deleteMedia(mediaId)
    onChange(undefined)
  }

  if (url) {
    return (
      <div style={previewContainerStyle}>
        <img src={url} alt="" style={imageStyle} />
        <IconButton
          onClick={handleRemove}
          label="Supprimer l'image"
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
      <ImagePlus size={24} style={{ color: 'var(--text-muted)' }} />
      <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Ajouter une image</span>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
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
  transition: 'border-color var(--transition)',
}

const previewContainerStyle: CSSProperties = {
  position: 'relative',
  borderRadius: 'var(--radius)',
  overflow: 'hidden',
}

const imageStyle: CSSProperties = {
  width: '100%',
  maxHeight: '300px',
  objectFit: 'contain',
  display: 'block',
  borderRadius: 'var(--radius)',
  background: 'var(--bg-elevated)',
}

const removeButtonStyle: CSSProperties = {
  position: 'absolute',
  top: '8px',
  right: '8px',
  background: 'rgba(0,0,0,0.6)',
  color: '#fff',
  borderRadius: '50%',
}
