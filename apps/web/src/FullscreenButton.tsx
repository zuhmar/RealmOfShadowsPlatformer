import { ActionIcon } from './ActionIcon';
import { useEffect, useRef, useState } from 'react';

export function FullscreenButton() {
  const [expanded, setExpanded] = useState(false);
  const active = useRef(false);
  useEffect(() => {
    const reset = () => {
      active.current = false;
      setExpanded(false);
      document.documentElement.classList.remove('game-expanded');
    };
    const changed = () => {
      if (!document.fullscreenElement) reset();
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && active.current && !document.fullscreenElement) reset();
    };
    document.addEventListener('fullscreenchange', changed);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('fullscreenchange', changed);
      document.removeEventListener('keydown', escape);
      if (active.current && document.fullscreenElement)
        void document.exitFullscreen().catch(() => {});
      document.documentElement.classList.remove('game-expanded');
    };
  }, []);
  async function toggle() {
    if (expanded) {
      active.current = false;
      setExpanded(false);
      document.documentElement.classList.remove('game-expanded');
      if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
    } else {
      active.current = true;
      setExpanded(true);
      document.documentElement.classList.add('game-expanded');
      // Expand the whole document so inventory, chat and dialogs remain available.
      try {
        await document.documentElement.requestFullscreen?.();
      } catch {
        /* Window-filling fallback remains usable. */
      }
    }
  }
  return (
    <button
      className="icon-button utility-button fullscreen-button"
      onClick={() => void toggle()}
      aria-label={expanded ? 'Exit full screen' : 'Enter full screen'}
      aria-pressed={expanded}
      title={expanded ? 'Exit full screen (Esc)' : 'Full screen'}
    >
      <ActionIcon name="fullscreen" />
    </button>
  );
}
