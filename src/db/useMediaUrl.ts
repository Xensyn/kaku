// Hook pour charger une URL blob depuis un mediaId

import { useState, useEffect } from 'react'
import { db } from './database'

export function useMediaUrl(mediaId: string | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!mediaId) { setUrl(null); return }

    let objectUrl: string | null = null

    db.media.get(mediaId).then((record) => {
      if (record) {
        objectUrl = URL.createObjectURL(record.blob)
        setUrl(objectUrl)
      }
    })

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [mediaId])

  return url
}
