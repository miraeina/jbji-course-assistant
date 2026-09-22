import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import Home from '../app/page';
import '../app/globals.css';
import '../app/visual-theme.css';
import '../app/design-refinements.css';
import '../app/readability.css';
import '../app/spatial-design.css';
import '../app/mobile-selection.css';
import { initializeTheme, ThemeProvider } from '../app/theme';

initializeTheme();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider><Home /></ThemeProvider>
  </StrictMode>,
);
