import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import OfflineBar from './components/OfflineBar.jsx'

createRoot(document.getElementById('root')).render(
  <>
    <App />
    <OfflineBar />
  </>
)
