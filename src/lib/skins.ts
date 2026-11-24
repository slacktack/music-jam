// Skins: the folio-website themes ported with their exact palettes, type and easing.
// Each ships its native mode plus an `alt` palette so the sun/moon toggle works anywhere.
import { create } from 'zustand';
import { useTheme } from './theme';

export type SkinId = 'jam' | 'crimson' | 'aurora' | 'orbit' | 'abyss' | 'signal' | 'ember' | 'grid' | 'solar' | 'retro';
export type Mode = 'light' | 'dark';

export interface Skin {
  id: SkinId;
  label: string;
  story: string;
  mode: Mode;
  swatch: [string, string];
  // Skins pin --accent to their own --k1/--k2 so "follow the music" stays JAM's.
  accent?: boolean;
  /** Google Fonts stylesheet, loaded only when this skin is picked. */
  fonts?: string;
  /** True only when the skin draws its own pointer; otherwise the real cursor stays. */
  cursor?: boolean;
  vars: Record<string, string>;
  alt: Record<string, string>;
}

const G = 'https://fonts.googleapis.com/css2?';

export const SKINS: Skin[] = [
  {
    id: 'jam',
    label: 'JAM',
    story: 'The stock look. Near-black glass, dot matrix, colours that follow whatever is playing.',
    mode: 'dark',
    swatch: ['#ff8a00', '#ff2d95'],
    vars: {},
    alt: {},
  },
  {
    id: 'crimson',
    label: 'Crimson',
    story: 'A wordmark you can grab and throw. Bone stock, black ink, one loud red.',
    mode: 'light',
    swatch: ['#e10600', '#0e0b0b'],
    accent: true,
    fonts: `${G}family=Archivo:wdth,wght@62..125,100..900&family=Archivo+Black&family=Space+Mono:wght@400;700&display=swap`,
    vars: {
      '--dk': '#0e0b0b',
      '--bg': '#f4efe8', '--s1': '#fbf8f3', '--s2': '#ebe3d7', '--s3': '#e0d5c5',
      '--text': '#0e0b0b', '--mute': 'rgba(14,11,11,0.66)', '--faint': 'rgba(14,11,11,0.42)',
      '--line': 'rgba(14,11,11,0.14)', '--line2': 'rgba(14,11,11,0.3)',
      '--phosphor': '#1f7a3d', '--red': '#e10600', '--k1': '#e10600', '--k2': '#ff4a1c', '--on-k1': '#f4efe8',
      '--sans': "'Archivo', system-ui, sans-serif", '--display': "'Archivo Black', 'Archivo', sans-serif", '--dot': "'Space Mono', ui-monospace, monospace",
      '--ease': 'cubic-bezier(0.2, 0.7, 0.2, 1)', '--spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      '--r1': '0px', '--r2': '0px', '--r3': '999px', '--r4': '0px',
      '--edge': '#0e0b0b', '--paper': '#f4efe8', '--card': '#fbf8f3',
      '--hair': '2px solid #0e0b0b', '--lift': '6px 6px 0 #0e0b0b', '--ink': '#0e0b0b',
      '--label': 'uppercase', '--track': '0.08em',
    },
    alt: {
      '--bg': '#0e0b0b', '--s1': '#181313', '--s2': '#221b1b', '--s3': '#2e2424',
      '--text': '#f4efe8', '--mute': 'rgba(244,239,232,0.68)', '--faint': 'rgba(244,239,232,0.42)',
      '--line': 'rgba(244,239,232,0.14)', '--line2': 'rgba(244,239,232,0.3)',
      '--phosphor': '#5fd68a', '--red': '#ff2a17', '--k1': '#e10600', '--k2': '#ff4a1c', '--on-k1': '#f4efe8',
      '--edge': '#f4efe8', '--paper': '#0e0b0b', '--card': '#181313',
      '--hair': '2px solid #f4efe8', '--lift': '6px 6px 0 #e10600', '--ink': '#f4efe8',
    },
  },
  {
    id: 'aurora',
    label: 'Aurora',
    story: 'An editorial gallery. Violet to acid lime on ink, Roboto Serif with a pulse.',
    mode: 'dark',
    swatch: ['#5b3df5', '#c8f53b'],
    accent: true,
    fonts: `${G}family=Roboto+Serif:ital,wght@0,200..600;1,200..600&family=Inter:wght@300..700&family=Geist+Mono:wght@400..600&display=swap`,
    cursor: true,
    vars: {
      '--dk': '#0d0d12',
      '--bg': '#0d0d12', '--s1': '#17171f', '--s2': '#1f1f29', '--s3': '#282833',
      '--text': '#ffffff', '--mute': 'rgba(255,255,255,0.62)', '--faint': 'rgba(255,255,255,0.4)',
      '--line': 'rgba(255,255,255,0.16)', '--line2': 'rgba(255,255,255,0.3)',
      '--phosphor': '#c8f53b', '--red': '#ff5a4d', '--k1': '#5b3df5', '--k2': '#c8f53b', '--on-k1': '#ffffff',
      '--sans': "'Inter', system-ui, sans-serif", '--display': "'Roboto Serif', Georgia, serif", '--dot': "'Geist Mono', ui-monospace, monospace",
      '--ease': 'cubic-bezier(0.22, 1, 0.36, 1)', '--spring': 'cubic-bezier(0.77, 0, 0.175, 1)',
      '--r1': '6px', '--r2': '4px', '--r3': '999px', '--r4': '6px',
      '--edge': '#ffffff', '--paper': '#0d0d12', '--card': '#17171f',
      '--hair': '1px solid rgba(255,255,255,0.16)', '--lift': '0 30px 60px -30px rgba(0,0,0,0.6)', '--ink': '#ffffff',
      '--label': 'uppercase', '--track': '0.14em',
    },
    alt: {
      '--bg': '#fbfbf8', '--s1': '#ffffff', '--s2': '#f1f1ec', '--s3': '#e6e6e0',
      '--text': '#0d0d12', '--mute': '#6c6c78', '--faint': 'rgba(13,13,18,0.42)',
      '--line': 'rgba(13,13,18,0.14)', '--line2': 'rgba(13,13,18,0.28)',
      '--phosphor': '#3f7d0f', '--red': '#d93a2b', '--k1': '#5b3df5', '--k2': '#c8f53b', '--on-k1': '#ffffff',
      '--edge': '#0d0d12', '--paper': '#fbfbf8', '--card': '#ffffff',
      '--hair': '1px solid rgba(13,13,18,0.14)', '--lift': '0 2px 0 rgba(0,0,0,0.05), 0 40px 60px -40px rgba(91,61,245,0.45)', '--ink': '#0d0d12',
    },
  },
  {
    id: 'ember',
    label: 'Ember',
    story: 'A design studio board. Grain, frosted glass and a red that runs warm.',
    mode: 'light',
    swatch: ['#e8382b', '#2747e8'],
    accent: true,
    fonts: `${G}family=Inter+Tight:wght@400..700&family=DM+Serif+Display:ital@0;1&family=Geist+Mono:wght@400..600&display=swap`,
    cursor: true,
    vars: {
      '--dk': '#1a0f0c',
      '--bg': '#f7ede6', '--s1': '#fffaf6', '--s2': '#f1e0d5', '--s3': '#e9d1c2',
      '--text': '#1a0f0c', '--mute': '#7a5f56', '--faint': 'rgba(26,15,12,0.42)',
      '--line': 'rgba(26,15,12,0.12)', '--line2': 'rgba(26,15,12,0.24)',
      '--phosphor': '#2b7a4f', '--red': '#e8382b', '--k1': '#e8382b', '--k2': '#2747e8', '--on-k1': '#ffffff',
      '--sans': "'Inter Tight', system-ui, sans-serif", '--display': "'Inter Tight', system-ui, sans-serif", '--dot': "'Geist Mono', ui-monospace, monospace",
      '--serif': "'DM Serif Display', Georgia, serif",
      '--ease': 'cubic-bezier(0.22, 1, 0.36, 1)', '--spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      '--r1': '10px', '--r2': '6px', '--r3': '999px', '--r4': '14px',
      '--edge': '#1a0f0c', '--paper': '#f7ede6', '--card': 'linear-gradient(180deg, rgba(255,251,248,0.78), rgba(255,243,236,0.5))',
      '--hair': '1px solid rgba(26,15,12,0.12)', '--lift': 'inset 0 1px 0 rgba(255,255,255,0.6), 0 18px 40px -26px rgba(200,30,30,0.45)', '--ink': '#1a0f0c',
      '--label': 'uppercase', '--track': '0.06em',
    },
    alt: {
      '--bg': '#1a0f0c', '--s1': '#25160f', '--s2': '#301d15', '--s3': '#3c251b',
      '--text': '#f7ede6', '--mute': '#c4a497', '--faint': 'rgba(247,237,230,0.42)',
      '--line': 'rgba(247,237,230,0.12)', '--line2': 'rgba(247,237,230,0.24)',
      '--phosphor': '#5fd68a', '--red': '#ff6b57', '--k1': '#ff6b57', '--k2': '#7a8cff', '--on-k1': '#1a0f0c',
      '--edge': '#f7ede6', '--paper': '#1a0f0c', '--card': 'linear-gradient(180deg, rgba(60,37,27,0.72), rgba(37,22,15,0.5))',
      '--hair': '1px solid rgba(247,237,230,0.12)', '--lift': 'inset 0 1px 0 rgba(255,255,255,0.06), 0 18px 40px -26px rgba(0,0,0,0.8)', '--ink': '#f7ede6',
    },
  },
  {
    id: 'signal',
    label: 'Signal',
    story: 'An ops console. Static grey, phosphor green, Doto pixels and live readouts.',
    mode: 'light',
    swatch: ['#2bd94a', '#111111'],
    accent: true,
    fonts: `${G}family=Geist+Mono:wght@400..700&family=Doto:wght@400..900&display=swap`,
    cursor: true,
    vars: {
      '--dk': '#111111',
      '--bg': '#e9e5e1', '--s1': '#efebe7', '--s2': '#e1dcd7', '--s3': '#d6d0ca',
      '--text': '#111111', '--mute': '#6b6661', '--faint': 'rgba(17,17,17,0.42)',
      '--line': 'rgba(17,17,17,0.16)', '--line2': 'rgba(17,17,17,0.32)',
      '--phosphor': '#0b7a60', '--red': '#e2462b', '--k1': '#2bd94a', '--k2': '#26b69a', '--on-k1': '#111111',
      '--sans': "'Geist Mono', ui-monospace, monospace", '--display': "'Geist Mono', ui-monospace, monospace", '--dot': "'Geist Mono', ui-monospace, monospace",
      '--num': "'Doto', 'Geist Mono', monospace",
      '--ease': 'cubic-bezier(0.22, 1, 0.36, 1)', '--spring': 'cubic-bezier(0.22, 1, 0.36, 1)',
      '--r1': '0px', '--r2': '0px', '--r3': '0px', '--r4': '0px',
      '--edge': '#111111', '--paper': '#e9e5e1', '--card': '#efebe7',
      '--hair': '1px solid #111111', '--lift': 'none', '--ink': '#111111',
      '--label': 'uppercase', '--track': '0.08em',
    },
    alt: {
      '--bg': '#111111', '--s1': '#181818', '--s2': '#202020', '--s3': '#2a2a2a',
      '--text': '#e9e5e1', '--mute': '#9a948e', '--faint': 'rgba(233,229,225,0.42)',
      '--line': 'rgba(233,229,225,0.16)', '--line2': 'rgba(233,229,225,0.32)',
      '--phosphor': '#2bd94a', '--red': '#ff6a4d', '--k1': '#2bd94a', '--k2': '#26b69a', '--on-k1': '#111111',
      '--edge': '#e9e5e1', '--paper': '#111111', '--card': '#181818',
      '--hair': '1px solid rgba(233,229,225,0.5)', '--ink': '#e9e5e1',
    },
  },
  {
    id: 'abyss',
    label: 'Abyss',
    story: 'A trailer, not a page. Black water, cyan light, wide tracked type.',
    mode: 'dark',
    swatch: ['#6fe3e9', '#ff6a2b'],
    accent: true,
    fonts: `${G}family=Montserrat:wght@200..700&family=Geist+Mono:wght@400..600&display=swap`,
    cursor: true,
    vars: {
      '--dk': '#05090c',
      '--bg': '#0a1117', '--s1': '#0f1a22', '--s2': '#13232d', '--s3': '#16343d',
      '--text': '#e8f1f4', '--mute': '#84979f', '--faint': 'rgba(232,241,244,0.38)',
      '--line': 'rgba(111,227,233,0.14)', '--line2': 'rgba(111,227,233,0.32)',
      '--phosphor': '#6fe3e9', '--red': '#ff6a2b', '--k1': '#6fe3e9', '--k2': '#ff6a2b', '--on-k1': '#0a1117',
      '--sans': "'Montserrat', system-ui, sans-serif", '--display': "'Montserrat', system-ui, sans-serif", '--dot': "'Geist Mono', ui-monospace, monospace",
      '--ease': 'cubic-bezier(0.22, 1, 0.36, 1)', '--spring': 'cubic-bezier(0.65, 0, 0.35, 1)',
      '--r1': '4px', '--r2': '2px', '--r3': '999px', '--r4': '16px',
      '--edge': '#e8f1f4', '--paper': '#0a1117', '--card': 'rgba(15,26,34,0.82)',
      '--hair': '1px solid rgba(111,227,233,0.14)', '--lift': '0 30px 60px -40px rgba(111,227,233,0.25)', '--ink': '#e8f1f4',
      '--label': 'uppercase', '--track': '0.24em',
    },
    alt: {
      '--bg': '#eaf4f5', '--s1': '#f7fbfc', '--s2': '#dcecee', '--s3': '#c9e1e4',
      '--text': '#0a1117', '--mute': '#4b6169', '--faint': 'rgba(10,17,23,0.42)',
      '--line': 'rgba(10,17,23,0.12)', '--line2': 'rgba(10,17,23,0.26)',
      '--phosphor': '#0b7f86', '--red': '#d9520f', '--k1': '#0b7f86', '--k2': '#ff6a2b', '--on-k1': '#ffffff',
      '--edge': '#0a1117', '--paper': '#eaf4f5', '--card': 'rgba(247,251,252,0.86)',
      '--hair': '1px solid rgba(10,17,23,0.12)', '--lift': '0 30px 60px -40px rgba(11,127,134,0.4)', '--ink': '#0a1117',
    },
  },
  {
    id: 'grid',
    label: 'Grid',
    story: 'A Swiss journal. Black stock, small type, one blue object.',
    mode: 'dark',
    swatch: ['#1f3bff', '#050505'],
    accent: true,
    fonts: `${G}family=Hanken+Grotesk:wght@400..800&display=swap`,
    cursor: true,
    vars: {
      '--dk': '#050505',
      '--bg': '#050505', '--s1': '#0d0d0d', '--s2': '#151515', '--s3': '#1e1e1e',
      '--text': '#ededed', '--mute': '#9a9a9a', '--faint': '#6e6e6e',
      '--line': 'rgba(237,237,237,0.1)', '--line2': 'rgba(237,237,237,0.22)',
      '--phosphor': '#4d66ff', '--red': '#4d66ff', '--k1': '#1f3bff', '--k2': '#4d66ff', '--on-k1': '#ffffff',
      '--sans': "'Hanken Grotesk', 'Helvetica Neue', Arial, sans-serif", '--display': "'Hanken Grotesk', 'Helvetica Neue', Arial, sans-serif", '--dot': "'Hanken Grotesk', 'Helvetica Neue', Arial, sans-serif",
      '--ease': 'cubic-bezier(0.2, 0.7, 0, 1)', '--spring': 'cubic-bezier(0.77, 0, 0.175, 1)',
      '--r1': '0px', '--r2': '0px', '--r3': '0px', '--r4': '0px',
      '--edge': '#ededed', '--paper': '#050505', '--card': '#0d0d0d',
      '--hair': '1px solid rgba(237,237,237,0.1)', '--lift': 'none', '--ink': '#ededed',
      '--label': 'uppercase', '--track': '0.04em',
    },
    alt: {
      '--bg': '#ededed', '--s1': '#f6f6f6', '--s2': '#e2e2e2', '--s3': '#d6d6d6',
      '--text': '#050505', '--mute': '#6e6e6e', '--faint': '#9a9a9a',
      '--line': 'rgba(5,5,5,0.14)', '--line2': 'rgba(5,5,5,0.3)',
      '--phosphor': '#1f3bff', '--red': '#1f3bff', '--k1': '#1f3bff', '--k2': '#1229c9', '--on-k1': '#ffffff',
      '--edge': '#050505', '--paper': '#ededed', '--card': '#f6f6f6',
      '--hair': '1px solid rgba(5,5,5,0.14)', '--ink': '#050505',
    },
  },
  {
    id: 'solar',
    label: 'Solar',
    story: 'A clock you play. Solar yellow, Unbounded type, ink rings and a warm glow.',
    mode: 'light',
    swatch: ['#ffd400', '#141210'],
    accent: true,
    fonts: `${G}family=Unbounded:wght@400..800&family=DM+Mono:wght@400;500&display=swap`,
    cursor: true,
    vars: {
      '--dk': '#141210',
      '--bg': '#ffd400', '--s1': '#fff6d6', '--s2': '#fff3a0', '--s3': '#ffe36a',
      '--text': '#141210', '--mute': 'rgba(20,18,16,0.7)', '--faint': 'rgba(20,18,16,0.46)',
      '--line': 'rgba(20,18,16,0.2)', '--line2': 'rgba(20,18,16,0.4)',
      '--phosphor': '#2f6b2f', '--red': '#e2500b', '--k1': '#141210', '--k2': '#ff9f00', '--on-k1': '#ffd400',
      '--sans': "'DM Mono', ui-monospace, monospace", '--display': "'Unbounded', system-ui, sans-serif", '--dot': "'DM Mono', ui-monospace, monospace",
      '--ease': 'cubic-bezier(0.32, 0.72, 0.16, 1)', '--spring': 'cubic-bezier(0.34, 1.5, 0.5, 1)',
      '--r1': '28px', '--r2': '20px', '--r3': '99px', '--r4': '28px',
      '--edge': '#141210', '--paper': '#ffd400', '--card': '#fff6d6',
      '--hair': '0 solid transparent', '--lift': '0 0 0 3px #141210, 0 20px 40px -20px rgba(100,40,0,0.7)', '--ink': '#141210',
      '--label': 'uppercase', '--track': '0.12em',
    },
    alt: {
      '--bg': '#1d1a16', '--s1': '#27231d', '--s2': '#322c22', '--s3': '#3e3628',
      '--text': '#fff6d6', '--mute': 'rgba(255,246,214,0.7)', '--faint': 'rgba(255,246,214,0.44)',
      '--line': 'rgba(255,212,0,0.22)', '--line2': 'rgba(255,212,0,0.42)',
      '--phosphor': '#8ef0b6', '--red': '#ff8a00', '--k1': '#ffd400', '--k2': '#ff9f00', '--on-k1': '#141210',
      '--edge': '#ffd400', '--paper': '#1d1a16', '--card': '#27231d',
      '--lift': '0 0 0 3px #ffd400, 0 20px 40px -20px rgba(255,160,0,0.35)', '--ink': '#fff6d6',
    },
  },
  {
    id: 'orbit',
    label: 'Orbit',
    story: 'A game on a tiny planet. Sky, sunset orange, Chakra Petch HUD plates.',
    mode: 'light',
    swatch: ['#38bdf8', '#fb923c'],
    accent: true,
    fonts: `${G}family=Chakra+Petch:wght@500;600;700&family=Rubik:wght@400..700&display=swap`,
    cursor: true,
    vars: {
      '--dk': '#0c1b2a',
      '--bg': '#7dd3fc', '--s1': '#ffffff', '--s2': '#eef8ff', '--s3': '#dcefff',
      '--text': '#0c1b2a', '--mute': '#3d5468', '--faint': 'rgba(12,27,42,0.46)',
      '--line': 'rgba(12,27,42,0.12)', '--line2': 'rgba(12,27,42,0.24)',
      '--phosphor': '#15803d', '--red': '#ef4444', '--k1': '#fb923c', '--k2': '#38bdf8', '--on-k1': '#0c1b2a',
      '--sans': "'Rubik', system-ui, sans-serif", '--display': "'Chakra Petch', system-ui, sans-serif", '--dot': "'Chakra Petch', system-ui, sans-serif",
      '--ease': 'cubic-bezier(0.22, 1, 0.36, 1)', '--spring': 'cubic-bezier(0.34, 1.3, 0.5, 1)',
      '--r1': '18px', '--r2': '14px', '--r3': '12px', '--r4': '18px',
      '--edge': '#141a33', '--paper': '#7dd3fc', '--card': 'rgba(255,255,255,0.95)',
      '--hair': '2px solid #141a33', '--lift': '0 4px 0 #141a33', '--ink': '#0c1b2a',
      '--label': 'uppercase', '--track': '0.14em',
    },
    alt: {
      '--bg': '#0b1530', '--s1': '#13204a', '--s2': '#1a2a5c', '--s3': '#22346e',
      '--text': '#e8f3ff', '--mute': '#a8bfd8', '--faint': 'rgba(232,243,255,0.44)',
      '--line': 'rgba(232,243,255,0.14)', '--line2': 'rgba(232,243,255,0.28)',
      '--phosphor': '#4ade80', '--red': '#f87171', '--k1': '#fb923c', '--k2': '#38bdf8', '--on-k1': '#0c1b2a',
      '--edge': '#050a1a', '--paper': '#0b1530', '--card': 'rgba(19,32,74,0.95)',
      '--hair': '2px solid #050a1a', '--lift': '0 4px 0 #050a1a', '--ink': '#e8f3ff',
    },
  },
  {
    id: 'retro',
    label: 'Retro',
    story: 'A live ops dashboard. Cream stock, indigo ink, boxed rules and dot-matrix numbers.',
    mode: 'light',
    swatch: ['#4b3ce0', '#dd8517'],
    accent: true,
    fonts: `${G}family=Doto:wght@400..900&display=swap`,
    vars: {
      '--dk': 'oklch(0.24 0.11 272)',
      '--bg': 'oklch(0.9721 0.0158 110.5501)', '--s1': 'oklch(0.9721 0.0158 110.5501)', '--s2': 'oklch(0.9168 0.0214 109.7161)', '--s3': 'oklch(0.88 0.03 109.7)',
      '--text': 'oklch(0.5066 0.2501 271.8903)', '--mute': 'oklch(0.5066 0.2501 271.89 / 0.62)', '--faint': 'oklch(0.5066 0.2501 271.89 / 0.42)',
      '--line': 'oklch(0.5066 0.2501 271.89 / 0.18)', '--line2': 'oklch(0.5066 0.2501 271.8903)',
      '--phosphor': 'oklch(0.627 0.194 149.214)', '--red': 'oklch(0.63 0.19 23.03)', '--k1': 'oklch(0.5066 0.2501 271.8903)', '--k2': 'oklch(0.705 0.213 47.604)', '--on-k1': 'oklch(0.9721 0.0158 110.5501)',
      '--sans': "'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace", '--display': "'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace", '--dot': "'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace",
      '--num': "'Doto', 'JetBrains Mono Variable', monospace",
      '--ease': 'cubic-bezier(0.2, 0.9, 0.25, 1)', '--spring': 'cubic-bezier(0.2, 0.9, 0.25, 1)',
      '--r1': '0px', '--r2': '0px', '--r3': '0px', '--r4': '0px',
      '--edge': 'oklch(0.5066 0.2501 271.8903)', '--paper': 'oklch(0.9721 0.0158 110.5501)', '--card': 'oklch(0.9721 0.0158 110.5501)',
      '--hair': '1.5px solid oklch(0.5066 0.2501 271.8903)', '--lift': '4px 4px 0 hsl(238.3 85.6% 59.2% / 0.15), 4px 1px 2px -1px hsl(238.3 85.6% 59.2% / 0.15)', '--ink': 'oklch(0.5066 0.2501 271.8903)',
      '--label': 'uppercase', '--track': '0.08em',
    },
    alt: {
      '--bg': 'oklch(0.19 0.05 272)', '--s1': 'oklch(0.23 0.06 272)', '--s2': 'oklch(0.27 0.07 272)', '--s3': 'oklch(0.31 0.08 272)',
      '--text': 'oklch(0.86 0.09 272)', '--mute': 'oklch(0.86 0.09 272 / 0.66)', '--faint': 'oklch(0.86 0.09 272 / 0.42)',
      '--line': 'oklch(0.75 0.15 272 / 0.22)', '--line2': 'oklch(0.75 0.15 272)',
      '--phosphor': 'oklch(0.78 0.18 149)', '--red': 'oklch(0.7 0.19 23)', '--k1': 'oklch(0.75 0.15 272)', '--k2': 'oklch(0.76 0.17 55)', '--on-k1': 'oklch(0.19 0.05 272)',
      '--edge': 'oklch(0.75 0.15 272)', '--paper': 'oklch(0.19 0.05 272)', '--card': 'oklch(0.23 0.06 272)',
      '--hair': '1.5px solid oklch(0.75 0.15 272)', '--lift': '4px 4px 0 oklch(0.75 0.15 272 / 0.25)', '--ink': 'oklch(0.86 0.09 272)',
    },
  },
];

