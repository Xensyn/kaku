import { useState, type CSSProperties } from 'react'
import { Plus, Play, ChevronRight, Layers, Trash2 } from 'lucide-react'
import { useRootDecks } from '../../db/hooks'
import { useDeckStore } from '../../store/useDeckStore'
import { useAppStore } from '../../store/useAppStore'
import { Header } from '../layout/Header'
import { Button } from '../ui/Button'
import { IconButton } from '../ui/IconButton'
import { Modal } from '../ui/Modal'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { DeckDueCount } from './DeckDueCount'

export function DeckList() {
  const rootDecks = useRootDecks() ?? []
  const { createDeck, deleteDeck } = useDeckStore()
  const { navigate, selectDeck } = useAppStore()

  const [showCreate, setShowCreate] = useState(false)
  const [newDeckName, setNewDeckName] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const handleCreate = async () => {
    const name = newDeckName.trim()
    if (!name) return
    await createDeck(name)
    setNewDeckName('')
    setShowCreate(false)
  }

  const handleOpenDeck = (deckId: string) => {
    selectDeck(deckId)
    navigate('browse')
  }

  const handleStartReview = (deckId: string) => {
    selectDeck(deckId)
    navigate('review')
  }

  const containerStyle: CSSProperties = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  }

  const listStyle: CSSProperties = {
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    flex: 1,
  }

  const emptyStyle: CSSProperties = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
    color: 'var(--text-muted)',
    padding: '32px',
    textAlign: 'center',
  }

  const deckItemStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '14px 16px',
    background: 'var(--bg-card)',
    borderRadius: 'var(--radius)',
    border: '1px solid var(--border)',
    cursor: 'pointer',
    transition: 'background var(--transition)',
  }

  const inputStyle: CSSProperties = {
    width: '100%',
    padding: '12px 16px',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    color: 'var(--text-primary)',
    fontSize: '15px',
    marginBottom: '16px',
  }

  return (
    <div style={containerStyle}>
      <Header
        title="Kaku"
        right={
          <IconButton onClick={() => setShowCreate(true)} label="Nouveau deck">
            <Plus size={22} />
          </IconButton>
        }
      />

      <div style={listStyle}>
        {rootDecks.length === 0 ? (
          <div style={emptyStyle}>
            <Layers size={48} strokeWidth={1.2} />
            <p style={{ fontSize: '16px', fontWeight: 500 }}>Aucun deck</p>
            <p style={{ fontSize: '14px' }}>
              Créez votre premier deck pour commencer à apprendre.
            </p>
            <Button onClick={() => setShowCreate(true)}>
              <Plus size={18} />
              Créer un deck
            </Button>
          </div>
        ) : (
          rootDecks.map((deck) => (
            <div
              key={deck.id}
              style={deckItemStyle}
              onClick={() => handleOpenDeck(deck.id)}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 'var(--radius-sm)',
                  background: deck.color || 'var(--accent-light)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                  flexShrink: 0,
                }}
              >
                {deck.icon || '📚'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: '15px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {deck.name}
                </div>
                <DeckDueCount deckId={deck.id} />
              </div>
              <IconButton
                onClick={(e) => {
                  e.stopPropagation()
                  handleStartReview(deck.id)
                }}
                label="Réviser"
                style={{ color: 'var(--accent)' }}
              >
                <Play size={20} fill="currentColor" />
              </IconButton>
              <IconButton
                onClick={(e) => {
                  e.stopPropagation()
                  setDeleteTarget(deck.id)
                }}
                label="Supprimer"
                size={36}
              >
                <Trash2 size={16} />
              </IconButton>
              <ChevronRight size={18} style={{ color: 'var(--text-muted)' }} />
            </div>
          ))
        )}
      </div>

      {/* Modal de création */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Nouveau deck">
        <input
          style={inputStyle}
          placeholder="Nom du deck..."
          value={newDeckName}
          onChange={(e) => setNewDeckName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          autoFocus
        />
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <Button variant="ghost" onClick={() => setShowCreate(false)}>
            Annuler
          </Button>
          <Button onClick={handleCreate} disabled={!newDeckName.trim()}>
            Créer
          </Button>
        </div>
      </Modal>

      {/* Confirmation de suppression */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteDeck(deleteTarget)}
        title="Supprimer le deck"
        message="Cette action supprimera le deck et toutes ses cartes. Cette action est irréversible."
        confirmLabel="Supprimer"
        danger
      />
    </div>
  )
}
