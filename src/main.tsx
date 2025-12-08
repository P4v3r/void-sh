import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App';
import DownloadPage from './DownloadPage';
import './index.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Home: pagina per cifrare e caricare il file */}
        <Route path="/" element={<App />} />

        {/* Pagina per scaricare/decifrare il file da un link condiviso */}
        <Route path="/d/:objectPath" element={<DownloadPage />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);