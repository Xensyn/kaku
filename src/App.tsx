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
import { SearchView } from './components/search/SearchView'
import { AnkiImport } from './components/import/AnkiImport'
import { startNotificationScheduler, isNotificationEnabled } from './lib/notifications'

function App() {
  const { currentView, theme } = useAppStore()

  // Appliquer le thème au montage
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  // Démarrer le planificateur de notifications si activé
  useEffect(() => {
    if (isNotificationEnabled()) {
      startNotificationScheduler()
    }
  }, [])

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
      case 'search':
        return <SearchView />
      case 'import':
        return <AnkiImport />
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
