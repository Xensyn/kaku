import { useTotalDueCount, useTotalCardCount } from '../../db/hooks'

interface DeckDueCountProps {
  deckId: string
}

export function DeckDueCount({ deckId }: DeckDueCountProps) {
  const dueCount = useTotalDueCount(deckId)
  const totalCount = useTotalCardCount(deckId)

  const hasDue = dueCount !== undefined && dueCount > 0

  return (
    <div style={{ display: 'flex', gap: '8px', fontSize: '13px', marginTop: '2px' }}>
      {hasDue && (
        <span style={{ color: 'var(--accent)', fontWeight: 600 }}>
          {dueCount} à réviser
        </span>
      )}
      <span style={{ color: 'var(--text-muted)' }}>
        {totalCount ?? 0} carte{(totalCount ?? 0) !== 1 ? 's' : ''}
      </span>
    </div>
  )
}
