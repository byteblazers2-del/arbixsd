import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AppRoot } from '@telegram-apps/telegram-ui';
import '@telegram-apps/telegram-ui/dist/styles.css';
import './i18n/index.ts';
import './utils/haptics.ts';
import App from './App.tsx';
import './index.css';
import './testDarkMode.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AppRoot appearance="dark" platform="base">
        <App />
      </AppRoot>
    </BrowserRouter>
  </StrictMode>,
);
