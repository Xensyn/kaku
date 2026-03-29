import { type CSSProperties } from 'react'
import { Pen, Eraser, Undo2, Redo2, Trash2 } from 'lucide-react'
import { useDrawingStore, type DrawingTool } from '../../store/useDrawingStore'
import { IconButton } from '../ui/IconButton'

const COLORS = ['#e8e8ec', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#000000']
const WIDTHS = [1, 2, 3, 5, 8]

export function DrawingToolbar() {
  const {
    tool, color, strokeWidth,
    setTool, setColor, setStrokeWidth,
    undo, redo, clear,
    canUndo, canRedo,
  } = useDrawingStore()

  const toolButton = (t: DrawingTool, Icon: typeof Pen, label: string) => (
    <IconButton
      onClick={() => setTool(t)}
      label={label}
      size={40}
      style={{
        color: tool === t ? 'var(--accent)' : 'var(--text-secondary)',
        background: tool === t ? 'var(--accent-light)' : 'transparent',
        borderRadius: 'var(--radius-sm)',
      }}
    >
      <Icon size={20} />
    </IconButton>
  )

  return (
    <div style={containerStyle}>
      {/* Outils */}
      <div style={rowStyle}>
        {toolButton('pen', Pen, 'Stylo')}
        {toolButton('eraser', Eraser, 'Gomme')}

        <div style={separatorStyle} />

        <IconButton
          onClick={undo}
          label="Annuler"
          size={40}
          style={{ opacity: canUndo() ? 1 : 0.3 }}
        >
          <Undo2 size={18} />
        </IconButton>
        <IconButton
          onClick={redo}
          label="Rétablir"
          size={40}
          style={{ opacity: canRedo() ? 1 : 0.3 }}
        >
          <Redo2 size={18} />
        </IconButton>
        <IconButton onClick={clear} label="Effacer tout" size={40}>
          <Trash2 size={18} />
        </IconButton>
      </div>

      {/* Couleurs (visible seulement en mode stylo) */}
      {tool === 'pen' && (
        <div style={rowStyle}>
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              style={{
                ...colorSwatchStyle,
                background: c,
                outline: color === c ? '2px solid var(--accent)' : '2px solid transparent',
                outlineOffset: '2px',
              }}
              aria-label={`Couleur ${c}`}
            />
          ))}
        </div>
      )}

      {/* Taille du trait */}
      <div style={rowStyle}>
        {WIDTHS.map((w) => (
          <button
            key={w}
            onClick={() => setStrokeWidth(w)}
            style={{
              ...widthButtonStyle,
              background: strokeWidth === w ? 'var(--accent-light)' : 'transparent',
              border: strokeWidth === w ? '1px solid var(--accent)' : '1px solid var(--border)',
            }}
          >
            <div style={{
              width: Math.min(w * 3, 24),
              height: Math.min(w * 3, 24),
              borderRadius: '50%',
              background: tool === 'pen' ? color : 'var(--text-muted)',
            }} />
          </button>
        ))}
      </div>
    </div>
  )
}

const containerStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
  padding: '8px',
  background: 'var(--bg-secondary)',
  borderRadius: 'var(--radius)',
  border: '1px solid var(--border)',
}

const rowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  flexWrap: 'wrap',
}

const separatorStyle: CSSProperties = {
  width: '1px',
  height: '24px',
  background: 'var(--border)',
  margin: '0 4px',
}

const colorSwatchStyle: CSSProperties = {
  width: '28px',
  height: '28px',
  borderRadius: '50%',
  border: 'none',
  cursor: 'pointer',
  flexShrink: 0,
}

const widthButtonStyle: CSSProperties = {
  width: '36px',
  height: '36px',
  borderRadius: 'var(--radius-sm)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  background: 'transparent',
}
