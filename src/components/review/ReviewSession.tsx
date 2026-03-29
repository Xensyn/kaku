import { useEffect, useState, useCallback, useRef, type CSSProperties } from 'react'
import { X, RotateCcw } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { useReviewStore } from '../../store/useReviewStore'
import { ReviewCard } from './ReviewCard'
import { ReviewControls } from './ReviewControls'
import { ReviewSummary } from './ReviewSummary'
import { SwipeHandler } from './SwipeHandler'
import { Header } from '../layout/Header'
import { Button } from '../ui/Button'
import type { Rating } from '../../types/review'

// Formater un temps en secondes en chaîne lisible
function formatEstimatedTime(seconds: number): string {
  if (seconds < 60) return `~${Math.round(seconds)}s`
  return `~${Math.round(seconds / 60)}min`
}

export function ReviewSession() {
  const { selectedDeckId, navigate } = useAppStore()
  const { session, currentCard, intervals, newCardsInSession, startSession, endSession, flipCard, rateCard } = useReviewStore()
  const [totalCards, setTotalCards] = useState(0)
  const [sessionEnded, setSessionEnded] = useState(false)
  const [reviewedCount, setReviewedCount] = useState(0)

  // Suivi des stats de session
  const statsRef = useRef<Record<Rating, number>>({ 1: 0, 2: 0, 3: 0, 4: 0 })

  // Suivi du temps moyen par carte
  const cardTimesRef = useRef<number[]>([])
  const cardStartTimeRef = useRef<number>(Date.now())

  const handleRate = useCallback((rating: Rating) => {
    // Enregistrer le temps passé sur cette carte
    const elapsed = (Date.now() - cardStartTimeRef.current) / 1000
    cardTimesRef.current.push(elapsed)
    cardStartTimeRef.current = Date.now()

    statsRef.current[rating]++
    setReviewedCount((c) => c + 1)
    rateCard(rating)
  }, [rateCard])

  // Raccourcis clavier
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!session) return
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        if (!session.isFlipped) flipCard()
      }
      if (session.isFlipped) {
        const ratingMap: Record<string, Rating> = { '1': 1, '2': 2, '3': 3, '4': 4 }
        const rating = ratingMap[e.key]
        if (rating) {
          e.preventDefault()
          handleRate(rating)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [session, flipCard, handleRate])

  // Démarrer la session au montage — seulement si aucune session n'est déjà active
  // (cas où DeckBrowse a déjà appelé startSession ou startCramSession)
  useEffect(() => {
    if (!selectedDeckId) return
    setSessionEnded(false)
    setReviewedCount(0)
    statsRef.current = { 1: 0, 2: 0, 3: 0, 4: 0 }
    cardTimesRef.current = []
    cardStartTimeRef.current = Date.now()

    if (session) {
      // Session déjà démarrée (depuis DeckBrowse)
      setTotalCards(session.cards.length)
    } else {
      // Démarrage normal sans session pré-existante
      startSession(selectedDeckId).then((count) => {
        setTotalCards(count)
        if (count === 0) setSessionEnded(true)
        cardStartTimeRef.current = Date.now()
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDeckId])

  // Réinitialiser le timer quand la carte change (après chaque notation)
  useEffect(() => {
    if (session && !session.isFlipped) {
      cardStartTimeRef.current = Date.now()
    }
  }, [session?.currentIndex, session?.isFlipped])

  // Détecter la fin de session
  useEffect(() => {
    if (totalCards > 0 && !session && !currentCard) {
      setSessionEnded(true)
    }
  }, [session, currentCard, totalCards])

  const handleEnd = () => {
    endSession()
    navigate('home')
  }

  // Calculer le temps estimé restant
  const estimatedTimeStr = (() => {
    if (!session || cardTimesRef.current.length === 0) return null
    const avg = cardTimesRef.current.reduce((a, b) => a + b, 0) / cardTimesRef.current.length
    const remaining = session.cards.length - session.currentIndex
    const totalSeconds = avg * remaining
    return formatEstimatedTime(totalSeconds)
  })()

  // Fin de session ou pas de cartes
  if (sessionEnded || (totalCards === 0 && !session)) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Header title={session?.isCram ? 'Mode Cram' : 'Révision'} showBack onBack={handleEnd} />
        {totalCards === 0 ? (
          <div style={emptyStyle}>
            <RotateCcw size={48} strokeWidth={1.2} style={{ color: 'var(--text-muted)' }} />
            <p style={{ fontSize: '18px', fontWeight: 600 }}>Aucune carte à réviser</p>
            <p style={{ color: 'var(--text-muted)' }}>
              Toutes les cartes sont à jour. Revenez plus tard !
            </p>
            <Button variant="secondary" onClick={handleEnd}>Retour</Button>
          </div>
        ) : (
          <ReviewSummary totalReviewed={reviewedCount} stats={statsRef.current} onClose={handleEnd} />
        )}
      </div>
    )
  }

  if (!session || !currentCard) return null

  const progress = session.currentIndex / session.cards.length
  const sessionCard = session.cards[session.currentIndex]
  const isReverse = sessionCard.direction === 'reverse'
  const remainingCards = session.cards.length - session.currentIndex

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
      {/* Barre de progression */}
      <div style={progressBarContainerStyle}>
        <div style={{ ...progressBarStyle, width: `${progress * 100}%` }} />
      </div>

      {/* En-tête */}
      <div style={headerBarStyle}>
        <button style={closeButtonStyle} onClick={handleEnd}>
          <X size={20} />
        </button>

        {/* Compteur + temps estimé */}
        <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
          {session.currentIndex + 1} / {session.cards.length}
        </span>
        {estimatedTimeStr && (
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {estimatedTimeStr}
          </span>
        )}

        {/* Limite nouvelles cartes (mode non-cram) */}
        {!session.isCram && newCardsInSession > 0 && (
          <span style={newCardsBadgeStyle}>
            {newCardsInSession}/{session.newCardsLimit} nouvelles
          </span>
        )}

        {/* Badge Cram */}
        {session.isCram && (
          <span style={cramBadgeStyle}>Mode Cram</span>
        )}

        {/* Badge Inversé */}
        {isReverse && (
          <span style={reverseBadgeStyle}>Inversé</span>
        )}

        {/* Cartes restantes */}
        <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: 'auto' }}>
          {remainingCards} restante{remainingCards > 1 ? 's' : ''}
        </span>
      </div>

      {/* Carte avec swipe */}
      <SwipeHandler
        onSwipeUp={() => !session.isFlipped && flipCard()}
        onSwipeLeft={() => session.isFlipped && handleRate(1)}
        onSwipeRight={() => session.isFlipped && handleRate(3)}
        enabled
      >
        <div style={{ flex: 1, display: 'flex', padding: '12px', width: '100%' }}>
          <ReviewCard
            card={currentCard}
            isFlipped={session.isFlipped}
            isReverse={isReverse}
            onFlip={flipCard}
          />
        </div>
      </SwipeHandler>

      {/* Contrôles */}
      <ReviewControls
        isFlipped={session.isFlipped}
        intervals={intervals}
        onFlip={flipCard}
        onRate={handleRate}
      />
    </div>
  )
}

