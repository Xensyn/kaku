import type { CSSProperties } from 'react'
import { CheckCircle } from 'lucide-react'
import { Button } from '../ui/Button'
import type { Rating } from '../../types/review'
import { RATING_LABELS } from '../../types/review'

interface ReviewSummaryProps {
  totalReviewed: number
  stats: Record<Rating, number>
  onClose: () => void
}

const STAT_COLORS: Record<Rating, string> = {
  1: 'var(--danger)',
  2: 'var(--warning)',
  3: 'var(--success)',
  4: 'var(--accent)',
}

export function ReviewSummary({ totalReviewed, stats, onClose }: ReviewSummaryProps) {
  const containerStyle: CSSProperties = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '24px',
    padding: '32px',
    textAlign: 'center',
  }

  const statsGridStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '8px',
    width: '100%',
    maxWidth: '360px',
  }

  const statBoxStyle = (_rating: Rating): CSSProperties => ({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    padding: '12px 8px',
    background: 'var(--bg-card)',
    borderRadius: 'var(--radius)',
    border: '1px solid var(--border)',
  })

  return (
    <div style={containerStyle}>
      <CheckCircle size={64} strokeWidth={1.5} style={{ color: 'var(--success)' }} />
      <h2 style={{ fontSize: '22px', fontWeight: 700 }}>Session terminée !</h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '16px' }}>
        Vous avez révisé <strong>{totalReviewed}</strong> carte{totalReviewed > 1 ? 's' : ''}.
      </p>

      {totalReviewed > 0 && (
        <div style={statsGridStyle}>
          {([1, 2, 3, 4] as Rating[]).map((rating) => (
            <div key={rating} style={statBoxStyle(rating)}>
              <span style={{ fontSize: '22px', fontWeight: 700, color: STAT_COLORS[rating] }}>
                {stats[rating]}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {RATING_LABELS[rating]}
              </span>
            </div>
          ))}
        </div>
      )}

      <Button onClick={onClose} size="lg">
        Retour à l'accueil
      </Button>
    </div>
  )
}
