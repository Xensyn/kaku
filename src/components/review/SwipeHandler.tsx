import { useRef, useCallback, type ReactNode, type CSSProperties } from 'react'

interface SwipeHandlerProps {
  children: ReactNode
  onSwipeUp?: () => void
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  enabled?: boolean
  threshold?: number
}

export function SwipeHandler({
  children,
  onSwipeUp,
  onSwipeLeft,
  onSwipeRight,
  enabled = true,
  threshold = 60,
}: SwipeHandlerProps) {
  const startRef = useRef<{ x: number; y: number } | null>(null)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!enabled) return
    const touch = e.touches[0]
    startRef.current = { x: touch.clientX, y: touch.clientY }
  }, [enabled])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!enabled || !startRef.current) return
    const touch = e.changedTouches[0]
    const dx = touch.clientX - startRef.current.x
    const dy = touch.clientY - startRef.current.y
    startRef.current = null

    const absDx = Math.abs(dx)
    const absDy = Math.abs(dy)

    // Ignorer les mouvements trop petits
    if (absDx < threshold && absDy < threshold) return

    if (absDy > absDx) {
      // Mouvement vertical
      if (dy < -threshold && onSwipeUp) {
        onSwipeUp()
      }
    } else {
      // Mouvement horizontal
      if (dx < -threshold && onSwipeLeft) {
        onSwipeLeft()
      } else if (dx > threshold && onSwipeRight) {
        onSwipeRight()
      }
    }
  }, [enabled, threshold, onSwipeUp, onSwipeLeft, onSwipeRight])

  const style: CSSProperties = {
    flex: 1,
    display: 'flex',
    touchAction: 'pan-y',
  }

  return (
    <div
      style={style}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {children}
    </div>
  )
}
