import { useEffect, useRef, useState } from 'react';
import {
  CLASS_PATHS,
  SKINS,
  CLASS_CHANGE_GOLD,
  canEquipSkin,
  type ClassId,
  type SkinId,
} from '@ros/game-data';
import type { Player } from '@ros/shared';
import { ClassSprite } from './ClassSprite';
const classes = Object.keys(CLASS_PATHS) as ClassId[];
export function ClassCarousel({
  player: p,
  mode,
  near,
  onClose,
  send,
}: {
  player: Player;
  mode: 'class' | 'skin';
  near: boolean;
  onClose: () => void;
  send: (type: string, value: unknown) => void;
}) {
  const choices: (SkinId | null)[] = mode === 'skin' ? [null, ...classes, 'golden-test'] : classes;
  const [index, setIndex] = useState(
    Math.max(0, choices.indexOf(mode === 'skin' ? (p.skin ?? null) : (p.classId ?? 'knight'))),
  );
  const [confirm, setConfirm] = useState(false),
    dialog = useRef<HTMLElement>(null),
    swipe = useRef<number | null>(null);
  const id = choices[index],
    path = id && id !== 'golden-test' ? CLASS_PATHS[id] : null,
    skin = id ? SKINS[id] : null;
  const move = (delta: number) => {
    setIndex((i) => (i + delta + choices.length) % choices.length);
    setConfirm(false);
  };
  useEffect(() => {
    const old = document.activeElement as HTMLElement | null;
    dialog.current?.focus();
    return () => old?.focus();
  }, []);
  const current = mode === 'skin' ? (p.skin ?? null) === id : p.classId === id;
  const blocked =
    mode === 'skin'
      ? !canEquipSkin(p.classId, id)
      : !p.quests?.['crystal-class-trial']?.claimed ||
        !near ||
        (!!p.classId && p.gold < CLASS_CHANGE_GOLD);
  return (
    <div className="class-carousel-backdrop" onPointerDown={(e) => e.stopPropagation()}>
      <section
        className="class-carousel"
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-label={mode === 'class' ? 'Choose your class' : 'Change your skin'}
        tabIndex={-1}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') {
            e.preventDefault();
            move(-1);
          }
          if (e.key === 'ArrowRight') {
            e.preventDefault();
            move(1);
          }
          if (e.key === 'Escape') onClose();
          if (e.key === 'Tab') {
            const nodes = Array.from(
              dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled)') ?? [],
            );
            const first = nodes[0],
              last = nodes.at(-1);
            if (
              e.shiftKey &&
              (document.activeElement === first || document.activeElement === dialog.current)
            ) {
              e.preventDefault();
              last?.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
              e.preventDefault();
              first?.focus();
            }
          }
          e.stopPropagation();
        }}
      >
        <button
          className="class-carousel-close"
          aria-label="Close class carousel"
          onClick={onClose}
        >
          ×
        </button>
        <p className="eyebrow">
          {mode === 'class' ? 'YOUR NEXT CHAPTER' : 'YOUR LOOK, YOUR CHOICE'}
        </p>
        <h2>{mode === 'class' ? 'Choose your path' : 'Choose your skin'}</h2>
        <div
          className="class-carousel-slide"
          onTouchStart={(e) => {
            swipe.current = e.touches[0].clientX;
          }}
          onTouchEnd={(e) => {
            if (swipe.current !== null) {
              const dx = e.changedTouches[0].clientX - swipe.current;
              if (Math.abs(dx) > 45) move(dx < 0 ? 1 : -1);
            }
            swipe.current = null;
          }}
        >
          <button className="class-arrow" aria-label="Previous class" onClick={() => move(-1)}>
            ‹
          </button>
          <div className="class-carousel-content" key={id ?? 'civilian'}>
            <div className={`class-preview class-preview-${id ?? 'civilian'}`}>
              <ClassSprite armedPreview skin={id} appearance={p.appearance} outfit={p.outfit} />
            </div>
            <h3>{mode === 'class' ? path?.name : (skin?.name ?? 'Original adventurer')}</h3>
            <p>
              {mode === 'class'
                ? path?.description
                : (skin?.description ?? 'Your original outfit and uncovered hair.')}
            </p>
            {mode === 'class' && id && path && (
              <dl>
                <div>
                  <dt>Weapon</dt>
                  <dd>{path.weapon}</dd>
                </div>
                <div>
                  <dt>Training</dt>
                  <dd>{id === 'mage' ? 'Magic' : id === 'archer' ? 'Distance' : 'Melee'}</dd>
                </div>
                <div>
                  <dt>Signature</dt>
                  <dd>{path.signature}</dd>
                </div>
              </dl>
            )}
          </div>
          <button className="class-arrow" aria-label="Next class" onClick={() => move(1)}>
            ›
          </button>
        </div>
        <nav aria-label="Class slides" className="class-dots">
          {choices.map((choice, i) => (
            <button
              key={choice ?? 'original'}
              aria-label={`View ${choice ? (choice === 'golden-test' ? SKINS[choice].name : CLASS_PATHS[choice].name) : 'Original adventurer'}`}
              aria-current={index === i ? 'true' : undefined}
              onClick={() => {
                setIndex(i);
                setConfirm(false);
              }}
            />
          ))}
        </nav>
        {mode === 'class' ? (
          <p className="class-carousel-note">
            {!near
              ? 'Visit the Cavern Mentor to choose your first class. Later changes are also available from Mira.'
              : p.classId
                ? `Changing class costs ${CLASS_CHANGE_GOLD} gold and refunds talent points.`
                : 'Your first class choice is free. You can change your skin separately at any time.'}
          </p>
        ) : (
          <p className="class-carousel-note">
            {id && id !== 'golden-test' && !canEquipSkin(p.classId, id)
              ? `Requires the ${CLASS_PATHS[id].name} class.`
              : 'Free cosmetic change. Your class, equipment, training and attributes stay the same.'}
          </p>
        )}
        {confirm && (
          <p role="status">
            Spend {CLASS_CHANGE_GOLD} gold to become a {path?.name}?
          </p>
        )}
        <button
          className="primary class-confirm"
          disabled={current || blocked}
          onClick={() => {
            if (mode === 'skin') {
              send('skin', id);
              onClose();
            } else if (p.classId && !confirm) setConfirm(true);
            else send('class', { action: 'choose', id });
          }}
        >
          {current
            ? 'Currently selected'
            : mode === 'skin'
              ? 'Wear this skin'
              : confirm
                ? 'Confirm class change'
                : p.classId
                  ? 'Change class'
                  : 'Choose this class'}
        </button>
        <button className="text-button" onClick={onClose}>
          {mode === 'class' ? 'Choose later' : 'Keep current look'}
        </button>
      </section>
    </div>
  );
}
