import { useState, useRef, useEffect, type CSSProperties } from 'react'
import { Mic, Square, Play, Pause, Trash2 } from 'lucide-react'
import { useMediaUrl } from '../../db/useMediaUrl'
import { saveMedia, deleteMedia, getSupportedAudioMimeType } from '../../lib/media'
import { IconButton } from '../ui/IconButton'

interface AudioRecorderProps {
  mediaId?: string
  onChange: (mediaId: string | undefined) => void
}

export function AudioRecorder({ mediaId, onChange }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [duration, setDuration] = useState(0)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const timerRef = useRef<number>(0)
  const url = useMediaUrl(mediaId)

  // Nettoyer l'audio element
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = getSupportedAudioMimeType()
      const recorder = new MediaRecorder(stream, { mimeType })
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        const blob = new Blob(chunksRef.current, { type: mimeType })

        // Supprimer l'ancien media
        if (mediaId) await deleteMedia(mediaId)

        const id = await saveMedia(blob, 'audio', mimeType)
        onChange(id)
        setIsRecording(false)
      }

      recorder.start()
      recorderRef.current = recorder
      setIsRecording(true)
      setDuration(0)

      // Timer
      const start = Date.now()
      timerRef.current = window.setInterval(() => {
        setDuration(Math.floor((Date.now() - start) / 1000))
      }, 1000)
    } catch {
      // Permission refusée ou pas de micro
    }
  }

  const stopRecording = () => {
    if (recorderRef.current && recorderRef.current.state === 'recording') {
      recorderRef.current.stop()
    }
    clearInterval(timerRef.current)
  }

  const togglePlay = () => {
    if (!url) return
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

  const handleRemove = async () => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
    if (mediaId) await deleteMedia(mediaId)
    onChange(undefined)
    setIsPlaying(false)
  }

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`

  // Enregistrement en cours
  if (isRecording) {
    return (
      <div style={containerStyle}>
        <div style={recordingDotStyle} />
        <span style={{ color: 'var(--danger)', fontWeight: 600, fontSize: '14px' }}>
          {formatTime(duration)}
        </span>
        <IconButton onClick={stopRecording} label="Arrêter" style={{ color: 'var(--danger)' }}>
          <Square size={20} fill="currentColor" />
        </IconButton>
      </div>
    )
  }

  // Audio existant
  if (url && mediaId) {
    return (
      <div style={containerStyle}>
        <IconButton onClick={togglePlay} label={isPlaying ? 'Pause' : 'Écouter'} style={{ color: 'var(--accent)' }}>
          {isPlaying ? <Pause size={20} /> : <Play size={20} fill="currentColor" />}
        </IconButton>
        <span style={{ flex: 1, fontSize: '13px', color: 'var(--text-secondary)' }}>Audio</span>
        <IconButton onClick={handleRemove} label="Supprimer" size={32}>
          <Trash2 size={16} />
        </IconButton>
      </div>
    )
  }

  // Pas d'audio
  return (
    <div style={containerStyle} onClick={startRecording}>
      <Mic size={20} style={{ color: 'var(--text-muted)' }} />
      <span style={{ fontSize: '13px', color: 'var(--text-muted)', cursor: 'pointer' }}>
        Enregistrer un audio
      </span>
    </div>
  )
}

const containerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  padding: '12px 16px',
  background: 'var(--bg-elevated)',
  borderRadius: 'var(--radius)',
  border: '1px solid var(--border)',
  minHeight: 'var(--touch-min)',
}

const recordingDotStyle: CSSProperties = {
  width: '10px',
  height: '10px',
  borderRadius: '50%',
  background: 'var(--danger)',
  animation: 'fadeIn 0.5s ease infinite alternate',
}
