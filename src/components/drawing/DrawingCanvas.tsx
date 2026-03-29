import { useRef, useEffect, useCallback, type CSSProperties } from 'react'
import { v4 as uuid } from 'uuid'
import { useDrawingStore } from '../../store/useDrawingStore'
import type { DrawingPoint, DrawingStroke } from '../../types/card'

interface DrawingCanvasProps {
  width?: number
  height?: number
}

export function DrawingCanvas({ width: _width = 800, height = 500 }: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const isDrawingRef = useRef(false)
  const currentPointsRef = useRef<DrawingPoint[]>([])
  const activePointerRef = useRef<number | null>(null)

  const { tool, color, strokeWidth, strokes, addStroke } = useDrawingStore()

  // Redessiner tous les traits
  const redraw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    for (const stroke of strokes) {
      renderStroke(ctx, stroke)
    }

    // Dessiner le trait en cours
    if (isDrawingRef.current && currentPointsRef.current.length > 1) {
      const currentStroke: DrawingStroke = {
        id: 'current',
        points: currentPointsRef.current,
        color: tool === 'eraser' ? 'eraser' : color,
        width: tool === 'eraser' ? strokeWidth * 4 : strokeWidth,
        tool,
      }
      renderStroke(ctx, currentStroke)
    }
  }, [strokes, tool, color, strokeWidth])

  // Redessiner à chaque changement de strokes
  useEffect(() => {
    redraw()
  }, [redraw])

  // Adapter la taille du canvas au conteneur
  useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: w } = entry.contentRect
        const ratio = window.devicePixelRatio || 1
        const h = Math.min(w * 0.625, height) // Ratio 16:10
        canvas.width = w * ratio
        canvas.height = h * ratio
        canvas.style.width = `${w}px`
        canvas.style.height = `${h}px`
        const ctx = canvas.getContext('2d')
        if (ctx) ctx.scale(ratio, ratio)
        redraw()
      }
    })

    observer.observe(container)
    return () => observer.disconnect()
  }, [height, redraw])

  const getCanvasPoint = (e: React.PointerEvent): DrawingPoint => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / (window.devicePixelRatio || 1) / rect.width
    const scaleY = canvas.height / (window.devicePixelRatio || 1) / rect.height
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
      pressure: e.pressure || 0.5,
    }
  }

  const handlePointerDown = (e: React.PointerEvent) => {
    // Rejet de paume : ignorer les touches si un stylet est actif
    if (activePointerRef.current !== null && e.pointerId !== activePointerRef.current) return
    if (e.pointerType === 'touch' && activePointerRef.current !== null) return

    // Capturer le pointer
    canvasRef.current?.setPointerCapture(e.pointerId)
    activePointerRef.current = e.pointerId
    isDrawingRef.current = true
    currentPointsRef.current = [getCanvasPoint(e)]
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDrawingRef.current || e.pointerId !== activePointerRef.current) return
    currentPointsRef.current.push(getCanvasPoint(e))
    redraw()
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDrawingRef.current || e.pointerId !== activePointerRef.current) return
    isDrawingRef.current = false
    activePointerRef.current = null

    const points = currentPointsRef.current
    if (points.length < 2) {
      currentPointsRef.current = []
      return
    }

    const stroke: DrawingStroke = {
      id: uuid(),
      points: [...points],
      color: tool === 'eraser' ? 'eraser' : color,
      width: tool === 'eraser' ? strokeWidth * 4 : strokeWidth,
      tool,
    }

    addStroke(stroke)
    currentPointsRef.current = []
  }

  const containerStyle: CSSProperties = {
    width: '100%',
    borderRadius: 'var(--radius)',
    overflow: 'hidden',
    border: '1px solid var(--border)',
    background: 'var(--bg-elevated)',
    touchAction: 'none', // Empêcher le scroll pendant le dessin
  }

  const canvasStyle: CSSProperties = {
    display: 'block',
    cursor: tool === 'eraser' ? 'crosshair' : 'crosshair',
  }

  return (
    <div ref={containerRef} style={containerStyle}>
      <canvas
        ref={canvasRef}
        style={canvasStyle}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      />
    </div>
  )
}

// Rendu d'un trait avec courbes de Bézier quadratiques
function renderStroke(ctx: CanvasRenderingContext2D, stroke: DrawingStroke) {
  const { points, color, width, tool } = stroke
  if (points.length < 2) return

  if (tool === 'eraser') {
    ctx.globalCompositeOperation = 'destination-out'
  } else {
    ctx.globalCompositeOperation = 'source-over'
  }

  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.strokeStyle = tool === 'eraser' ? 'rgba(0,0,0,1)' : color

  ctx.beginPath()
  ctx.moveTo(points[0].x, points[0].y)

  for (let i = 1; i < points.length; i++) {
    const curr = points[i]

    // Largeur modulée par la pression
    const pressure = curr.pressure || 0.5
    ctx.lineWidth = width * (0.5 + pressure * 0.8)

    if (i < points.length - 1) {
      // Courbe de Bézier quadratique pour le lissage
      const midX = (curr.x + points[i + 1].x) / 2
      const midY = (curr.y + points[i + 1].y) / 2
      ctx.quadraticCurveTo(curr.x, curr.y, midX, midY)
    } else {
      ctx.lineTo(curr.x, curr.y)
    }
  }

  ctx.stroke()
  ctx.globalCompositeOperation = 'source-over'
}
