import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { create } from 'zustand';
import { Camera, Image as ImageIcon, Smile, X } from 'lucide-react';
import { EMOJI, openCamera, searchGifs, snapCamera, toAttachment, type Media } from '../lib/media';
import { GIPHY_ON } from '../lib/media';
import { toast } from '../lib/toast';

/**
 * Room attachments live as data URLs inside an encrypted event, so a photo cannot
 * be opened in a new tab the way a link can. This is the viewer instead: one tap
 * on any photo or GIF in the room fills the screen, and it is mounted at the app
 * root so nothing clips it.
 */
const useViewer = create<{ item: (Media & { by?: string }) | null; open: (m: Media & { by?: string }) => void; close: () => void }>((set) => ({
  item: null,
  open: (item) => set({ item }),
  close: () => set({ item: null }),
}));

export function MediaViewer() {
  const item = useViewer((s) => s.item);
  const close = useViewer((s) => s.close);
  useEffect(() => {
    if (!item) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [item, close]);

  return (
    <AnimatePresence>
      {item && (
        <>
          <motion.div className="viewer-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={close} />
          <motion.figure
            className="viewer"
            role="dialog"
            aria-modal="true"
            aria-label={item.k === 'gif' ? 'GIF' : 'Photo'}
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
          >
            <img src={item.s} alt={item.k === 'gif' ? 'GIF shared in the room' : 'Photo shared in the room'} />
            <figcaption className="doto">{item.k === 'gif' ? 'GIF' : 'PHOTO'}{item.by ? ` · ${item.by}` : ''}</figcaption>
            <button type="button" className="viewer-close" onClick={close} aria-label="Close"><X size={20} /></button>
          </motion.figure>
        </>
      )}
    </AnimatePresence>
  );
}

/** Use this wherever a room message carries media. */
export const viewMedia = (m: Media & { by?: string }) => useViewer.getState().open(m);

/**
 * Room-only extras. The open floor stays text and dot reactions, exactly as it
 * was; inside an encrypted room you can also throw emoji, GIFs and a photo taken
 * on the spot, all of which go out through the same NIP-44 seal.
 */
export function ChatMedia({ pending, setPending, onEmoji }: { pending: Media | null; setPending: (m: Media | null) => void; onEmoji: (e: string) => void }) {
  const [panel, setPanel] = useState<'none' | 'emoji' | 'gif' | 'cam'>('none');
  const [tag, setTag] = useState('');
  const [gifs, setGifs] = useState<Media[]>([]);
  const video = useRef<HTMLVideoElement>(null);
  const file = useRef<HTMLInputElement>(null);
  const stopCam = useRef<(() => void) | null>(null);

  useEffect(() => () => stopCam.current?.(), []);

  const close = () => {
    stopCam.current?.();
    stopCam.current = null;
    setPanel('none');
  };

  const startCam = async () => {
    setPanel('cam');
    await new Promise((r) => setTimeout(r, 60));
    if (video.current) stopCam.current = await openCamera(video.current);
  };

  const pickFile = async (f: File | undefined) => {
    if (!f) return;
    if (!f.type.startsWith('image/')) return toast('Only images can go in a room.', 'warn');
    const m = await toAttachment(f);
    if (m) setPending(m);
  };

  const snap = async () => {
    if (!video.current) return;
    const m = await snapCamera(video.current);
    if (m) { setPending(m); close(); } else toast('Could not grab that frame.', 'warn');
  };

  return (
    <div className="chat-media">
      <div className="media-bar" role="toolbar" aria-label="Room attachments">
        <button type="button" className={`media-btn ${panel === 'emoji' ? 'on' : ''}`} onClick={() => (panel === 'emoji' ? close() : setPanel('emoji'))} aria-expanded={panel === 'emoji'}>
          <Smile size={17} /> Emoji
        </button>
        <button type="button" className={`media-btn ${panel === 'gif' ? 'on' : ''}`} onClick={() => (panel === 'gif' ? close() : setPanel('gif'))} aria-expanded={panel === 'gif'}>
          <b className="doto">GIF</b>
        </button>
        <button type="button" className={`media-btn ${panel === 'cam' ? 'on' : ''}`} onClick={() => (panel === 'cam' ? close() : startCam())} aria-expanded={panel === 'cam'}>
          <Camera size={17} /> Camera
        </button>
        <button type="button" className="media-btn" onClick={() => file.current?.click()}>
          <ImageIcon size={17} /> Photo
        </button>
        <input ref={file} type="file" accept="image/*" hidden onChange={(e) => { pickFile(e.target.files?.[0]); e.target.value = ''; }} />
      </div>

      <AnimatePresence>
        {pending && (
          <motion.div className="media-pending" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}>
            <img src={pending.s} alt="" />
            <span className="doto">{pending.k === 'gif' ? 'GIF' : 'PHOTO'} READY</span>
            <button type="button" onClick={() => setPending(null)} aria-label="Remove attachment"><X size={15} /></button>
          </motion.div>
        )}

        {panel === 'emoji' && (
          <motion.div className="media-panel" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            {EMOJI.map((set) => (
              <div key={set.label} className="emoji-set">
                <span className="doto">{set.label}</span>
                <div className="emoji-cells">
                  {set.cells.map((e) => (
                    <button key={e} type="button" onClick={() => { onEmoji(e); setPanel('none'); }}>{e}</button>
                  ))}
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {panel === 'gif' && (
          <motion.div className="media-panel" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            <div className="gif-search">
              <input value={tag} onChange={(e) => setTag(e.target.value)} placeholder={GIPHY_ON ? 'Search GIFs' : 'Paste a GIF link (https://…)'} aria-label="GIF" autoComplete="off" />
              {GIPHY_ON ? (
                <button type="button" onClick={async () => setGifs(await searchGifs(tag))}>Go</button>
              ) : (
                <button type="button" onClick={() => { const u = tag.trim(); if (/^https:\/\/\S+$/i.test(u)) { setPending({ k: 'gif', s: u }); setTag(''); setPanel('none'); } else toast('That is not a direct https GIF link.', 'warn'); }}>Attach</button>
              )}
            </div>
            {GIPHY_ON && gifs.length > 0 && (
              <div className="gif-grid">
                {gifs.map((g) => <button key={g.s} type="button" onClick={() => { setPending(g); setPanel('none'); }}><img src={g.s} alt="" loading="lazy" /></button>)}
              </div>
            )}
            {!GIPHY_ON && <p className="fine">Set VITE_GIPHY_KEY at build time to search GIFs in place. Until then, paste a link.</p>}
          </motion.div>
        )}

        {panel === 'cam' && (
          <motion.div className="media-panel cam" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            <video ref={video} playsInline muted aria-label="Camera preview" />
            <div className="cam-row">
              <button type="button" className="btn primary" onClick={snap}>Snap</button>
              <button type="button" className="btn ghost" onClick={close}>Cancel</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
