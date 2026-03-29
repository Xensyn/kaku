import { useState, useRef, type CSSProperties } from 'react'
import { Play, Pause } from 'lucide-react'
import type { MediaBlock } from '../../types/card'
import { useMediaUrl } from '../../db/useMediaUrl'

interface MediaBlockDisplayProps {
  block: MediaBlock
}

export function MediaBlockDisplay({ block }: MediaBlockDisplayProps) {
  switch (block.type) {
    case 'text':
      return (
        <div style={textStyle}>
          {block.textContent || '(vide)'}
        </div>
      )
    case 'image':
      return <ImageDisplay mediaId={block.mediaId} />
    case 'audio':
      return <AudioDisplay mediaId={block.mediaId} />
    case 'video':
      return <VideoDisplay mediaId={block.mediaId} />
    case 'drawing':
      return <ImageDisplay mediaId={block.drawingPngId} />
    default:
      return null
  }
}

function ImageDisplay({ mediaId }: { mediaId?: string }) {
  const url = useMediaUrl(mediaId)
  if (!url) return null
  return (
    <img
      src={url}
      alt=""
      style={{
        width: '100%',
        maxHeight: '250px',
        objectFit: 'contain',
        borderRadius: 'var(--radius-sm)',
      }}
    />
  )
}

function AudioDisplay({ mediaId }: { mediaId?: string }) {
  const url = useMediaUrl(mediaId)
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  if (!url) return null

  const toggle = () => {
    if (isPlaying && audioRef.current) {
      audioRef.current.pause()
      setIsPlaying(false)
      return
    }
    const audio = new Audio(url)
    audio.onended = () => setIsPlaying(false)
    audio.play()
    audioRef.current = audio
    setIsPlaying(true)
  }

  return (
    <button onClick={(e) => { e.stopPropagation(); toggle() }} style={audioButtonStyle}>
      {isPlaying ? <Pause size={20} /> : <Play size={20} fill="currentColor" />}
      <span>{isPlaying ? 'Lecture...' : 'Écouter'}</span>
    </button>
  )
}

function VideoDisplay({ mediaId }: { mediaId?: string }) {
  const url = useMediaUrl(mediaId)
  if (!url) return null
  return (
    <video
      src={url}
      controls
      onClick={(e) => e.stopPropagation()}
      style={{
        width: '100%',
        maxHeight: '250px',
        borderRadius: 'var(--radius-sm)',
        background: '#000',
      }}
    />
  )
}

const textStyle: CSSProperties = {
  fontSize: '20px',
  lineHeight: 1.5,
  textAlign: 'center',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
}

const audioButtonStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '10px 20px',
  background: 'var(--accent-light)',
  color: 'var(--accent)',
  border: '1px solid var(--accent)',
  borderRadius: 'var(--radius)',
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: '14px',
  margin: '0 auto',
}
