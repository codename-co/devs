import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

import { Providers } from '@/app/Providers'
import '@/styles/globals.css'

const root = globalThis.document.getElementById('root')

ReactDOM.createRoot(root?.parentElement!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Providers>Hey</Providers>
    </BrowserRouter>
  </React.StrictMode>,
)
