import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

import Router from '@/app/Router'
import { Providers } from '@/app/Providers'
import '@/styles/globals.css'
import 'katex/dist/katex.min.css'

const container = globalThis.document.getElementById('root')

if (container) {
  const app = (
    <React.StrictMode>
      <BrowserRouter>
        <Providers>
          <Router />
        </Providers>
      </BrowserRouter>
    </React.StrictMode>
  )

  // Check if the page has been prerendered (has content inside #root)
  if (container.hasChildNodes()) {
    // Hydrate the prerendered HTML
    ReactDOM.hydrateRoot(container, app)
  } else {
    // Fresh render for non-prerendered pages
    ReactDOM.createRoot(container).render(app)
  }
}
