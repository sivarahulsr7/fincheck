import { createRoot } from 'react-dom/client'
import './index.css'
import App, { LayoutDebug } from './App.jsx'

createRoot(document.getElementById('root')).render(
  <>
    <App />
    <LayoutDebug />
  </>
)
