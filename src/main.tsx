import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/global.css'
import './styles/animations.css'
import App from './App.tsx'
import { startAutoBackup } from './lib/autoBackup'
import { loadAccentColor } from './lib/theme'

// Demander au navigateur de ne jamais effacer les données automatiquement
if (navigator.storage?.persist) {
  navigator.storage.persist()
}

// Charger la couleur d'accent personnalisée
loadAccentColor()

// Démarrer le backup automatique
startAutoBackup()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