export const skinById = (id: string): Skin => SKINS.find((s) => s.id === id) ?? SKINS[0];

// `vars` is the skin's native palette; `alt` overrides it for the other mode.
export function tokensFor(skin: Skin, mode: Mode): Record<string, string> {
  if (skin.id === 'jam') return {};
  return skin.mode === mode ? skin.vars : { ...skin.vars, ...skin.alt };
}

const TOKEN_KEYS = [
  '--bg', '--s1', '--s2', '--s3', '--text', '--mute', '--faint', '--line', '--line2', '--phosphor', '--red',
  '--sans', '--display', '--dot', '--ease',
  '--r1', '--r2', '--r3', '--r4', '--hair', '--card', '--lift', '--label', '--track', '--frame', '--ink', '--grain',
  '--edge', '--paper', '--k1', '--k2', '--on-k1', '--serif', '--num', '--spring', '--dk',
  '--np-bg', '--np-fg', '--np-mute', '--np-faint', '--np-line', '--np-line2', '--np-art', '--np-blur', '--np-flow', '--np-shade',
];

const KEY = 'jam.skin';
const MODE_KEY = 'jam.skinMode';

const read = (): SkinId => {
  try {
    const v = localStorage.getItem(KEY);
    return v && SKINS.some((s) => s.id === v) ? (v as SkinId) : 'jam';
  } catch {
    return 'jam';
  }
};

