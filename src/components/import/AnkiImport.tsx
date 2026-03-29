// Importation de cartes depuis un fichier texte Anki (.txt) ou CSV

import { useState, type CSSProperties, type ChangeEvent } from 'react'
import { Upload, FileText, CheckCircle } from 'lucide-react'
import { v4 as uuid } from 'uuid'
import { useAppStore } from '../../store/useAppStore'
import { useDecks } from '../../db/hooks'
import { db } from '../../db/database'
import { Header } from '../layout/Header'
import { Button } from '../ui/Button'
import type { Card, CardSide } from '../../types/card'
import { createNewSRSData } from '../../lib/srs-engine'

interface ParsedCard {
  front: string
  back: string
}

/** Analyser les champs CSV en tenant compte des guillemets */
function parseCsvLine(line: string): string[] {
  const fields: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Guillemet doublé = guillemet littéral
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === ',' && !inQuotes) {
      fields.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  fields.push(current)
  return fields
}

/** Analyser le contenu d'un fichier .txt (tabulation) ou .csv */
function parseFile(text: string, isCsv: boolean): ParsedCard[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '')
  const cards: ParsedCard[] = []

  for (const line of lines) {
    // Ignorer les commentaires Anki (lignes commençant par #)
    if (line.startsWith('#')) continue

    const fields = isCsv ? parseCsvLine(line) : line.split('\t')
    if (fields.length < 2) continue

    const front = fields[0].trim()
    const back = fields[1].trim()
    if (front || back) {
      cards.push({ front, back })
    }
  }
  return cards
}

function makeTextSide(text: string): CardSide {
  return {
    blocks: [
      {
        id: uuid(),
        type: 'text',
        order: 0,
        textContent: text,
      },
    ],
  }
}

