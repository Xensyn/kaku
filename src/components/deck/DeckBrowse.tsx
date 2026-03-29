import { useState, type CSSProperties } from 'react'
import { Plus, Play, Trash2, Settings, FolderPlus, ChevronRight, BarChart3 } from 'lucide-react'
import { useDeckCards, useDeck, useTotalDueCount, useTotalCardCount, useSubDecks } from '../../db/hooks'
import { useAppStore } from '../../store/useAppStore'
import { useCardStore } from '../../store/useCardStore'
import { useDeckStore } from '../../store/useDeckStore'
import { Header } from '../layout/Header'
import { Button } from '../ui/Button'
import { IconButton } from '../ui/IconButton'
import { Modal } from '../ui/Modal'
import { DeckDueCount } from './DeckDueCount'

export function DeckBrowse() {
  const { selectedDeckId, navigate, editCard, selectDeck } = useAppStore()
  const { createCard, deleteCard } = useCardStore()
  const { createDeck } = useDeckStore()

  const deck = useDeck(selectedDeckId ?? '')
  const cards = useDeckCards(selectedDeckId ?? '')
  const totalDue = useTotalDueCount(selectedDeckId ?? '')
  const totalCards = useTotalCardCount(selectedDeckId ?? '')
  const subDecks = useSubDecks(selectedDeckId ?? '')

  const [showCreateSub, setShowCreateSub] = useState(false)
  const [subDeckName, setSubDeckName] = useState('')

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

  const getPreview = (card: NonNullable<typeof cards>[number]) => {
    const firstBlock = card.front.blocks.find((b) => b.type === 'text')
    return firstBlock?.textContent || '(vide)'
  }

  return (
    <div style={containerStyle}>
      <Header
        title={deck.name}
        showBack
        right={
          <>
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

      {/* Bouton révision */}
      {(totalDue ?? 0) > 0 && (
        <div style={{ padding: '0 16px 8px' }}>
          <Button fullWidth onClick={handleStartReview}>
            <Play size={18} fill="currentColor" />
            Réviser ({totalDue} carte{(totalDue ?? 0) > 1 ? 's' : ''})
          </Button>
        </div>
      )}

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
        {cards?.map((card) => (
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
              onClick={(e) => { e.stopPropagation(); deleteCard(card.id) }}
              label="Supprimer"
            >
              <Trash2 size={14} />
            </IconButton>
          </div>
        ))}
      </div>

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
