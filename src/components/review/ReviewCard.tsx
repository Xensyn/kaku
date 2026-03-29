import type { CSSProperties } from 'react'
import type { Card, CardSide } from '../../types/card'
import { MediaBlockDisplay } from './MediaBlockDisplay'

interface ReviewCardProps {
  card: Card
  isFlipped: boolean
  isReverse: boolean
  onFlip: () => void
}

export function ReviewCard({ card, isFlipped, isReverse, onFlip }: ReviewCardProps) {
  const questionSide = isReverse ? card.back : card.front
  const answerSide = isReverse ? card.front : card.back

  return (
    <div className="card-flip-container" onClick={() => !isFlipped && onFlip()} style={containerStyle}>
      <div className={`card-flip-inner ${isFlipped ? 'flipped' : ''}`}>
        <div className="card-flip-front" style={cardFaceStyle}>
          <CardContent side={questionSide} label="Question" />
          {!isFlipped && (
            <div style={tapHintStyle}>Touchez pour révéler la réponse</div>
          )}
        </div>
        <div className="card-flip-back" style={cardFaceStyle}>
          <CardContent side={answerSide} label="Réponse" />
        </div>
      </div>
    </div>
  )
}

function CardContent({ side, label }: { side: CardSide; label: string }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px' }}>
      <div style={labelStyle}>{label}</div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '16px' }}>
        {side.blocks.map((block) => (
          <MediaBlockDisplay key={block.id} block={block} />
        ))}
      </div>
    </div>
  )
}

const containerStyle: CSSProperties = {
  flex: 1,
  width: '100%',
  cursor: 'pointer',
}

const cardFaceStyle: CSSProperties = {
  background: 'var(--bg-card)',
  borderRadius: 'var(--radius-lg)',
  border: '1px solid var(--border)',
  padding: '4px',
}

const labelStyle: CSSProperties = {
  fontSize: '12px',
  fontWeight: 600,
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  marginBottom: '8px',
}

const tapHintStyle: CSSProperties = {
  textAlign: 'center',
  fontSize: '13px',
  color: 'var(--text-muted)',
  paddingBottom: '8px',
}
