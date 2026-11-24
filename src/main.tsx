import { createRoot } from 'react-dom/client';
import '@fontsource-variable/jetbrains-mono';
import './styles.css';
import './styles/skins.css';
import { App } from './App';
import { startFloor } from './lib/floor';
import { applySkin, useSkin } from './lib/skins';

// The skin writes its tokens on <html> before the first paint, after theme.ts has
// had its say, so a saved skin never flashes the default look.
applySkin(useSkin.getState().skin);

createRoot(document.getElementById('root')!).render(<App />);
startFloor();

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}
