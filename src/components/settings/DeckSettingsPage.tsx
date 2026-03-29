import { type CSSProperties } from 'react'
import { useDeck } from '../../db/hooks'
import { useDeckStore } from '../../store/useDeckStore'
import { useAppStore } from '../../store/useAppStore'
import { Header } from '../layout/Header'
import type { SRSAlgorithm } from '../../types/card'

export function DeckSettingsPage() {
  const { selectedDeckId, goBack } = useAppStore()
  const { updateDeckSettings } = useDeckStore()
  const deck = useDeck(selectedDeckId ?? '')

  if (!deck) {
    return (
      <div>
        <Header title="Réglages du deck" showBack />
        <p style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Deck introuvable
        </p>
      </div>
    )
  }

  const { settings } = deck

  const handleAlgorithmChange = (algorithm: SRSAlgorithm) => {
    updateDeckSettings(deck.id, { algorithm })
  }

  const sectionStyle: CSSProperties = {
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  }

  const sectionTitle: CSSProperties = {
    fontSize: '13px',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    padding: '0 4px',
  }

  const rowStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 16px',
    background: 'var(--bg-card)',
    borderRadius: 'var(--radius)',
    border: '1px solid var(--border)',
    minHeight: 'var(--touch-min)',
  }

  const algoButtonStyle = (isActive: boolean): CSSProperties => ({
    flex: 1,
    padding: '12px',
    border: isActive ? '2px solid var(--accent)' : '1px solid var(--border)',
    background: isActive ? 'var(--accent-light)' : 'var(--bg-elevated)',
    color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
    borderRadius: 'var(--radius)',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '14px',
    textAlign: 'center' as const,
    transition: 'all var(--transition)',
    minHeight: 'var(--touch-min)',
  })

  const inputStyle: CSSProperties = {
    width: '70px',
    padding: '8px 12px',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-primary)',
    fontSize: '14px',
    textAlign: 'center',
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <Header title={`Réglages — ${deck.name}`} showBack onBack={goBack} />

      {/* Algorithme */}
      <div style={sectionStyle}>
        <h3 style={sectionTitle}>Algorithme de répétition</h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            style={algoButtonStyle(settings.algorithm === 'fsrs')}
            onClick={() => handleAlgorithmChange('fsrs')}
          >
            <div>FSRS</div>
            <div style={{ fontSize: '11px', fontWeight: 400, marginTop: '4px', opacity: 0.7 }}>
              Moderne, adaptatif
            </div>
          </button>
          <button
            style={algoButtonStyle(settings.algorithm === 'sm2')}
            onClick={() => handleAlgorithmChange('sm2')}
          >
            <div>SM-2</div>
            <div style={{ fontSize: '11px', fontWeight: 400, marginTop: '4px', opacity: 0.7 }}>
              Classique (Anki)
            </div>
          </button>
        </div>
      </div>

      {/* Limites quotidiennes */}
      <div style={sectionStyle}>
        <h3 style={sectionTitle}>Limites quotidiennes</h3>
        <div style={rowStyle}>
          <span style={{ fontWeight: 500 }}>Nouvelles cartes / jour</span>
          <input
            type="number"
            style={inputStyle}
            value={settings.newCardsPerDay}
            min={1}
            max={999}
            onChange={(e) => {
              const val = parseInt(e.target.value)
              if (!isNaN(val) && val > 0) {
                updateDeckSettings(deck.id, { newCardsPerDay: val })
              }
            }}
          />
        </div>
        <div style={rowStyle}>
          <span style={{ fontWeight: 500 }}>Révisions / jour</span>
          <input
            type="number"
            style={inputStyle}
            value={settings.reviewsPerDay}
            min={1}
            max={9999}
            onChange={(e) => {
              const val = parseInt(e.target.value)
              if (!isNaN(val) && val > 0) {
                updateDeckSettings(deck.id, { reviewsPerDay: val })
              }
            }}
          />
        </div>
      </div>

      {/* Paramètres FSRS */}
      {settings.algorithm === 'fsrs' && (
        <div style={sectionStyle}>
          <h3 style={sectionTitle}>Paramètres FSRS</h3>
          <div style={rowStyle}>
            <div>
              <div style={{ fontWeight: 500 }}>Rétention cible</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Probabilité de se souvenir (0.7 - 0.97)
              </div>
            </div>
            <input
              type="number"
              style={inputStyle}
              value={settings.fsrsRequestRetention ?? 0.9}
              min={0.7}
              max={0.97}
              step={0.01}
              onChange={(e) => {
                const val = parseFloat(e.target.value)
                if (!isNaN(val) && val >= 0.7 && val <= 0.97) {
                  updateDeckSettings(deck.id, { fsrsRequestRetention: val })
                }
              }}
            />
          </div>
        </div>
      )}

      {/* Paramètres SM-2 */}
      {settings.algorithm === 'sm2' && (
        <div style={sectionStyle}>
          <h3 style={sectionTitle}>Paramètres SM-2</h3>
          <div style={rowStyle}>
            <div>
              <div style={{ fontWeight: 500 }}>Facilité initiale</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Facteur de départ (1.3 - 5.0)
              </div>
            </div>
            <input
              type="number"
              style={inputStyle}
              value={settings.sm2InitialEase ?? 2.5}
              min={1.3}
              max={5.0}
              step={0.1}
              onChange={(e) => {
                const val = parseFloat(e.target.value)
                if (!isNaN(val) && val >= 1.3 && val <= 5.0) {
                  updateDeckSettings(deck.id, { sm2InitialEase: val })
                }
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