const emptyStyle: CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '16px',
  padding: '32px',
  textAlign: 'center',
}

const progressBarContainerStyle: CSSProperties = {
  height: '3px',
  background: 'var(--border)',
  flexShrink: 0,
}

const progressBarStyle: CSSProperties = {
  height: '100%',
  background: 'var(--accent)',
  borderRadius: '0 2px 2px 0',
  transition: 'width 300ms ease',
}

const headerBarStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '8px 12px',
  flexShrink: 0,
  flexWrap: 'wrap',
}

const closeButtonStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 36,
  height: 36,
  borderRadius: 'var(--radius-sm)',
  background: 'transparent',
  border: 'none',
  color: 'var(--text-secondary)',
  cursor: 'pointer',
}

const reverseBadgeStyle: CSSProperties = {
  fontSize: '11px',
  padding: '2px 8px',
  borderRadius: '8px',
  background: 'var(--warning-light)',
  color: 'var(--warning)',
  fontWeight: 600,
}

const cramBadgeStyle: CSSProperties = {
  fontSize: '11px',
  padding: '2px 8px',
  borderRadius: '8px',
  background: 'var(--accent-light)',
  color: 'var(--accent)',
  fontWeight: 600,
}

const newCardsBadgeStyle: CSSProperties = {
  fontSize: '11px',
  padding: '2px 8px',
  borderRadius: '8px',
  background: 'var(--success-light)',
  color: 'var(--success)',
  fontWeight: 600,
}
