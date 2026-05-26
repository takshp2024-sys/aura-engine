import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

// This entry point initializes the React application and mounts it to the DOM.
// We've removed the explicit CSS import to prevent resolution errors if the 
// file is empty, as Tailwind is handled via CDN in the index.html.

const rootElement = document.getElementById('root');

if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
}