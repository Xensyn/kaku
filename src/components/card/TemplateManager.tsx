// Gestionnaire de modèles de cartes

import { useState, useEffect, type CSSProperties } from 'react'
import { v4 as uuid } from 'uuid'
import { Trash2, LayoutTemplate } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import type { CardTemplate } from '../../types/template'
import type { MediaBlock } from '../../types/card'
import { getAllTemplates, saveTemplate, deleteTemplate } from '../../db/templates'

interface TemplateManagerProps {
  open: boolean
  onClose: () => void
  /** Blocs courants du recto pour sauvegarder comme template */
  currentFrontBlocks?: MediaBlock[]
  /** Blocs courants du verso pour sauvegarder comme template */
  currentBackBlocks?: MediaBlock[]
  /** Appelé quand l'utilisateur choisit un template */
  onApply: (template: CardTemplate) => void
}

const BLOCK_TYPE_LABELS: Record<string, string> = {
  text: 'Texte',
  image: 'Image',
  audio: 'Audio',
  video: 'Vidéo',
  drawing: 'Dessin',
}

export function TemplateManager({
  open,
  onClose,
  currentFrontBlocks,
  currentBackBlocks,
  onApply,
}: TemplateManagerProps) {
  const [templates, setTemplates] = useState<CardTemplate[]>([])
  const [saveName, setSaveName] = useState('')
  const [showSaveForm, setShowSaveForm] = useState(false)
  const [saving, setSaving] = useState(false)

  const reload = () => {
    getAllTemplates().then(setTemplates)
  }

  useEffect(() => {
    if (open) reload()
  }, [open])

  const handleSave = async () => {
    if (!saveName.trim()) return
    setSaving(true)
    try {
      const tmpl: CardTemplate = {
        id: uuid(),
        name: saveName.trim(),
        frontBlocks: (currentFrontBlocks ?? []).map((b) => ({ type: b.type })),
        backBlocks: (currentBackBlocks ?? []).map((b) => ({ type: b.type })),
        builtIn: false,
        createdAt: new Date().toISOString(),
      }
      await saveTemplate(tmpl)
      setSaveName('')
      setShowSaveForm(false)
      reload()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    await deleteTemplate(id)
    reload()
  }

  const handleApply = (tmpl: CardTemplate) => {
    onApply(tmpl)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Modèles de cartes">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* Liste des templates */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {templates.length === 0 && (
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center', padding: '16px 0' }}>
              Aucun modèle disponible.
            </p>
          )}
          {templates.map((tmpl) => (
            <div key={tmpl.id} style={templateRowStyle}>
              <div style={{ flex: 1 }}>
                <div style={templateNameStyle}>
                  <LayoutTemplate size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                  <span>{tmpl.name}</span>
                  {tmpl.builtIn && (
                    <span style={builtInBadgeStyle}>intégré</span>
                  )}
                </div>
                <div style={templateDescStyle}>
                  <span>Recto : {tmpl.frontBlocks.map((b) => BLOCK_TYPE_LABELS[b.type] ?? b.type).join(', ') || '—'}</span>
                  <span style={{ color: 'var(--border-light)' }}> · </span>
                  <span>Verso : {tmpl.backBlocks.map((b) => BLOCK_TYPE_LABELS[b.type] ?? b.type).join(', ') || '—'}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <button
                  style={applyButtonStyle}
                  onClick={() => handleApply(tmpl)}
                >
                  Utiliser
                </button>
                {!tmpl.builtIn && (
                  <button
                    style={deleteButtonStyle}
                    onClick={() => handleDelete(tmpl.id)}
                    title="Supprimer ce modèle"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Formulaire de sauvegarde */}
        {showSaveForm ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Sauvegarder la structure actuelle comme modèle :
            </p>
            <input
              type="text"
              placeholder="Nom du modèle..."
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              style={inputStyle}
              autoFocus
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button onClick={handleSave} disabled={!saveName.trim() || saving} style={{ flex: 1 }}>
                {saving ? 'Sauvegarde...' : 'Sauvegarder'}
              </Button>
              <Button variant="ghost" onClick={() => setShowSaveForm(false)} style={{ flex: 1 }}>
                Annuler
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="ghost"
            onClick={() => setShowSaveForm(true)}
            style={{ border: '1px dashed var(--border)' }}
          >
            Sauvegarder la carte actuelle comme modèle
          </Button>
        )}
      </div>
    </Modal>
  )
}

const templateRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  padding: '12px',
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
}

const templateNameStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  fontWeight: 600,
  fontSize: '14px',
  color: 'var(--text-primary)',
  marginBottom: '4px',
}

const templateDescStyle: CSSProperties = {
  fontSize: '12px',
  color: 'var(--text-muted)',
}

const builtInBadgeStyle: CSSProperties = {
  fontSize: '10px',
  fontWeight: 600,
  padding: '1px 5px',
  borderRadius: '4px',
  background: 'var(--accent-light)',
  color: 'var(--accent)',
  textTransform: 'uppercase',
  letterSpacing: '0.3px',
}

const applyButtonStyle: CSSProperties = {
  padding: '6px 12px',
  fontSize: '12px',
  fontWeight: 600,
  background: 'var(--accent)',
  color: '#fff',
  border: 'none',
  borderRadius: 'var(--radius-sm)',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
}

const deleteButtonStyle: CSSProperties = {
  padding: '6px',
  background: 'var(--danger-light)',
  color: 'var(--danger)',
  border: 'none',
  borderRadius: 'var(--radius-sm)',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

const inputStyle: CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-primary)',
  fontSize: '14px',
}