export function AnkiImport() {
  const { goBack } = useAppStore()
  const decks = useDecks()

  const [parsedCards, setParsedCards] = useState<ParsedCard[]>([])
  const [fileName, setFileName] = useState<string>('')
  const [selectedDeckId, setSelectedDeckId] = useState<string>('')
  const [status, setStatus] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [imported, setImported] = useState(false)

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setFileName(file.name)
    setStatus(null)
    setImported(false)

    const isCsv = file.name.toLowerCase().endsWith('.csv')

    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const cards = parseFile(text, isCsv)
      setParsedCards(cards)
      if (cards.length === 0) {
        setStatus('Aucune carte trouvée dans ce fichier.')
      }
    }
    reader.readAsText(file, 'UTF-8')
  }

  const handleImport = async () => {
    if (!selectedDeckId) {
      setStatus('Veuillez sélectionner un deck de destination.')
      return
    }
    if (parsedCards.length === 0) {
      setStatus('Aucune carte à importer.')
      return
    }

    const deck = decks?.find((d) => d.id === selectedDeckId)
    if (!deck) {
      setStatus('Deck introuvable.')
      return
    }

    setImporting(true)
    setStatus(null)

    try {
      const now = new Date().toISOString()
      const cards: Card[] = parsedCards.map((pc) => ({
        id: uuid(),
        deckId: selectedDeckId,
        front: makeTextSide(pc.front),
        back: makeTextSide(pc.back),
        tags: [],
        bidirectional: false,
        createdAt: now,
        updatedAt: now,
        srs: createNewSRSData(deck.settings.algorithm),
      }))

      await db.cards.bulkAdd(cards)
      setStatus(`${cards.length} carte${cards.length > 1 ? 's' : ''} importée${cards.length > 1 ? 's' : ''} avec succès !`)
      setImported(true)
      setParsedCards([])
      setFileName('')
    } catch {
      setStatus('Erreur lors de l\'import.')
    } finally {
      setImporting(false)
    }
  }

  const preview = parsedCards.slice(0, 5)
  const flatDecks = decks ?? []

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <Header title="Importer depuis Anki" showBack onBack={goBack} />

      <div style={{ flex: 1, overflow: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Explication */}
        <div style={infoBoxStyle}>
          <FileText size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <div style={{ fontWeight: 600, marginBottom: '4px' }}>Format supporté</div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
              Exportez vos cartes depuis Anki via <strong>Fichier → Exporter</strong>, format <em>Texte séparé par des notes</em> (.txt) ou CSV.
              Une ligne = une carte, avec le recto et le verso séparés par une tabulation (txt) ou une virgule (csv).
            </div>
          </div>
        </div>

        {/* Sélecteur de fichier */}
        <div style={sectionStyle}>
          <label style={labelStyle}>Fichier (.txt ou .csv)</label>
          <label style={filePickerStyle}>
            <Upload size={18} />
            <span>{fileName || 'Choisir un fichier...'}</span>
            <input
              type="file"
              accept=".txt,.csv"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
          </label>
        </div>

        {/* Sélecteur de deck */}
        {parsedCards.length > 0 && (
          <div style={sectionStyle}>
            <label style={labelStyle}>Deck de destination</label>
            <select
              style={selectStyle}
              value={selectedDeckId}
              onChange={(e) => setSelectedDeckId(e.target.value)}
            >
              <option value="">Choisir un deck...</option>
              {flatDecks.map((deck) => (
                <option key={deck.id} value={deck.id}>
                  {deck.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Aperçu */}
        {parsedCards.length > 0 && (
          <div style={sectionStyle}>
            <label style={labelStyle}>
              Aperçu ({Math.min(5, parsedCards.length)} sur {parsedCards.length} carte{parsedCards.length > 1 ? 's' : ''})
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {preview.map((card, i) => (
                <div key={i} style={previewCardStyle}>
                  <div style={previewFieldStyle}>
                    <span style={previewFieldLabelStyle}>Recto</span>
                    <span style={{ flex: 1, fontSize: '13px' }}>{card.front}</span>
                  </div>
                  <div style={{ height: '1px', background: 'var(--border)' }} />
                  <div style={previewFieldStyle}>
                    <span style={previewFieldLabelStyle}>Verso</span>
                    <span style={{ flex: 1, fontSize: '13px' }}>{card.back}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Statut */}
        {status && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px',
            background: imported ? 'var(--success-light, rgba(34,197,94,0.1))' : 'var(--bg-elevated)',
            border: `1px solid ${imported ? 'var(--success, #22c55e)' : 'var(--border)'}`,
            borderRadius: 'var(--radius)',
            fontSize: '13px',
            color: imported ? 'var(--success, #22c55e)' : 'var(--text-primary)',
          }}>
            {imported && <CheckCircle size={16} />}
            {status}
          </div>
        )}

        {/* Bouton d'import */}
        {parsedCards.length > 0 && (
          <Button
            fullWidth
            onClick={handleImport}
            disabled={importing || !selectedDeckId}
          >
            {importing ? 'Import en cours...' : `Importer ${parsedCards.length} carte${parsedCards.length > 1 ? 's' : ''}`}
          </Button>
        )}
      </div>
    </div>
  )
}

const infoBoxStyle: CSSProperties = {
  display: 'flex',
  gap: '10px',
  padding: '14px',
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
  color: 'var(--text-secondary)',
}

const sectionStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
}

const labelStyle: CSSProperties = {
  fontSize: '12px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  color: 'var(--text-muted)',
}

const filePickerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  padding: '12px 16px',
  background: 'var(--bg-card)',
  border: '1px dashed var(--border)',
  borderRadius: 'var(--radius)',
  cursor: 'pointer',
  fontSize: '14px',
  color: 'var(--text-secondary)',
  minHeight: 'var(--touch-min)',
}

const selectStyle: CSSProperties = {
  padding: '10px 14px',
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
  color: 'var(--text-primary)',
  fontSize: '14px',
  minHeight: 'var(--touch-min)',
  width: '100%',
}

const previewCardStyle: CSSProperties = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
  overflow: 'hidden',
}

const previewFieldStyle: CSSProperties = {
  display: 'flex',
  gap: '10px',
  alignItems: 'baseline',
  padding: '8px 12px',
}

const previewFieldLabelStyle: CSSProperties = {
  fontSize: '11px',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  color: 'var(--text-muted)',
  minWidth: '40px',
  flexShrink: 0,
}
