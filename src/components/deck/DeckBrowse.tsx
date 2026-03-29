import { useState, useMemo, type CSSProperties } from 'react'
import { Plus, Play, Trash2, Settings, FolderPlus, ChevronRight, BarChart3, FolderInput, Zap, List, LayoutGrid } from 'lucide-react'
import { useDeckCards, useDeck, useTotalDueCount, useTotalCardCount, useSubDecks, useDecks } from '../../db/hooks'
import { useAppStore } from '../../store/useAppStore'
import { useCardStore } from '../../store/useCardStore'
import { useDeckStore } from '../../store/useDeckStore'
import { useReviewStore } from '../../store/useReviewStore'
import { Header } from '../layout/Header'
import { Button } from '../ui/Button'
import { IconButton } from '../ui/IconButton'
import { Modal } from '../ui/Modal'
import { DeckDueCount } from './DeckDueCount'

export function DeckBrowse() {
  const { selectedDeckId, navigate, editCard, selectDeck } = useAppStore()
  const { createCard, deleteCard, moveCard } = useCardStore()
  const { createDeck } = useDeckStore()
  const { startSession, startCramSession } = useReviewStore()

  const deck = useDeck(selectedDeckId ?? '')
  const cards = useDeckCards(selectedDeckId ?? '')
  const totalDue = useTotalDueCount(selectedDeckId ?? '')
  const totalCards = useTotalCardCount(selectedDeckId ?? '')
  const subDecks = useSubDecks(selectedDeckId ?? '')
  const allDecks = useDecks()

  const [showCreateSub, setShowCreateSub] = useState(false)
  const [subDeckName, setSubDeckName] = useState('')
  const [movingCardId, setMovingCardId] = useState<string | null>(null)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [compactMode, setCompactMode] = useState(() => {
    try { return localStorage.getItem('kaku-compact-browse') === '1' } catch { return false }
  })

  const toggleCompact = () => {
    setCompactMode((prev) => {
      const next = !prev
      try { localStorage.setItem('kaku-compact-browse', next ? '1' : '0') } catch { /* ignore */ }
      return next
    })
  }

  // Extraire tous les tags uniques des cartes de ce deck
  const allTags = useMemo(() => {
    if (!cards) return []
    const tagSet = new Set<string>()
    for (const card of cards) {
      for (const tag of card.tags) {
        tagSet.add(tag)
      }
    }
    return Array.from(tagSet).sort()
  }, [cards])

  if (!selectedDeckId || !deck) {
    return (
      <div>
        <Header title="Deck" showBack />
        <p style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Deck introuvable
        </p>
      </div>
    )
  }

  const handleAddCard = async () => {
    const id = await createCard(selectedDeckId, deck.settings.algorithm)
    editCard(id)
    navigate('editor')
  }

  const handleStartReview = () => {
    // Stocker les tags sélectionnés dans le store avant la navigation
    startSession(selectedDeckId, selectedTags.length > 0 ? selectedTags : undefined)
    navigate('review')
  }

  const handleStartCram = () => {
    startCramSession(selectedDeckId, selectedTags.length > 0 ? selectedTags : undefined)
    navigate('review')
  }

  const handleCreateSubDeck = async () => {
    const name = subDeckName.trim()
    if (!name) return
    await createDeck(name, selectedDeckId)
    setSubDeckName('')
    setShowCreateSub(false)
  }

  const handleOpenSubDeck = (deckId: string) => {
    selectDeck(deckId)
    navigate('browse')
  }

  const handleMoveCard = async (targetDeckId: string) => {
    if (!movingCardId) return
    await moveCard(movingCardId, targetDeckId)
    setMovingCardId(null)
  }

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  const getPreview = (card: NonNullable<typeof cards>[number]) => {
    const firstBlock = card.front.blocks.find((b) => b.type === 'text')
    return firstBlock?.textContent || '(vide)'
  }

  // Decks disponibles comme destination (tous sauf le deck courant)
  const targetDecks = (allDecks ?? []).filter((d) => d.id !== selectedDeckId)

  return (
    <div style={containerStyle}>
      <Header
        title={deck.name}
        showBack
        right={
          <>
            <IconButton onClick={toggleCompact} label={compactMode ? 'Vue normale' : 'Vue compacte'}>
              {compactMode ? <LayoutGrid size={18} /> : <List size={18} />}
            </IconButton>
            <IconButton onClick={() => navigate('stats')} label="Statistiques">
              <BarChart3 size={20} />
            </IconButton>
            <IconButton onClick={() => navigate('deck-settings')} label="Réglages du deck">
              <Settings size={20} />
            </IconButton>
            <IconButton onClick={handleAddCard} label="Ajouter une carte">
              <Plus size={22} />
            </IconButton>
          </>
        }
      />

      {/* Stats */}
      <div style={statsStyle}>
        <div style={statBox}>
          <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)' }}>
            {totalCards ?? 0}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Cartes</div>
        </div>
        <div style={statBox}>
          <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--accent)' }}>
            {totalDue ?? 0}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>À réviser</div>
        </div>
      </div>

      {/* Filtres par tags */}
      {allTags.length > 0 && (
        <div style={tagFilterContainerStyle}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', flexShrink: 0 }}>
            Tags
          </span>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {allTags.map((tag) => {
              const active = selectedTags.includes(tag)
              return (
                <button
                  key={tag}
                  style={{
                    ...tagChipStyle,
                    background: active ? 'var(--accent)' : 'var(--bg-elevated)',
                    color: active ? '#fff' : 'var(--text-secondary)',
                    borderColor: active ? 'var(--accent)' : 'var(--border)',
                    fontWeight: active ? 600 : 400,
                  }}
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Boutons révision + cram */}
      <div style={{ padding: '0 16px 8px', display: 'flex', gap: '8px' }}>
        {(totalDue ?? 0) > 0 && (
          <div style={{ flex: 1 }}>
            <Button fullWidth onClick={handleStartReview}>
              <Play size={18} fill="currentColor" />
              Réviser ({totalDue} carte{(totalDue ?? 0) > 1 ? 's' : ''})
            </Button>
          </div>
        )}
        {(totalCards ?? 0) > 0 && (
          <Button variant="secondary" onClick={handleStartCram} style={{ flexShrink: 0 }}>
            <Zap size={16} />
            Cram
          </Button>
        )}
      </div>

      <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, overflow: 'auto' }}>
        {/* Sous-decks */}
        {subDecks && subDecks.length > 0 && (
          <>
            <div style={sectionLabelStyle}>Sous-decks</div>
            {subDecks.map((sub) => (
              <div
                key={sub.id}
                style={subDeckItemStyle}
                onClick={() => handleOpenSubDeck(sub.id)}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {sub.icon || '📂'} {sub.name}
                  </div>
                  <DeckDueCount deckId={sub.id} />
                </div>
                <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
              </div>
            ))}
          </>
        )}

        {/* Bouton créer sous-deck */}
        <button style={addSubDeckStyle} onClick={() => setShowCreateSub(true)}>
          <FolderPlus size={16} />
          <span>Ajouter un sous-deck</span>
        </button>

        {/* Cartes de CE deck */}
        {cards && cards.length > 0 && (
          <div style={sectionLabelStyle}>Cartes ({cards.length})</div>
        )}
        {cards?.length === 0 && (!subDecks || subDecks.length === 0) && (
          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
            <p>Aucune carte dans ce deck.</p>
            <Button variant="secondary" onClick={handleAddCard} style={{ marginTop: '16px' }}>
              <Plus size={16} />
              Ajouter une carte
            </Button>
          </div>
        )}
        {compactMode
          ? cards?.map((card) => (
            <div
              key={card.id}
              style={cardItemCompactStyle}
              onClick={() => { editCard(card.id); navigate('editor') }}
            >
              <div style={{ flex: 1, fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>
                {getPreview(card)}
              </div>
            </div>
          ))
          : cards?.map((card) => (
            <div
              key={card.id}
              style={cardItemStyle}
              onClick={() => {
                editCard(card.id)
                navigate('editor')
              }}
            >
              <div style={{ flex: 1, fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {getPreview(card)}
              </div>
              <span style={{
                fontSize: '11px', padding: '2px 8px', borderRadius: '8px',
                background: card.srs.state === 'new' ? 'var(--accent-light)' :
                  card.srs.state === 'learning' ? 'var(--warning-light)' : 'var(--success-light)',
                color: card.srs.state === 'new' ? 'var(--accent)' :
                  card.srs.state === 'learning' ? 'var(--warning)' : 'var(--success)',
                fontWeight: 600,
              }}>
                {card.srs.state === 'new' ? 'Nouvelle' :
                  card.srs.state === 'learning' ? 'En cours' :
                  card.srs.state === 'review' ? 'Révision' : 'Réapprentissage'}
              </span>
              <IconButton
                size={32}
                onClick={(e) => { e.stopPropagation(); setMovingCardId(card.id) }}
                label="Déplacer"
              >
                <FolderInput size={14} />
              </IconButton>
              <IconButton
                size={32}
                onClick={(e) => { e.stopPropagation(); deleteCard(card.id) }}
                label="Supprimer"
              >
                <Trash2 size={14} />
              </IconButton>
            </div>
          ))
        }
      </div>
      {/* Modal déplacement de carte */}
      <Modal open={movingCardId !== null} onClose={() => setMovingCardId(null)} title="Déplacer vers...">
        {targetDecks.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginBottom: '16px' }}>
            Aucun autre deck disponible.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
            {targetDecks.map((d) => (
              <button
                key={d.id}
                style={moveDeckItemStyle}
                onClick={() => handleMoveCard(d.id)}
              >
                <span style={{ fontSize: '16px' }}>{d.icon ?? '📂'}</span>
                <span style={{ flex: 1, textAlign: 'left', fontSize: '14px', fontWeight: 500 }}>{d.name}</span>
              </button>
            ))}
          </div>
        )}
        <Button variant="ghost" fullWidth onClick={() => setMovingCardId(null)}>Annuler</Button>
      </Modal>

      {/* Modal sous-deck */}
      <Modal open={showCreateSub} onClose={() => setShowCreateSub(false)} title="Nouveau sous-deck">
        <input
          style={inputStyle}
          placeholder="Nom du sous-deck..."
          value={subDeckName}
          onChange={(e) => setSubDeckName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreateSubDeck()}
          autoFocus
        />
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <Button variant="ghost" onClick={() => setShowCreateSub(false)}>Annuler</Button>
          <Button onClick={handleCreateSubDeck} disabled={!subDeckName.trim()}>Créer</Button>
        </div>
      </Modal>
    </div>
  )
}

const containerStyle: CSSProperties = { flex: 1, display: 'flex', flexDirection: 'column' }

const statsStyle: CSSProperties = {
  display: 'flex', gap: '16px', padding: '16px', justifyContent: 'center',
}

const statBox: CSSProperties = {
  textAlign: 'center', padding: '12px 20px',
  background: 'var(--bg-card)', borderRadius: 'var(--radius)',
  border: '1px solid var(--border)', minWidth: '80px',
}

const sectionLabelStyle: CSSProperties = {
  fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)',
  textTransform: 'uppercase', letterSpacing: '0.5px',
  padding: '8px 4px 4px',
}

const tagFilterContainerStyle: CSSProperties = {
  display: 'flex', alignItems: 'flex-start', gap: '8px',
  padding: '0 16px 8px', flexWrap: 'wrap',
}

const tagChipStyle: CSSProperties = {
  padding: '4px 10px', borderRadius: '12px',
  border: '1px solid var(--border)', cursor: 'pointer',
  fontSize: '12px', transition: 'background var(--transition)',
  minHeight: '28px',
}

const subDeckItemStyle: CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '12px',
  padding: '12px 16px', background: 'var(--bg-card)',
  borderRadius: 'var(--radius)', border: '1px solid var(--border)',
  cursor: 'pointer',
}

