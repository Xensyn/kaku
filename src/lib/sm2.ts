// Implémentation de l'algorithme SM-2 (SuperMemo 2)

import type { Rating } from '../types/review'
import type { SRSCardData } from '../types/card'

interface SM2Result {
  interval: number // jours
  ease: number
  level: number
  state: SRSCardData['state']
}

export function sm2Schedule(
  rating: Rating,
  currentLevel: number,
  currentEase: number,
  currentInterval: number
): SM2Result {
  // Convertir rating 1-4 vers qualité SM-2 (0-5)
  // 1=Again→0, 2=Hard→2, 3=Good→3, 4=Easy→5
  const qualityMap: Record<Rating, number> = { 1: 0, 2: 2, 3: 3, 4: 5 }
  const quality = qualityMap[rating]

  let ease = currentEase
  let level = currentLevel
  let interval = currentInterval

  if (quality < 3) {
    // Échec : retour au début
    level = 0
    interval = 1
    return { interval, ease, level, state: 'relearning' }
  }

  // Mise à jour du facteur de facilité
  ease = ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  if (ease < 1.3) ease = 1.3

  // Calcul de l'intervalle
  level += 1
  if (level === 1) {
    interval = 1
  } else if (level === 2) {
    interval = 6
  } else {
    interval = Math.round(currentInterval * ease)
  }

  return {
    interval,
    ease,
    level,
    state: level <= 2 ? 'learning' : 'review',
  }
}

export function createNewSM2Data(initialEase: number = 2.5): SRSCardData {
  const today = new Date().toISOString().slice(0, 10)
  return {
    algorithm: 'sm2',
    sm2Level: 0,
    sm2Ease: initialEase,
    sm2Interval: 0,
    nextReview: today,
    state: 'new',
  }
}

export function applySM2(
  cardData: SRSCardData,
  rating: Rating
): SRSCardData {
  const result = sm2Schedule(
    rating,
    cardData.sm2Level ?? 0,
    cardData.sm2Ease ?? 2.5,
    cardData.sm2Interval ?? 0
  )

  const nextDate = new Date()
  nextDate.setDate(nextDate.getDate() + result.interval)

  return {
    ...cardData,
    sm2Level: result.level,
    sm2Ease: result.ease,
    sm2Interval: result.interval,
    nextReview: nextDate.toISOString().slice(0, 10),
    lastReview: new Date().toISOString().slice(0, 10),
    state: result.state,
  }
}

// Prévisualisation des intervalles pour chaque rating
export function sm2Preview(
  cardData: SRSCardData
): Record<Rating, number> {
  const ratings: Rating[] = [1, 2, 3, 4]
  const result = {} as Record<Rating, number>
  for (const r of ratings) {
    const scheduled = sm2Schedule(
      r,
      cardData.sm2Level ?? 0,
      cardData.sm2Ease ?? 2.5,
      cardData.sm2Interval ?? 0
    )
    result[r] = scheduled.interval
  }
  return result
}
