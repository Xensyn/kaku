// Types pour le stockage des médias

export interface MediaRecord {
  id: string
  type: 'image' | 'audio' | 'video' | 'drawing-png'
  mimeType: string
  blob: Blob
  size: number // Octets
  createdAt: string
}
