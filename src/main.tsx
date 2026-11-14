import { createRoot } from 'react-dom/client';
import '@fontsource-variable/geist';
import '@fontsource/doto/700.css';
import '@fontsource/doto/900.css';
import './styles.css';
import { App } from './App';
import { startFloor } from './lib/floor';

startFloor();
createRoot(document.getElementById('root')!).render(<App />);
