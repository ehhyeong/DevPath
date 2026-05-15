import App from './App.tsx'
import JobMatchingApp from './JobMatchingApp'
import { renderPage } from './render-page'

const pathname = window.location.pathname.replace(/\/+$/, '')

renderPage(pathname === '/job-matching' ? <JobMatchingApp /> : <App />, {
  missingRootMessage: 'home root element was not found',
})
