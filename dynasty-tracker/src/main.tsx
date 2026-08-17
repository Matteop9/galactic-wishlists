import React from 'react'
import ReactDOM from 'react-dom/client'
import '@fontsource/barlow-condensed/500.css'
import '@fontsource/barlow-condensed/700.css'
import './styles/theme.css'
import './styles/app.css'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