const readMode = (skin: Skin): Mode => {
  try {
    const v = localStorage.getItem(MODE_KEY);
    if (v === 'light' || v === 'dark') return v;
  } catch {}
  return skin.mode;
};

const links = new Map<string, HTMLLinkElement>();

function loadFonts(skin: Skin) {
  if (!skin.fonts || links.has(skin.id)) return;
  const el = document.createElement('link');
  el.rel = 'stylesheet';
  el.href = skin.fonts;
  document.head.appendChild(el);
  links.set(skin.id, el);
}

/** Write the skin's tokens on <html>. Jam clears them and inherits styles.css. */
export function applySkin(id: SkinId, mode?: Mode) {
  const skin = skinById(id);
  // On the stock skin the mode is whatever theme.ts stored; a skin uses its own.
  const m = mode ?? (id === 'jam' ? (useTheme.getState().theme as Mode) : readMode(skin));
  const root = document.documentElement;
  for (const k of TOKEN_KEYS) root.style.removeProperty(k);
  for (const [k, v] of Object.entries(tokensFor(skin, m))) root.style.setProperty(k, v);
  root.dataset.skin = skin.id;
  root.dataset.theme = m;
  root.dataset.cursor = skin.cursor ? 'on' : 'off';
  root.style.colorScheme = m;
  const bg = tokensFor(skin, m)['--bg'] ?? (m === 'light' ? '#EEF0F4' : '#050507');
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bg);
  loadFonts(skin);
  try {
    localStorage.setItem(KEY, skin.id);
    localStorage.setItem(MODE_KEY, m);
  } catch {}
  return { skin, mode: m };
}

