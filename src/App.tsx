import { useEffect } from 'react'
import { useAppStore } from './store/useAppStore'
import { AppShell } from './components/layout/AppShell'
import { DeckList } from './components/deck/DeckList'
import { DeckBrowse } from './components/deck/DeckBrowse'
import { CardEditor } from './components/card/CardEditor'
import { ReviewSession } from './components/review/ReviewSession'
import { SettingsPage } from './components/settings/SettingsPage'
import { DeckSettingsPage } from './components/settings/DeckSettingsPage'
import { DeckStats } from './components/stats/DeckStats'
import { InstallPrompt } from './components/pwa/InstallPrompt'

function App() {
  const { currentView, theme } = useAppStore()

  // Appliquer le thème au montage
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  const renderView = () => {
    switch (currentView) {
      case 'home':
        return <DeckList />
      case 'browse':
        return <DeckBrowse />
      case 'editor':
        return <CardEditor />
      case 'review':
        return <ReviewSession />
      case 'settings':
        return <SettingsPage />
      case 'deck-settings':
        return <DeckSettingsPage />
      case 'stats':
        return <DeckStats />
      default:
        return <DeckList />
    }
  }

  return (
    <AppShell>
      {renderView()}
      <InstallPrompt />
    </AppShell>
  )
}

export default App
