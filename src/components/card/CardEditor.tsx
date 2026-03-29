import { useState, type CSSProperties } from 'react'
import { ArrowLeftRight, Type, ImagePlus, Mic, Video, Pencil, Plus, Repeat } from 'lucide-react'
import { v4 as uuid } from 'uuid'
import { useCard, useDeck } from '../../db/hooks'
import { useAppStore } from '../../store/useAppStore'
import { useCardStore } from '../../store/useCardStore'
import { Header } from '../layout/Header'
import { Button } from '../ui/Button'
import { IconButton } from '../ui/IconButton'
import { MediaBlockEditor } from './MediaBlockEditor'
import { createNewSRSData } from '../../lib/srs-engine'
import type { MediaBlock, MediaBlockType, CardSide } from '../../types/card'

export function CardEditor() {
  const { editingCardId, selectedDeckId, goBack } = useAppStore()
  const { updateCard, updateCardSide, createCard } = useCardStore()

  const card = useCard(editingCardId ?? '')
  const deck = useDeck(selectedDeckId ?? '')
  const [activeSide, setActiveSide] = useState<'front' | 'back'>('front')
  const [showAddMenu, setShowAddMenu] = useState(false)

  // Si pas de carte, proposer d'en créer une
  if (!editingCardId || !card) {
    if (!selectedDeckId || !deck) {
      return (
        <div>
          <Header title="Éditeur" showBack />
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Sélectionnez un deck d'abord.
          </div>
        </div>
      )
    }

    const handleCreate = async () => {
      const id = await createCard(selectedDeckId, deck.settings.algorithm)
      useAppStore.getState().editCard(id)
    }

    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Header title="Nouvelle carte" showBack />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px' }}>
          <Button onClick={handleCreate}>Créer une carte</Button>
        </div>
      </div>
    )
  }

  const side = card[activeSide]

  const handleUpdateBlock = (blockId: string, updatedBlock: MediaBlock) => {
    const blocks = side.blocks.map((b) => (b.id === blockId ? updatedBlock : b))
    updateCardSide(card.id, activeSide, { blocks })
  }

  const handleRemoveBlock = (blockId: string) => {
    const blocks = side.blocks
      .filter((b) => b.id !== blockId)
      .map((b, i) => ({ ...b, order: i }))
    updateCardSide(card.id, activeSide, { blocks })
  }

  const handleAddBlock = (type: MediaBlockType) => {
    const newBlock: MediaBlock = {
      id: uuid(),
      type,
      order: side.blocks.length,
      textContent: type === 'text' ? '' : undefined,
    }
    const blocks = [...side.blocks, newBlock]
    updateCardSide(card.id, activeSide, { blocks })
    setShowAddMenu(false)
  }

  const tabStyle = (isActive: boolean): CSSProperties => ({
    flex: 1,
    padding: '10px',
    border: 'none',
    background: isActive ? 'var(--accent)' : 'var(--bg-elevated)',
    color: isActive ? '#fff' : 'var(--text-secondary)',
    fontWeight: 600,
    fontSize: '14px',
    cursor: 'pointer',
    borderRadius: 'var(--radius-sm)',
    transition: 'all var(--transition)',
    minHeight: 'var(--touch-min)',
  })

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <Header
        title="Éditer la carte"
        showBack
        onBack={() => {
          useAppStore.getState().editCard(null)
          goBack()
        }}
      />

      <div style={{ flex: 1, overflow: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Onglets Recto / Verso */}
        <div style={{ display: 'flex', gap: '8px', padding: '4px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius)' }}>
          <button style={tabStyle(activeSide === 'front')} onClick={() => setActiveSide('front')}>
            Recto (Question)
          </button>
          <button style={tabStyle(activeSide === 'back')} onClick={() => setActiveSide('back')}>
            Verso (Réponse)
          </button>
        </div>

        {/* Toggle bidirectionnel */}
        <button
          style={{
            ...bidirectionalStyle,
            background: card.bidirectional ? 'var(--accent-light)' : 'var(--bg-elevated)',
            color: card.bidirectional ? 'var(--accent)' : 'var(--text-muted)',
            border: `1px solid ${card.bidirectional ? 'var(--accent)' : 'var(--border)'}`,
          }}
          onClick={async () => {
            const newBidi = !card.bidirectional
            const updates: Partial<typeof card> = { bidirectional: newBidi }
            if (newBidi && !card.srsReverse) {
              updates.srsReverse = createNewSRSData(card.srs.algorithm)
            }
            await updateCard(card.id, updates)
          }}
        >
          <Repeat size={16} />
          <span>Bidirectionnel</span>
          <span style={{
            fontSize: '11px', padding: '1px 6px', borderRadius: '6px',
            background: card.bidirectional ? 'var(--accent)' : 'var(--bg-secondary)',
            color: card.bidirectional ? '#fff' : 'var(--text-muted)',
            fontWeight: 600,
          }}>
            {card.bidirectional ? 'ON' : 'OFF'}
          </span>
        </button>

        {/* Liste des blocs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {side.blocks.map((block) => (
            <MediaBlockEditor
              key={block.id}
              block={block}
              onUpdate={(updated) => handleUpdateBlock(block.id, updated)}
              onRemove={() => handleRemoveBlock(block.id)}
              showRemove={side.blocks.length > 1}
            />
          ))}
        </div>

        {/* Bouton + menu d'ajout */}
        <div style={{ position: 'relative' }}>
          <Button
            variant="ghost"
            fullWidth
            onClick={() => setShowAddMenu(!showAddMenu)}
            style={{ border: '1px dashed var(--border)' }}
          >
            <Plus size={18} />
            Ajouter un bloc
          </Button>

          {showAddMenu && (
            <div style={addMenuStyle}>
              {ADD_BLOCK_OPTIONS.map(({ type, label, icon: Icon }) => (
                <button
                  key={type}
                  style={addMenuItemStyle}
                  onClick={() => handleAddBlock(type)}
                >
                  <Icon size={18} />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Basculer recto/verso */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <IconButton
            onClick={() => setActiveSide(activeSide === 'front' ? 'back' : 'front')}
            label="Basculer recto/verso"
            style={{ color: 'var(--accent)' }}
          >
            <ArrowLeftRight size={20} />
          </IconButton>
        </div>
      </div>
    </div>
  )
}

const ADD_BLOCK_OPTIONS: { type: MediaBlockType; label: string; icon: typeof Type }[] = [
  { type: 'text', label: 'Texte', icon: Type },
  { type: 'image', label: 'Image', icon: ImagePlus },
  { type: 'audio', label: 'Audio', icon: Mic },
  { type: 'video', label: 'Vidéo', icon: Video },
  { type: 'drawing', label: 'Dessin', icon: Pencil },
]

const addMenuStyle: CSSProperties = {
  position: 'absolute',
  bottom: '100%',
  left: 0,
  right: 0,
  marginBottom: '4px',
  background: 'var(--bg-secondary)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
  padding: '4px',
  display: 'flex',
  flexDirection: 'column',
  gap: '2px',
  zIndex: 10,
  boxShadow: 'var(--shadow)',
}

const bidirectionalStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '10px 14px',
  borderRadius: 'var(--radius)',
  cursor: 'pointer',
  fontSize: '14px',
  fontWeight: 500,
  minHeight: 'var(--touch-min)',
  transition: 'all var(--transition)',
}

const addMenuItemStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  padding: '10px 12px',
  border: 'none',
  background: 'transparent',
  color: 'var(--text-primary)',
  cursor: 'pointer',
  borderRadius: 'var(--radius-sm)',
  fontSize: '14px',
  minHeight: 'var(--touch-min)',
  transition: 'background var(--transition)',
}
