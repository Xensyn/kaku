import { useMemo, type CSSProperties } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/database'
import { getDescendantDeckIds, useDeck, useTotalCardCount, useTotalDueCount } from '../../db/hooks'
import { useAppStore } from '../../store/useAppStore'
import { Header } from '../layout/Header'
import type { ReviewLog } from '../../types/review'

export function DeckStats() {
  const { selectedDeckId } = useAppStore()
  const deck = useDeck(selectedDeckId ?? '')
  const totalCards = useTotalCardCount(selectedDeckId ?? '')
  const totalDue = useTotalDueCount(selectedDeckId ?? '')

  // Récupérer tous les logs pour ce deck + sous-decks
  const logs = useLiveQuery(async () => {
    if (!selectedDeckId) return []
    const descendantIds = await getDescendantDeckIds(selectedDeckId)
    const allDeckIds = [selectedDeckId, ...descendantIds]
    const allLogs: ReviewLog[] = []
    for (const id of allDeckIds) {
      const deckLogs = await db.reviewLogs.where('deckId').equals(id).toArray()
      allLogs.push(...deckLogs)
    }
    return allLogs
  }, [selectedDeckId])

  // Récupérer les cartes pour les stats d'état
  const cardStates = useLiveQuery(async () => {
    if (!selectedDeckId) return { new: 0, learning: 0, review: 0, relearning: 0 }
    const descendantIds = await getDescendantDeckIds(selectedDeckId)
    const allDeckIds = [selectedDeckId, ...descendantIds]
    const states = { new: 0, learning: 0, review: 0, relearning: 0 }
    for (const id of allDeckIds) {
      const cards = await db.cards.where('deckId').equals(id).toArray()
      for (const card of cards) {
        states[card.srs.state]++
      }
    }
    return states
  }, [selectedDeckId])

  const stats = useMemo(() => {
    if (!logs || logs.length === 0) return null

    const totalReviews = logs.length
    const avgTime = Math.round(logs.reduce((s, l) => s + l.elapsedMs, 0) / totalReviews / 1000)

    // Stats par rating
    const byRating = { 1: 0, 2: 0, 3: 0, 4: 0 }
    for (const log of logs) {
      byRating[log.rating]++
    }

    // Reviews par jour (7 derniers jours)
    const now = new Date()
    const days: { label: string; count: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().slice(0, 10)
      const dayLabel = date.toLocaleDateString('fr-FR', { weekday: 'short' })
      const count = logs.filter((l) => l.reviewedAt.startsWith(dateStr)).length
      days.push({ label: dayLabel, count })
    }

    // Streak
    let streak = 0
    const today = new Date().toISOString().slice(0, 10)
    const checkDate = new Date()
    // Si pas encore révisé aujourd'hui, commencer par hier
    const todayReviews = logs.filter((l) => l.reviewedAt.startsWith(today)).length
    if (todayReviews === 0) {
      checkDate.setDate(checkDate.getDate() - 1)
    }
    while (true) {
      const dateStr = checkDate.toISOString().slice(0, 10)
      const dayCount = logs.filter((l) => l.reviewedAt.startsWith(dateStr)).length
      if (dayCount > 0) {
        streak++
        checkDate.setDate(checkDate.getDate() - 1)
      } else {
        break
      }
    }

    const maxDay = Math.max(...days.map((d) => d.count), 1)

    return { totalReviews, avgTime, byRating, days, maxDay, streak }
  }, [logs])

  if (!selectedDeckId || !deck) {
    return (
      <div>
        <Header title="Statistiques" showBack />
        <p style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Deck introuvable
        </p>
      </div>
    )
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <Header title={`Stats — ${deck.name}`} showBack />

      <div style={{ flex: 1, overflow: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Vue d'ensemble */}
        <div style={gridStyle}>
          <StatCard label="Cartes" value={totalCards ?? 0} color="var(--text-primary)" />
          <StatCard label="À réviser" value={totalDue ?? 0} color="var(--accent)" />
          <StatCard label="Révisions" value={stats?.totalReviews ?? 0} color="var(--success)" />
          <StatCard label="Streak" value={`${stats?.streak ?? 0}j`} color="var(--warning)" />
        </div>

        {/* Répartition des cartes */}
        {cardStates && (
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>Répartition des cartes</div>
            <div style={{ display: 'flex', gap: '4px', height: '24px', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
              {cardStates.new > 0 && (
                <div style={{ flex: cardStates.new, background: 'var(--accent)', minWidth: '2px' }} title={`Nouvelles: ${cardStates.new}`} />
              )}
              {cardStates.learning > 0 && (
                <div style={{ flex: cardStates.learning, background: 'var(--warning)', minWidth: '2px' }} title={`En cours: ${cardStates.learning}`} />
              )}
              {cardStates.review > 0 && (
                <div style={{ flex: cardStates.review, background: 'var(--success)', minWidth: '2px' }} title={`Révision: ${cardStates.review}`} />
              )}
              {cardStates.relearning > 0 && (
                <div style={{ flex: cardStates.relearning, background: 'var(--error)', minWidth: '2px' }} title={`Réapprentissage: ${cardStates.relearning}`} />
              )}
            </div>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '8px' }}>
              <Legend color="var(--accent)" label={`Nouvelles (${cardStates.new})`} />
              <Legend color="var(--warning)" label={`En cours (${cardStates.learning})`} />
              <Legend color="var(--success)" label={`Révision (${cardStates.review})`} />
              <Legend color="var(--error)" label={`Réapprentissage (${cardStates.relearning})`} />
            </div>
          </div>
        )}

        {/* Historique des 7 derniers jours */}
        {stats && (
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>7 derniers jours</div>
            <div style={{ display: 'flex', gap: '4px', alignItems: 'flex-end', height: '100px' }}>
              {stats.days.map((day, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{day.count || ''}</span>
                  <div
                    style={{
                      width: '100%',
                      height: `${Math.max((day.count / stats.maxDay) * 70, day.count > 0 ? 4 : 0)}px`,
                      background: day.count > 0 ? 'var(--accent)' : 'var(--border)',
                      borderRadius: '3px 3px 0 0',
                      minHeight: '2px',
                    }}
                  />
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{day.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Temps moyen */}
        {stats && (
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>Performance</div>
            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: '20px', fontWeight: 700 }}>{stats.avgTime}s</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Temps moyen</div>
              </div>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: '20px', fontWeight: 700 }}>
                  {stats.totalReviews > 0 ? Math.round(((stats.byRating[3] + stats.byRating[4]) / stats.totalReviews) * 100) : 0}%
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Taux de succès</div>
              </div>
            </div>
          </div>
        )}

        {!stats && (
          <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
            Aucune révision enregistrée pour ce deck.
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div style={statCardStyle}>
      <div style={{ fontSize: '22px', fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{label}</div>
    </div>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--text-muted)' }}>
      <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: color }} />
      {label}
    </div>
  )
}

const gridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap: '8px',
}

const statCardStyle: CSSProperties = {
  textAlign: 'center',
  padding: '14px 8px',
  background: 'var(--bg-card)',
  borderRadius: 'var(--radius)',
  border: '1px solid var(--border)',
}

const sectionStyle: CSSProperties = {
  padding: '16px',
  background: 'var(--bg-card)',
  borderRadius: 'var(--radius)',
  border: '1px solid var(--border)',
}

const sectionTitleStyle: CSSProperties = {
  fontSize: '12px',
  fontWeight: 600,
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  marginBottom: '12px',
}
