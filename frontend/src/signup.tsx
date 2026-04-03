import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import SignupApp from './SignupApp'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SignupApp />
  </StrictMode>,
)
