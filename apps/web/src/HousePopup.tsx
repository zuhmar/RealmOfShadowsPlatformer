import { useEffect, useRef, type ReactNode } from 'react';
import { ControlIcon } from './ControlIcon';
export function HousePopup({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const old = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    return () => {
      if (old?.isConnected) old.focus();
    };
  }, []);
  return (
    <div className="bag-backdrop" onPointerDown={(e) => e.stopPropagation()}>
      <section
        ref={ref}
        className="bag-view house-popup"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === 'Escape') {
            e.preventDefault();
            onClose();
          }
          if (e.key === 'Tab') {
            const nodes = Array.from(
              ref.current?.querySelectorAll<HTMLElement>(
                'button:not(:disabled),input:not(:disabled),[tabindex="0"]',
              ) ?? [],
            );
            if (
              e.shiftKey &&
              (document.activeElement === nodes[0] || document.activeElement === ref.current)
            ) {
              e.preventDefault();
              nodes.at(-1)?.focus();
            } else if (!e.shiftKey && document.activeElement === nodes.at(-1)) {
              e.preventDefault();
              nodes[0]?.focus();
            }
          }
        }}
      >
        <button className="bag-close" aria-label={`Close ${title.toLowerCase()}`} onClick={onClose}>
          <ControlIcon name="close" />
        </button>
        <header className="bag-heading">
          <h2>{title}</h2>
        </header>
        {children}
      </section>
    </div>
  );
}
