import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { PrivacyPage } from '@/features/privacy/PrivacyPage'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PrivacyPage />
  </StrictMode>,
)