interface SkinState { skin: SkinId; mode: Mode; set: (id: SkinId) => void; toggle: () => void; cycle: () => void }

/** A wipe in the new skin's own colours, with the theme's name on it. */
function veil(skin: Skin, mode: Mode, mid: () => void) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return mid();
  const t = tokensFor(skin, mode);
  const el = document.createElement('div');
  el.className = 'skin-veil';
  el.style.background = t['--bg'] ?? (mode === 'light' ? '#f1f2f5' : '#050507');
  el.style.color = t['--text'] ?? (mode === 'light' ? '#0b0b10' : '#f6f6f8');
  el.innerHTML = '<span>Skin</span><b></b><i></i>';
  el.querySelector('b')!.textContent = skin.label;
  el.querySelector('i')!.innerHTML = skin.swatch.map((c) => `<em style="background:${c}"></em>`).join('');
  document.body.appendChild(el);
  const ease = 'cubic-bezier(0.77, 0, 0.175, 1)';
  el.animate({ clipPath: ['inset(100% 0 0 0)', 'inset(0 0 0 0)'] }, { duration: 420, easing: ease, fill: 'forwards' })
    .finished.then(() => {
      mid();
      return new Promise((r) => setTimeout(r, 420));
    })
    .then(() => el.animate({ clipPath: ['inset(0 0 0 0)', 'inset(0 0 100% 0)'] }, { duration: 460, easing: ease, fill: 'forwards' }).finished)
    .finally(() => el.remove());
}

