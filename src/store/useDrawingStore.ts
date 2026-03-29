// Store pour l'état du canvas de dessin

import { create } from 'zustand'
import type { DrawingStroke } from '../types/card'

export type DrawingTool = 'pen' | 'eraser'

interface DrawingState {
  tool: DrawingTool
  color: string
  strokeWidth: number
  strokes: DrawingStroke[]
  undoStack: DrawingStroke[][]

  setTool: (tool: DrawingTool) => void
  setColor: (color: string) => void
  setStrokeWidth: (width: number) => void
  setStrokes: (strokes: DrawingStroke[]) => void
  addStroke: (stroke: DrawingStroke) => void
  undo: () => void
  redo: () => void
  clear: () => void
  canUndo: () => boolean
  canRedo: () => boolean
}

export const useDrawingStore = create<DrawingState>((set, get) => ({
  tool: 'pen',
  color: '#e8e8ec',
  strokeWidth: 3,
  strokes: [],
  undoStack: [],

  setTool: (tool) => set({ tool }),
  setColor: (color) => set({ color }),
  setStrokeWidth: (width) => set({ strokeWidth: width }),

  setStrokes: (strokes) => set({ strokes, undoStack: [] }),

  addStroke: (stroke) =>
    set((state) => ({
      strokes: [...state.strokes, stroke],
      undoStack: [], // Effacer le redo quand on ajoute un trait
    })),

  undo: () =>
    set((state) => {
      if (state.strokes.length === 0) return state
      const newStrokes = state.strokes.slice(0, -1)
      return {
        strokes: newStrokes,
        undoStack: [state.strokes, ...state.undoStack],
      }
    }),

  redo: () =>
    set((state) => {
      if (state.undoStack.length === 0) return state
      const [restored, ...rest] = state.undoStack
      return {
        strokes: restored,
        undoStack: rest,
      }
    }),

  clear: () =>
    set((state) => ({
      strokes: [],
      undoStack: [state.strokes, ...state.undoStack],
    })),

  canUndo: () => get().strokes.length > 0,
  canRedo: () => get().undoStack.length > 0,
}))