const addSubDeckStyle: CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '8px',
  padding: '10px 16px', border: '1px dashed var(--border)',
  borderRadius: 'var(--radius)', background: 'transparent',
  color: 'var(--text-muted)', cursor: 'pointer', fontSize: '13px',
  minHeight: 'var(--touch-min)',
}

const cardItemStyle: CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '12px',
  padding: '12px 16px', background: 'var(--bg-card)',
  borderRadius: 'var(--radius)', border: '1px solid var(--border)',
  cursor: 'pointer',
}

const inputStyle: CSSProperties = {
  width: '100%', padding: '12px 16px',
  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius)', color: 'var(--text-primary)',
  fontSize: '15px', marginBottom: '16px',
}

const moveDeckItemStyle: CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '12px',
  padding: '12px 16px', background: 'var(--bg-elevated)',
  border: '1px solid var(--border)', borderRadius: 'var(--radius)',
  cursor: 'pointer', width: '100%',
  minHeight: 'var(--touch-min)',
  transition: 'background var(--transition)',
}

const cardItemCompactStyle: CSSProperties = {
  display: 'flex', alignItems: 'center',
  padding: '6px 12px', background: 'transparent',
  borderBottom: '1px solid var(--border)',
  cursor: 'pointer',
  minHeight: '32px',
}
