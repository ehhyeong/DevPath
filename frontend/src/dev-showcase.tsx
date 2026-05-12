import DevShowcaseApp from './DevShowcaseApp'
import { renderPage } from './render-page'

renderPage(<DevShowcaseApp />, { missingRootMessage: 'dev-showcase root element was not found' })
