import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

import Router from '@/app/Router'
import { Providers } from '@/app/Providers'
import '@/styles/globals.css'
import 'katex/dist/katex.min.css'

const root = globalThis.document.getElementById('root')

ReactDOM.createRoot(root?.parentElement!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Providers>
        <Router />
      </Providers>
    </BrowserRouter>
  </React.StrictMode>,
)