export const useSkin = create<SkinState>((set, get) => ({
  skin: read(),
  mode: readMode(skinById(read())),
  set(id) {
    const skin = skinById(id);
    const mode = get().skin === id ? get().mode : readMode(skin);
    if (get().skin === id) { applySkin(id, mode); set({ mode }); return; }
    let done = false;
    const mid = () => { if (done) return; done = true; applySkin(id, mode); set({ skin: id, mode }); };
    veil(skin, mode, mid);
    setTimeout(mid, 900); // the wipe is decoration; the skin always lands
  },
  toggle() {
    const mode: Mode = get().mode === 'dark' ? 'light' : 'dark';
    applySkin(get().skin, mode);
    set({ mode });
  },
  cycle() {
    const i = SKINS.findIndex((s) => s.id === get().skin);
    get().set(SKINS[(i + 1) % SKINS.length].id);
  },
}));

/**
 * One place that answers "is the screen dark right now?" and "flip it".
 * On the stock skin the mode is JAM's own light/dark pass; inside any other skin
 * it is that skin's light or dark palette, so the toggle always does something.
 */
export const isDark = () => document.documentElement.dataset.theme !== 'light';

export function flipMode() {
  // The stock skin's light/dark lives in theme.ts; every other skin carries its
  // own two palettes, so the same button does the right thing either way.
  if (useSkin.getState().skin === 'jam') {
    useTheme.getState().toggle();
    return useTheme.getState().theme === 'dark';
  }
  useSkin.getState().toggle();
  return useSkin.getState().mode === 'dark';
}

/** Before first paint, so a saved skin never flashes the default. */
applySkin(useSkin.getState().skin, useSkin.getState().mode);
