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

export function ReviewSession() {
  const { selectedDeckId, navigate } = useAppStore()
  const { session, currentCard, intervals, startSession, endSession, flipCard, rateCard } = useReviewStore()
  const [totalCards, setTotalCards] = useState(0)
  const [sessionEnded, setSessionEnded] = useState(false)
  const [reviewedCount, setReviewedCount] = useState(0)

  // Suivi des stats de session
  const statsRef = useRef<Record<Rating, number>>({ 1: 0, 2: 0, 3: 0, 4: 0 })

  const handleRate = useCallback((rating: Rating) => {
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

  // Démarrer la session au montage
  useEffect(() => {
    if (!selectedDeckId) return
    setSessionEnded(false)
    setReviewedCount(0)
    statsRef.current = { 1: 0, 2: 0, 3: 0, 4: 0 }
    startSession(selectedDeckId).then((count) => {
      setTotalCards(count)
      if (count === 0) setSessionEnded(true)
    })
  }, [selectedDeckId])

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

  // Fin de session ou pas de cartes
  if (sessionEnded || (totalCards === 0 && !session)) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Header title="Révision" showBack onBack={handleEnd} />
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
        <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
          {session.currentIndex + 1} / {session.cards.length}
        </span>
        {isReverse && (
          <span style={reverseBadgeStyle}>Inversé</span>
        )}
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
  gap: '12px',
  padding: '8px 12px',
  flexShrink: 0,
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
