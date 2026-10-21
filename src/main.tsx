import '@fontsource/pixelify-sans'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import './i18n'
import './styles.css'
import { App } from './app/App'
import { listenToOtherTabs } from './store/gameStore'

listenToOtherTabs()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
)
