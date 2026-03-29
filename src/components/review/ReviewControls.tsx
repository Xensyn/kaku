import type { CSSProperties } from 'react'
import type { Rating } from '../../types/review'
import { RATING_LABELS } from '../../types/review'
import { formatInterval } from '../../lib/srs-engine'
import { Button } from '../ui/Button'

interface ReviewControlsProps {
  isFlipped: boolean
  intervals: Record<Rating, number> | null
  onFlip: () => void
  onRate: (rating: Rating) => void
}

const RATING_COLORS: Record<Rating, string> = {
  1: 'var(--danger)',
  2: 'var(--warning)',
  3: 'var(--success)',
  4: 'var(--accent)',
}

export function ReviewControls({ isFlipped, intervals, onFlip, onRate }: ReviewControlsProps) {
  const containerStyle: CSSProperties = {
    padding: '12px 12px calc(12px + var(--safe-bottom, 0px))',
    flexShrink: 0,
  }

  if (!isFlipped) {
    return (
      <div style={containerStyle}>
        <Button fullWidth size="lg" onClick={onFlip}>
          Montrer la réponse
        </Button>
      </div>
    )
  }

  const ratings: Rating[] = [1, 2, 3, 4]

  return (
    <div style={containerStyle}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
        {ratings.map((rating) => (
          <button
            key={rating}
            onClick={() => onRate(rating)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              padding: '10px 4px',
              minHeight: 'var(--touch-min)',
              background: 'var(--bg-card)',
              border: `2px solid ${RATING_COLORS[rating]}`,
              borderRadius: 'var(--radius)',
              color: RATING_COLORS[rating],
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '13px',
              transition: 'all var(--transition)',
            }}
          >
            <span>{RATING_LABELS[rating]}</span>
            {intervals && (
              <span style={{ fontSize: '11px', opacity: 0.8 }}>
                {formatInterval(intervals[rating])}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
