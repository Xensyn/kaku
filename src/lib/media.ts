// Helpers pour le stockage et la gestion des médias

import { v4 as uuid } from 'uuid'
import { db } from '../db/database'
import type { MediaRecord } from '../types/media'

// Sauvegarder un média (image, audio, video, dessin PNG)
export async function saveMedia(
  blob: Blob,
  type: MediaRecord['type'],
  mimeType?: string
): Promise<string> {
  const id = uuid()
  const record: MediaRecord = {
    id,
    type,
    mimeType: mimeType || blob.type,
    blob,
    size: blob.size,
    createdAt: new Date().toISOString(),
  }
  await db.media.add(record)
  return id
}

// Récupérer un média par ID
export async function getMedia(id: string): Promise<MediaRecord | undefined> {
  return db.media.get(id)
}

// Supprimer un média par ID
export async function deleteMedia(id: string): Promise<void> {
  await db.media.delete(id)
}

// Créer une URL blob temporaire pour affichage
export async function getMediaUrl(id: string): Promise<string | null> {
  const record = await db.media.get(id)
  if (!record) return null
  return URL.createObjectURL(record.blob)
}

// Convertir un File en Blob compressé (pour les images)
export async function compressImage(
  file: File,
  maxWidth: number = 1920,
  quality: number = 0.85
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      let { width, height } = img
      if (width > maxWidth) {
        height = (height * maxWidth) / width
        width = maxWidth
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('Canvas non supporté')); return }
      ctx.drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob)
          else reject(new Error('Compression échouée'))
        },
        'image/jpeg',
        quality
      )
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Image invalide'))
    }
    img.src = url
  })
}

// Détecter les types MIME supportés pour l'enregistrement audio
export function getSupportedAudioMimeType(): string {
  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
  ]
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) return type
  }
  return 'audio/webm'
}
