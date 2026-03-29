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

  // Récupérer les cartes pour les stats d'état et la prédiction de charge
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

  // Récupérer toutes les cartes pour la prédiction de charge (nextReview)
  const allCards = useLiveQuery(async () => {
    if (!selectedDeckId) return []
    const descendantIds = await getDescendantDeckIds(selectedDeckId)
    const allDeckIds = [selectedDeckId, ...descendantIds]
    const cards = []
    for (const id of allDeckIds) {
      const deckCards = await db.cards.where('deckId').equals(id).toArray()
      cards.push(...deckCards)
    }
    return cards
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

    // Heatmap : 90 derniers jours
    const heatmapData: { dateStr: string; count: number }[] = []
    for (let i = 89; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().slice(0, 10)
      const count = logs.filter((l) => l.reviewedAt.startsWith(dateStr)).length
      heatmapData.push({ dateStr, count })
    }

    // Courbe de rétention : 30 derniers jours
    const retentionData: { dateStr: string; rate: number | null }[] = []
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().slice(0, 10)
      const dayLogs = logs.filter((l) => l.reviewedAt.startsWith(dateStr))
      if (dayLogs.length === 0) {
        retentionData.push({ dateStr, rate: null })
      } else {
        const good = dayLogs.filter((l) => l.rating === 3 || l.rating === 4).length
        retentionData.push({ dateStr, rate: good / dayLogs.length })
      }
    }

    return { totalReviews, avgTime, byRating, days, maxDay, streak, heatmapData, retentionData }
  }, [logs])

  // Prédiction de charge : 7 prochains jours
  const workloadData = useMemo(() => {
    if (!allCards) return null
    const now = new Date()
    const result: { label: string; count: number }[] = []
    for (let i = 0; i < 7; i++) {
      const date = new Date(now)
      date.setDate(date.getDate() + i)
      const dateStr = date.toISOString().slice(0, 10)
      const label = i === 0 ? "Auj." : date.toLocaleDateString('fr-FR', { weekday: 'short' })
      const count = allCards.filter((c) => c.srs.nextReview <= dateStr).length
      result.push({ label, count })
    }
    return result
  }, [allCards])

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

        {/* Heatmap 90 jours */}
        {stats && (
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>Activité (90 derniers jours)</div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(13, 1fr)',
              gap: '3px',
            }}>
              {stats.heatmapData.map((d) => (
                <div
                  key={d.dateStr}
                  title={`${d.dateStr} : ${d.count} révision${d.count !== 1 ? 's' : ''}`}
                  style={{
                    aspectRatio: '1',
                    borderRadius: '2px',
                    background: heatmapColor(d.count),
                  }}
                />
              ))}
            </div>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>
              <span>Moins</span>
              {[0, 2, 8, 16].map((v) => (
                <div key={v} style={{ width: '10px', height: '10px', borderRadius: '2px', background: heatmapColor(v) }} />
              ))}
              <span>Plus</span>
            </div>
          </div>
        )}

        {/* Courbe de rétention */}
        {stats && (
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>Taux de rétention (30 derniers jours)</div>
            <RetentionCurve data={stats.retentionData} />
          </div>
        )}

        {/* Prédiction de charge */}
        {workloadData && (
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>Charge prévue (7 prochains jours)</div>
            <WorkloadChart data={workloadData} />
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

// Couleur heatmap selon le nombre de révisions
function heatmapColor(count: number): string {
  if (count === 0) return 'var(--bg-elevated)'
  if (count <= 5) return 'color-mix(in srgb, var(--accent) 30%, transparent)'
  if (count <= 15) return 'color-mix(in srgb, var(--accent) 60%, transparent)'
  return 'var(--accent)'
}

// Courbe de rétention SVG
function RetentionCurve({ data }: { data: { dateStr: string; rate: number | null }[] }) {
  const TARGET = 0.85
  const WIDTH = 300
  const HEIGHT = 80
  const PAD = { top: 8, right: 8, bottom: 20, left: 30 }

  const chartW = WIDTH - PAD.left - PAD.right
  const chartH = HEIGHT - PAD.top - PAD.bottom

  // Points valides uniquement
  const points = data
    .map((d, i) => ({ x: i, rate: d.rate, dateStr: d.dateStr }))
    .filter((d) => d.rate !== null) as { x: number; rate: number; dateStr: string }[]

  const toSvgX = (i: number) => PAD.left + (i / (data.length - 1)) * chartW
  const toSvgY = (r: number) => PAD.top + (1 - r) * chartH

  // Ligne de la courbe
  const pathD = points.length > 0
    ? points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${toSvgX(p.x)} ${toSvgY(p.rate)}`).join(' ')
    : ''

  // Ligne cible
  const targetY = toSvgY(TARGET)

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      style={{ width: '100%', height: 'auto', overflow: 'visible' }}
      aria-label="Courbe de rétention"
    >
      {/* Axes */}
      <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + chartH} stroke="var(--border)" strokeWidth="1" />
      <line x1={PAD.left} y1={PAD.top + chartH} x2={PAD.left + chartW} y2={PAD.top + chartH} stroke="var(--border)" strokeWidth="1" />

      {/* Lignes de grille Y */}
      {[0, 0.25, 0.5, 0.75, 1].map((v) => (
        <g key={v}>
          <line
            x1={PAD.left} y1={toSvgY(v)}
            x2={PAD.left + chartW} y2={toSvgY(v)}
            stroke="var(--border)" strokeWidth="0.5" strokeDasharray="3,3"
          />
          <text x={PAD.left - 4} y={toSvgY(v) + 4} textAnchor="end" fontSize="8" fill="var(--text-muted)">
            {Math.round(v * 100)}%
          </text>
        </g>
      ))}

      {/* Ligne cible (85%) */}
      <line
        x1={PAD.left} y1={targetY}
        x2={PAD.left + chartW} y2={targetY}
        stroke="var(--success)" strokeWidth="1.5" strokeDasharray="6,3"
        opacity="0.6"
      />
      <text x={PAD.left + chartW + 2} y={targetY + 4} fontSize="8" fill="var(--success)" opacity="0.8">85%</text>

      {/* Courbe de rétention */}
      {pathD && (
        <path
          d={pathD}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      )}

      {/* Points */}
      {points.map((p) => (
        <circle
          key={p.dateStr}
          cx={toSvgX(p.x)}
          cy={toSvgY(p.rate)}
          r="2.5"
          fill="var(--accent)"
        >
          <title>{p.dateStr} : {Math.round(p.rate * 100)}%</title>
        </circle>
      ))}

      {/* Label axe X */}
      <text x={PAD.left} y={HEIGHT} fontSize="8" fill="var(--text-muted)">-30j</text>
      <text x={PAD.left + chartW} y={HEIGHT} textAnchor="end" fontSize="8" fill="var(--text-muted)">Auj.</text>
    </svg>
  )
}

// Graphique de charge de travail
function WorkloadChart({ data }: { data: { label: string; count: number }[] }) {
  const maxCount = Math.max(...data.map((d) => d.count), 1)

  return (
    <div style={{ display: 'flex', gap: '4px', alignItems: 'flex-end', height: '80px' }}>
      {data.map((day, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{day.count || ''}</span>
          <div
            title={`${day.label} : ${day.count} carte${day.count !== 1 ? 's' : ''}`}
            style={{
              width: '100%',
              height: `${Math.max((day.count / maxCount) * 55, day.count > 0 ? 4 : 0)}px`,
              background: i === 0
                ? 'var(--warning)'
                : day.count > 0 ? 'color-mix(in srgb, var(--accent) 60%, transparent)' : 'var(--border)',
              borderRadius: '3px 3px 0 0',
              minHeight: '2px',
            }}
          />
          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{day.label}</span>
        </div>
      ))}
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
