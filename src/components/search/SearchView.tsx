import { useState, useEffect, useRef, type CSSProperties } from 'react'
import { Search, X } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/database'
import { useAppStore } from '../../store/useAppStore'
import { Header } from '../layout/Header'
import type { Card } from '../../types/card'
import type { Deck } from '../../types/deck'

interface SearchResult {
  card: Card
  deck: Deck | undefined
  matchedText: string
  isDue: boolean
}

function getCardText(card: Card): string {
  const frontText = card.front.blocks
    .filter((b) => b.type === 'text')
    .map((b) => b.textContent ?? '')
    .join(' ')
  const backText = card.back.blocks
    .filter((b) => b.type === 'text')
    .map((b) => b.textContent ?? '')
    .join(' ')
  return `${frontText} ${backText}`.toLowerCase()
}

function getPreview(card: Card): string {
  const firstFront = card.front.blocks.find((b) => b.type === 'text')
  return firstFront?.textContent || '(vide)'
}

export function SearchView() {
  const { navigate, editCard, selectDeck } = useAppStore()
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus auto à l'ouverture
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Debounce 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim().toLowerCase())
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  const today = new Date().toISOString().slice(0, 10)

  const allCards = useLiveQuery(() => db.cards.toArray(), [])
  const allDecks = useLiveQuery(() => db.decks.toArray(), [])

  const results: SearchResult[] = (() => {
    if (!debouncedQuery || !allCards || !allDecks) return []
    const deckMap = new Map<string, Deck>(allDecks.map((d) => [d.id, d]))
    return allCards
      .filter((card) => getCardText(card).includes(debouncedQuery))
      .map((card) => ({
        card,
        deck: deckMap.get(card.deckId),
        matchedText: getPreview(card),
        isDue: card.srs.nextReview <= today,
      }))
  })()

  const handleResultClick = (result: SearchResult) => {
    if (result.deck) selectDeck(result.deck.id)
    editCard(result.card.id)
    navigate('editor')
  }

  return (
    <div style={containerStyle}>
      <Header title="Recherche" showBack />

      {/* Champ de recherche */}
      <div style={searchBarStyle}>
        <Search size={18} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
        <input
          ref={inputRef}
          style={inputStyle}
          placeholder="Rechercher dans les cartes..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query && (
          <button style={clearBtnStyle} onClick={() => setQuery('')} aria-label="Effacer">
            <X size={16} />
          </button>
        )}
      </div>

      {/* Résultats */}
      <div style={listStyle}>
        {!debouncedQuery && (
          <div style={emptyStyle}>Tapez pour rechercher dans toutes vos cartes.</div>
        )}

        {debouncedQuery && results.length === 0 && (
          <div style={emptyStyle}>Aucun résultat pour « {debouncedQuery} ».</div>
        )}

        {results.map(({ card, deck, matchedText, isDue }) => (
          <button
            key={card.id}
            style={resultItemStyle}
            onClick={() => handleResultClick({ card, deck, matchedText, isDue })}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={resultTextStyle}>{matchedText}</div>
              <div style={resultMetaStyle}>
                {deck ? `${deck.icon ?? '📂'} ${deck.name}` : 'Deck inconnu'}
              </div>
            </div>
            <span style={{
              fontSize: '11px',
              padding: '2px 8px',
              borderRadius: '8px',
              flexShrink: 0,
              fontWeight: 600,
              background: card.srs.state === 'new' ? 'var(--accent-light)' :
                isDue ? 'rgba(var(--warning-rgb, 255 160 0) / 0.15)' : 'rgba(var(--success-rgb, 0 200 100) / 0.15)',
              color: card.srs.state === 'new' ? 'var(--accent)' :
                isDue ? 'var(--warning)' : 'var(--success)',
            }}>
              {card.srs.state === 'new' ? 'Nouvelle' :
                isDue ? 'À réviser' : 'En attente'}
            </span>
          </button>
        ))}

        {debouncedQuery && results.length > 0 && (
          <div style={{ textAlign: 'center', padding: '12px', fontSize: '13px', color: 'var(--text-muted)' }}>
            {results.length} résultat{results.length > 1 ? 's' : ''}
          </div>
        )}
      </div>
    </div>
  )
}

const containerStyle: CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
}

const searchBarStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  margin: '12px 16px',
  padding: '10px 14px',
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
}

const inputStyle: CSSProperties = {
  flex: 1,
  border: 'none',
  background: 'transparent',
  color: 'var(--text-primary)',
  fontSize: '15px',
  outline: 'none',
}

const clearBtnStyle: CSSProperties = {
  border: 'none',
  background: 'transparent',
  color: 'var(--text-muted)',
  cursor: 'pointer',
  padding: '2px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
}

const listStyle: CSSProperties = {
  flex: 1,
  overflow: 'auto',
  padding: '0 12px 12px',
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
}

const emptyStyle: CSSProperties = {
  textAlign: 'center',
  padding: '40px 24px',
  color: 'var(--text-muted)',
  fontSize: '14px',
}

const resultItemStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  padding: '12px 16px',
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
  cursor: 'pointer',
  textAlign: 'left',
  width: '100%',
  minHeight: 'var(--touch-min)',
  transition: 'background var(--transition)',
}

const resultTextStyle: CSSProperties = {
  fontSize: '14px',
  fontWeight: 500,
  color: 'var(--text-primary)',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}

const resultMetaStyle: CSSProperties = {
  fontSize: '12px',
  color: 'var(--text-muted)',
  marginTop: '2px',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}
