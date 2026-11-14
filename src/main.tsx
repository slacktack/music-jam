import { createRoot } from 'react-dom/client';
import '@fontsource-variable/jetbrains-mono';
import './styles.css';
import { App } from './App';
import { startFloor } from './lib/floor';

createRoot(document.getElementById('root')!).render(<App />);
startFloor();

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}
