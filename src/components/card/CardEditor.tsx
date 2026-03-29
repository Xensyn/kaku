import { useState, useEffect, useRef, type CSSProperties } from 'react'
import { ArrowLeftRight, Type, ImagePlus, Mic, Video, Pencil, Plus, Repeat, Eye, EyeOff, LayoutTemplate, GripVertical, ChevronUp, ChevronDown } from 'lucide-react'
import { v4 as uuid } from 'uuid'
import { useCard, useDeck } from '../../db/hooks'
import { useAppStore } from '../../store/useAppStore'
import { useCardStore } from '../../store/useCardStore'
import { Header } from '../layout/Header'
import { Button } from '../ui/Button'
import { IconButton } from '../ui/IconButton'
import { MediaBlockEditor } from './MediaBlockEditor'
import { MediaBlockDisplay } from '../review/MediaBlockDisplay'
import { TemplateManager } from './TemplateManager'
import { createNewSRSData } from '../../lib/srs-engine'
import { seedBuiltInTemplates } from '../../db/templates'
import type { MediaBlock, MediaBlockType } from '../../types/card'
import type { CardTemplate } from '../../types/template'

export function CardEditor() {
  const { editingCardId, selectedDeckId, goBack } = useAppStore()
  const { updateCard, updateCardSide, createCard } = useCardStore()

  const card = useCard(editingCardId ?? '')
  const deck = useDeck(selectedDeckId ?? '')
  const [activeSide, setActiveSide] = useState<'front' | 'back'>('front')
  const [showAddMenu, setShowAddMenu] = useState(false)
  const [previewMode, setPreviewMode] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)

  // Drag & drop
  const dragIndexRef = useRef<number>(-1)
  const [dropIndex, setDropIndex] = useState<number>(-1)

  // Initialiser les templates intégrés au premier rendu
  useEffect(() => {
    seedBuiltInTemplates()
  }, [])

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

  // Réordonner les blocs via glisser-déposer
  const handleDragStart = (index: number) => {
    dragIndexRef.current = index
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    setDropIndex(index)
  }

  const handleDragEnd = () => {
    const from = dragIndexRef.current
    const to = dropIndex
    if (from !== -1 && to !== -1 && from !== to) {
      const blocks = [...side.blocks]
      const [moved] = blocks.splice(from, 1)
      blocks.splice(to, 0, moved)
      const reordered = blocks.map((b, i) => ({ ...b, order: i }))
      updateCardSide(card.id, activeSide, { blocks: reordered })
    }
    dragIndexRef.current = -1
    setDropIndex(-1)
  }

  const handleDragLeave = () => {
    setDropIndex(-1)
  }

  // Déplacer un bloc vers le haut ou le bas (pour mobile)
  const handleMoveBlock = (index: number, direction: 'up' | 'down') => {
    const to = direction === 'up' ? index - 1 : index + 1
    if (to < 0 || to >= side.blocks.length) return
    const blocks = [...side.blocks]
    const [moved] = blocks.splice(index, 1)
    blocks.splice(to, 0, moved)
    const reordered = blocks.map((b, i) => ({ ...b, order: i }))
    updateCardSide(card.id, activeSide, { blocks: reordered })
  }

  const handleApplyTemplate = (template: CardTemplate) => {
    const makBlocks = (defs: Array<{ type: MediaBlock['type'] }>): MediaBlock[] =>
      defs.map((d, i) => ({
        id: uuid(),
        type: d.type,
        order: i,
        textContent: d.type === 'text' ? '' : undefined,
      }))

    updateCardSide(card.id, 'front', { blocks: makBlocks(template.frontBlocks) })
    updateCardSide(card.id, 'back', { blocks: makBlocks(template.backBlocks) })
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
        title={previewMode ? 'Aperçu de la carte' : 'Éditer la carte'}
        showBack
        onBack={() => {
          useAppStore.getState().editCard(null)
          goBack()
        }}
        right={
          <IconButton
            onClick={() => setPreviewMode((v) => !v)}
            label={previewMode ? 'Mode édition' : 'Aperçu'}
          >
            {previewMode ? <EyeOff size={20} /> : <Eye size={20} />}
          </IconButton>
        }
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

        {/* Mode aperçu */}
        {previewMode && (
          <div style={previewContainerStyle}>
            <div style={previewSideStyle}>
              <div style={previewSideLabelStyle}>Recto</div>
              <div style={previewBlocksStyle}>
                {card.front.blocks.map((block) => (
                  <MediaBlockDisplay key={block.id} block={block} />
                ))}
              </div>
            </div>
            <div style={previewDividerStyle} />
            <div style={previewSideStyle}>
              <div style={previewSideLabelStyle}>Verso</div>
              <div style={previewBlocksStyle}>
                {card.back.blocks.map((block) => (
                  <MediaBlockDisplay key={block.id} block={block} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Contenu édition (masqué en aperçu) */}
        {!previewMode && (
          <>
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

            {/* Bouton modèles */}
            <Button
              variant="ghost"
              fullWidth
              onClick={() => setShowTemplates(true)}
              style={{ border: '1px solid var(--border)' }}
            >
              <LayoutTemplate size={18} />
              Utiliser un modèle
            </Button>

            {/* Liste des blocs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {side.blocks.map((block, index) => (
                <div key={block.id}>
                  {/* Indicateur de dépôt au-dessus */}
                  {dropIndex === index && dragIndexRef.current !== index && dragIndexRef.current !== index - 1 && (
                    <div style={dropIndicatorStyle} />
                  )}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '4px',
                      opacity: dragIndexRef.current === index ? 0.4 : 1,
                      transition: 'opacity 150ms',
                    }}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    onDragLeave={handleDragLeave}
                  >
                    {/* Poignée drag (desktop) */}
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '2px',
                        paddingTop: '10px',
                        flexShrink: 0,
                      }}
                    >
                      <div
                        style={{
                          cursor: 'grab',
                          color: 'var(--text-muted)',
                          padding: '4px 2px',
                          borderRadius: 'var(--radius-sm)',
                        }}
                        title="Glisser pour réordonner"
                      >
                        <GripVertical size={16} />
                      </div>
                      {/* Boutons haut/bas pour mobile */}
                      <button
                        style={moveBlockBtnStyle}
                        onClick={() => handleMoveBlock(index, 'up')}
                        disabled={index === 0}
                        title="Monter"
                        aria-label="Monter ce bloc"
                      >
                        <ChevronUp size={14} />
                      </button>
                      <button
                        style={moveBlockBtnStyle}
                        onClick={() => handleMoveBlock(index, 'down')}
                        disabled={index === side.blocks.length - 1}
                        title="Descendre"
                        aria-label="Descendre ce bloc"
                      >
                        <ChevronDown size={14} />
                      </button>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <MediaBlockEditor
                        block={block}
                        onUpdate={(updated) => handleUpdateBlock(block.id, updated)}
                        onRemove={() => handleRemoveBlock(block.id)}
                        showRemove={side.blocks.length > 1}
                      />
                    </div>
                  </div>
                  {/* Indicateur de dépôt en bas du dernier élément */}
                  {index === side.blocks.length - 1 && dropIndex > index && dragIndexRef.current !== index && (
                    <div style={dropIndicatorStyle} />
                  )}
                </div>
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
          </>
        )}
      </div>

      {/* Modal de gestion des modèles */}
      <TemplateManager
        open={showTemplates}
        onClose={() => setShowTemplates(false)}
        currentFrontBlocks={card.front.blocks}
        currentBackBlocks={card.back.blocks}
        onApply={handleApplyTemplate}
      />
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

const previewContainerStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0',
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
  overflow: 'hidden',
}

const previewSideStyle: CSSProperties = {
  padding: '16px',
}

const previewSideLabelStyle: CSSProperties = {
  fontSize: '11px',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  color: 'var(--text-muted)',
  marginBottom: '12px',
}

const previewBlocksStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
}

const previewDividerStyle: CSSProperties = {
  height: '1px',
  background: 'var(--border)',
  margin: '0',
}

const dropIndicatorStyle: CSSProperties = {
  height: '3px',
  background: 'var(--accent)',
  borderRadius: '2px',
  margin: '2px 0',
}

const moveBlockBtnStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '22px',
  height: '22px',
  border: 'none',
  background: 'transparent',
  color: 'var(--text-muted)',
  cursor: 'pointer',
  borderRadius: 'var(--radius-sm)',
  padding: 0,
  opacity: 1,
  transition: 'opacity var(--transition)',
}
