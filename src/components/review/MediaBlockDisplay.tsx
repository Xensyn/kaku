import { useState, useRef, useCallback, type CSSProperties } from 'react'
import { Play, Pause, Volume2, VolumeX } from 'lucide-react'
import { marked } from 'marked'
import 'katex/dist/katex.min.css'
import type { MediaBlock } from '../../types/card'
import { useMediaUrl } from '../../db/useMediaUrl'
import { renderMathInHtml } from '../../lib/mathRenderer'

interface MediaBlockDisplayProps {
  block: MediaBlock
}

export function MediaBlockDisplay({ block }: MediaBlockDisplayProps) {
  switch (block.type) {
    case 'text':
      return <TextDisplay content={block.textContent || ''} />
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

// Convertit le Markdown en HTML puis rend les formules LaTeX
function parseContent(text: string): string {
  if (!text) return ''
  const html = marked.parse(text, { async: false }) as string
  return renderMathInHtml(html)
}

function TextDisplay({ content }: { content: string }) {
  const [isSpeaking, setIsSpeaking] = useState(false)

  const handleSpeak = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      const synth = window.speechSynthesis
      if (!synth) return

      if (isSpeaking) {
        synth.cancel()
        setIsSpeaking(false)
        return
      }

      // Supprimer le Markdown/HTML pour la synthèse vocale
      const plainText = content
        .replace(/\$\$[^$]+?\$\$/gs, 'formule')
        .replace(/\$[^$\n]+?\$/g, 'formule')
        .replace(/[*_`#>~\[\]()]/g, '')

      const utterance = new SpeechSynthesisUtterance(plainText)
      utterance.lang = 'fr-FR'
      utterance.onend = () => setIsSpeaking(false)
      utterance.onerror = () => setIsSpeaking(false)

      synth.speak(utterance)
      setIsSpeaking(true)
    },
    [content, isSpeaking]
  )

  const html = parseContent(content || '(vide)')

  return (
    <div style={textWrapperStyle}>
      <div
        className="markdown-body"
        style={textStyle}
        // biome-ignore lint/security/noDangerouslySetInnerHtml: contenu local, pas d'entrée utilisateur externe
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {content && (
        <button
          onClick={handleSpeak}
          style={{
            ...ttsButtonStyle,
            color: isSpeaking ? 'var(--accent)' : 'var(--text-muted)',
          }}
          title={isSpeaking ? 'Arrêter la lecture' : 'Lire à voix haute'}
        >
          {isSpeaking ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
      )}
    </div>
  )
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

const textWrapperStyle: CSSProperties = {
  position: 'relative',
}

const textStyle: CSSProperties = {
  fontSize: '20px',
  lineHeight: 1.5,
  textAlign: 'center',
  wordBreak: 'break-word',
}

const ttsButtonStyle: CSSProperties = {
  position: 'absolute',
  top: 0,
  right: 0,
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: '4px',
  borderRadius: 'var(--radius-sm)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'color var(--transition)',
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
