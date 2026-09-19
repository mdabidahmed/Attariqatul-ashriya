import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import App from './App'
import ErrorBoundary from './components/ErrorBoundary'
import './styles/tokens.css'
import './styles/base.css'
// The shared design language first, then the per-screen rules that build on
// it. A screen may override a shared rule; it may never replace one.
import './styles/ui.css'
import './styles/components.css'
import './styles/shell.css'

const container = document.getElementById('root')
if (!container) throw new Error('Missing #root element in index.html')

createRoot(container).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
