import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from './router.jsx';
import { ContentProvider } from './content/ContentProvider.jsx';
import { I18nProvider } from './i18n/index.jsx';
import App from './App.jsx';
import { captureSource } from './lib/source.js';
import './styles/base.css';
import './styles/layout.css';
import './styles/home.css';
import './styles/pages.css';
import './styles/rtl.css';

// Optional licensed Arabic heading font (29LT Bukra) — see public/fonts/README.txt.
if (import.meta.env.VITE_ARABIC_HEADING_FONT === 'bukra') import('./styles/fonts-bukra.css');

captureSource();

// Native scroll restoration fights our page transitions
if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual';

// The header slides in on the very first load only (not on every page change).
document.documentElement.classList.add('first-load');
setTimeout(() => document.documentElement.classList.remove('first-load'), 1600);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterProvider>
      <I18nProvider>
        <ContentProvider>
          <App />
        </ContentProvider>
      </I18nProvider>
    </RouterProvider>
  </StrictMode>
);
