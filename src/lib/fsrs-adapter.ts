// Adaptateur pour la bibliothèque ts-fsrs

import {
  fsrs,
  generatorParameters,
  createEmptyCard,
  type Card as FSRSCard,
  type RecordLogItem,
  Rating as FSRSRating,
  State,
} from 'ts-fsrs'
import type { Rating } from '../types/review'
import type { SRSCardData } from '../types/card'

// Mapping de nos ratings vers les ratings ts-fsrs
const ratingMap: Record<Rating, FSRSRating> = {
  1: FSRSRating.Again,
  2: FSRSRating.Hard,
  3: FSRSRating.Good,
  4: FSRSRating.Easy,
}

// Mapping des états ts-fsrs vers nos états
function mapState(state: State): SRSCardData['state'] {
  switch (state) {
    case State.New: return 'new'
    case State.Learning: return 'learning'
    case State.Review: return 'review'
    case State.Relearning: return 'relearning'
    default: return 'new'
  }
}

// Créer une instance FSRS avec des paramètres
export function createFSRS(requestRetention: number = 0.9, maxInterval: number = 36500) {
  const params = generatorParameters({
    request_retention: requestRetention,
    maximum_interval: maxInterval,
  })
  return fsrs(params)
}

// Créer les données SRS initiales pour une nouvelle carte FSRS
export function createNewFSRSData(): SRSCardData {
  const card = createEmptyCard()
  return {
    algorithm: 'fsrs',
    fsrsCard: JSON.stringify(card),
    nextReview: new Date().toISOString().slice(0, 10),
    state: 'new',
  }
}

// Appliquer une révision FSRS
export function applyFSRS(
  cardData: SRSCardData,
  rating: Rating,
  requestRetention: number = 0.9,
  maxInterval: number = 36500
): SRSCardData {
  const scheduler = createFSRS(requestRetention, maxInterval)
  const fsrsCard: FSRSCard = cardData.fsrsCard
    ? JSON.parse(cardData.fsrsCard, (key, value) => {
        // Reconvertir les dates sérialisées
        if (key === 'due' || key === 'last_review') {
          return value ? new Date(value) : undefined
        }
        return value
      })
    : createEmptyCard()

  const now = new Date()
  const result = scheduler.repeat(fsrsCard, now)
  const scheduled: RecordLogItem = result[ratingMap[rating]]
  const newCard = scheduled.card

  return {
    ...cardData,
    fsrsCard: JSON.stringify(newCard),
    nextReview: newCard.due.toISOString().slice(0, 10),
    lastReview: now.toISOString().slice(0, 10),
    state: mapState(newCard.state),
  }
}

// Prévisualisation des intervalles pour chaque rating
export function fsrsPreview(
  cardData: SRSCardData,
  requestRetention: number = 0.9,
  maxInterval: number = 36500
): Record<Rating, number> {
  const scheduler = createFSRS(requestRetention, maxInterval)
  const fsrsCard: FSRSCard = cardData.fsrsCard
    ? JSON.parse(cardData.fsrsCard, (key, value) => {
        if (key === 'due' || key === 'last_review') {
          return value ? new Date(value) : undefined
        }
        return value
      })
    : createEmptyCard()

  const now = new Date()
  const result = scheduler.repeat(fsrsCard, now)

  const ratings: Rating[] = [1, 2, 3, 4]
  const preview = {} as Record<Rating, number>
  for (const r of ratings) {
    const scheduled = result[ratingMap[r]]
    const due = scheduled.card.due
    const diffMs = due.getTime() - now.getTime()
    const diffDays = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)))
    preview[r] = diffDays
  }
  return preview
}
