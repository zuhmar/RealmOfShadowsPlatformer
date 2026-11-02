import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Client, type Room } from 'colyseus.js';
import {
  MAPS,
  ITEMS,
  ISLANDS,
  QUESTS,
  STORY,
  itemDefinition,
  weaponBonus,
  weaponProfile,
  maxHp,
  xpNeeded,
  RULES,
} from '@ros/game-data';
import {
  questStatus,
  needsTrialWeapons,
  nearNpc,
  type Player,
  type Snapshot,
  type Event,
  type Input,
  type AutoSettings,
} from '@ros/shared';
import type { Bridge } from './game';
import './style.css';
import { Avatar } from './Avatar';
import { QuestPanel } from './QuestPanel';
const SERVER = import.meta.env.VITE_SERVER_URL ?? `${location.protocol}//${location.hostname}:2567`;
type Character = {
  id: string;
  name: string;
  class: string;
  appearance: string;
  outfit: string;
  data: Player;
  offline: unknown;
  offlineReward: { seconds: number; xp: number; gold: number } | null;
};
function App() {
  const [token, setToken] = useState(localStorage.getItem('ros-session') ?? '');
  const [guest, setGuest] = useState(true);
  const [page, setPage] = useState<'landing' | 'characters' | 'game'>('landing');
  const [auth, setAuth] = useState<'login' | 'register' | null>(null);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [room, setRoom] = useState<Room | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [playerId, setPlayerId] = useState('');
  const [panel, setPanel] = useState<string | null>(null);
  const [questPending, setQuestPending] = useState(false);
  const [chat, setChat] = useState<{ name: string; text: string }[]>([
    { name: 'Elderwood', text: 'Welcome, traveler. Your story starts here.' },
  ]);
  const [message, setMessage] = useState('');
  const [name, setName] = useState('');
  const [appearance, setAppearance] = useState('male');
  const [outfit, setOutfit] = useState('sage');
  const [creating, setCreating] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteName, setDeleteName] = useState('');
  const host = useRef<HTMLDivElement>(null);
  const game = useRef<ReturnType<(typeof import('./game'))['mountGame']> | null>(null);
  const roomRef = useRef<Room | null>(null);
  const bridge = useRef<Bridge>({
    snapshot: null,
    id: '',
    held: {},
    send: (t, d) => roomRef.current?.send(t, d),
  });
  const snapshotRef = useRef<Snapshot | null>(null);
  const p = snapshot?.players.find((x) => x.id === playerId);
  const map = MAPS[snapshot?.mapId ?? 'village'];
  const trialStatus = p ? questStatus(p) : 'available';
  const closeToMira = !!p && nearNpc(p, map, 'mira');
  const quest = QUESTS['mira-wolves'];
  async function api(path: string, method = 'GET', body?: unknown, override?: string) {
    const response = await fetch(`${SERVER}/api${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...((override ?? token) ? { Authorization: `Bearer ${override ?? token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? 'Request failed');
    return data;
  }
  function remember(value: string) {
    localStorage.setItem('ros-session', value);
    setToken(value);
  }
  async function run(fn: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }
  async function refresh(t?: string) {
    const result = await api('/characters', 'GET', undefined, t);
    setCharacters(result.characters);
    setGuest(result.guest);
    setPage('characters');
  }
  async function enterGuest() {
    await run(async () => {
      if (token) {
        await refresh();
        return;
      }
      const result = await api('/guest', 'POST', {});
      remember(result.token);
      setGuest(true);
      await refresh(result.token);
    });
  }
  async function authenticate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await run(async () => {
      const result = await api(`/${auth}`, 'POST', Object.fromEntries(form));
      remember(result.token);
      setGuest(false);
      setAuth(null);
      await refresh(result.token);
    });
  }
  async function create(e: React.FormEvent) {
    e.preventDefault();
    await run(async () => {
      await api('/characters', 'POST', { name, appearance, outfit });
      setCreating(false);
      setName('');
      await refresh();
    });
  }
  async function join(c: Character, mapId = c.data.mapId) {
    const client = new Client(SERVER.replace(/^http/, 'ws'));
    const next = await client.joinOrCreate('map', { token, characterId: c.id, mapId });
    roomRef.current = next;
    next.onMessage('welcome', (w: { id: string }) => {
      setPlayerId(w.id);
      bridge.current.id = w.id;
    });
    next.onMessage('snapshot', (s: Snapshot) => {
      bridge.current.snapshot = s;
      snapshotRef.current = s;
      setSnapshot(s);
      setPlayerId(c.id);
      bridge.current.id = c.id;
      setRoom(next);
      setPage('game');
    });
    next.onMessage('events', (events: Event[]) => {
      for (const event of events)
        game.current?.scene.getScene('realm')?.events.emit('float', event);
    });
    next.onMessage('chat', (m: { name: string; text: string }) =>
      setChat((old) => [...old.slice(-39), m]),
    );
    next.onMessage('notice', (m: string) => setNotice(m));
    next.onMessage('npc', (npc: { id: string }) => {
      if (npc.id === 'mira') setPanel('mira');
    });
    next.onMessage('questResult', (result: { ok: boolean; message: string }) => {
      setQuestPending(false);
      if (result.ok) setNotice(result.message);
      else setError(result.message);
    });
    next.onMessage('travel', (target: string) => {
      void run(async () => {
        await next.leave();
        roomRef.current = null;
        setRoom(null);
        setSnapshot(null);
        bridge.current.snapshot = null;
        await join(c, target);
      });
    });
    next.onError((_code, text) => {
      setQuestPending(false);
      setError(text ?? 'Connection error');
    });
    next.onLeave((code) => {
      if (roomRef.current === next) {
        roomRef.current = null;
        setRoom(null);
        setQuestPending(false);
        setPanel(null);
        setPage('characters');
        setNotice(
          code > 1000
            ? 'Disconnected. Your last saved progress is safe. Re-enter to reconnect.'
            : 'Left the world.',
        );
        void refresh().catch((e) => setError(e.message));
      }
    });
  }
  async function play(c: Character) {
    await run(async () => {
      const reward = await api(`/characters/${c.id}/claim`, 'POST', {});
      if (reward.xp || reward.gold)
        setNotice(`Training complete: +${reward.xp} XP · +${reward.gold} gold`);
      await join(c);
    });
  }
  async function leave() {
    await run(async () => {
      const current = roomRef.current;
      if (current) {
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(
            () => reject(new Error('Save confirmation timed out. Please reconnect.')),
            10000,
          );
          current.onMessage('saved', () => {
            clearTimeout(timeout);
            resolve();
          });
          current.send('logout', null);
        });
        roomRef.current = null;
        await current.leave();
      }
      setRoom(null);
      setSnapshot(null);
      setPanel(null);
      bridge.current.snapshot = null;
      await refresh();
    });
  }
  useEffect(() => {
    if (page !== 'game' || !room || !host.current) return;
    let disposed = false;
    void import('./game')
      .then(({ mountGame }) => {
        if (!disposed && host.current) game.current = mountGame(host.current, bridge.current);
      })
      .catch((e) => setError(e.message));
    const release = () => {
      bridge.current.held = {};
      bridge.current.send('input', {
        left: false,
        right: false,
        up: false,
        down: false,
        jump: false,
        attack: false,
        skill: false,
        interact: false,
      });
    };
    window.addEventListener('blur', release);
    return () => {
      disposed = true;
      window.removeEventListener('blur', release);
      game.current?.destroy(true);
      game.current = null;
    };
  }, [room, page]);
  useEffect(() => {
    const prevent = (e: KeyboardEvent) => {
      if (
        page === 'game' &&
        ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code) &&
        !['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)
      )
        e.preventDefault();
    };
    window.addEventListener('keydown', prevent);
    return () => window.removeEventListener('keydown', prevent);
  }, [page]);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(''), 5500);
    return () => clearTimeout(t);
  }, [notice]);
  useEffect(() => {
    bridge.current.blocked = panel === 'mira';
    if (panel === 'mira') bridge.current.held = {};
  }, [panel]);
  function hold(key: keyof Input) {
    return {
      onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        bridge.current.held[key] = true;
      },
      onPointerUp: () => {
        delete bridge.current.held[key];
      },
      onPointerCancel: () => {
        delete bridge.current.held[key];
      },
      onLostPointerCapture: () => {
        delete bridge.current.held[key];
      },
    };
  }
  const statBar = (label: string, value: number, max: number, cls: string) => (
    <div className={`bar ${cls}`}>
      <i style={{ width: `${Math.max(0, Math.min(100, (value / max) * 100))}%` }} />
      <span>
        {label}
        <b>
          {Math.floor(value)} / {max}
        </b>
      </span>
    </div>
  );
  return (
    <div className="app">
      <header className="site-header">
        <a className="brand" href="#" onClick={(e) => e.preventDefault()}>
          <span className="brand-mark">✦</span>
          <span>
            REALM <small>OF</small> SHADOWS<em>A WORLD WAITING TO BE DISCOVERED</em>
          </span>
        </a>
        <nav>
          <span className="build-badge">
            FIRST LIGHT <i>α 0.1</i>
          </span>
          <span className="online">
            <i />
            {page === 'game'
              ? `${snapshot?.players.length ?? 1} adventurers online`
              : 'A new adventure awaits'}
          </span>
        </nav>
      </header>
      {error && (
        <div className="alert" role="alert">
          {error}
          <button onClick={() => setError('')}>×</button>
        </div>
      )}
      {notice && (
        <div className="toast" role="status">
          {notice}
        </div>
      )}
      {page === 'landing' && (
        <main className="landing">
          <div className="landing-art">
            <div className="moon" />
            <div className="tree t1" />
            <div className="tree t2" />
            <div className="tree t3" />
            <div className="tree t4" />
            <div className="portal-art">✦</div>
            <div className="ground-art" />
          </div>
          <section className="hero">
            <div className="eyebrow">THE LAST SURVIVOR · YOUR JOURNEY BEGINS</div>
            <h1>
              A little light.
              <br />A world of <em>shadows.</em>
            </h1>
            <p>{STORY.prologue}</p>
            <div className="hero-actions">
              <button className="primary large" disabled={busy} onClick={enterGuest}>
                {busy ? 'Opening the gates…' : token ? 'Continue adventure →' : 'Play as guest →'}
              </button>
              <button className="secondary large" onClick={() => setAuth('register')}>
                Create account
              </button>
            </div>
            <button className="text-button" onClick={() => setAuth('login')}>
              Already a traveler? Log in ↗
            </button>
            <div className="hero-features">
              <span>
                ◈<b>Explore together</b>Shared multiplayer worlds
              </span>
              <span>
                ⚔<b>Find your rhythm</b>Manual & automatic hunting
              </span>
              <span>
                ✧<b>Keep growing</b>Progress worth returning to
              </span>
            </div>
          </section>
          <div className="art-caption">
            <span>01 / THE ELDERWOOD</span>
            <b>Every legend begins with a first step.</b>
          </div>
        </main>
      )}
      {page === 'characters' && (
        <main className="selection">
          <div className="eyebrow">THE JOURNEY IS YOURS</div>
          <h1>
            Your adventurers<span>Choose your next chapter.</span>
          </h1>
          <div className="selection-top">
            <p>
              {guest
                ? 'Guest progress is saved on this device through a 30-day session. Upgrade to keep access across devices.'
                : 'Your characters are saved to your account.'}
            </p>
            <div>
              {guest && (
                <button className="secondary" onClick={() => setAuth('register')}>
                  Protect your progress ↗
                </button>
              )}
              <button
                className="text-button"
                onClick={() => {
                  localStorage.removeItem('ros-session');
                  setToken('');
                  setPage('landing');
                }}
              >
                Sign out
              </button>
            </div>
          </div>
          <div className="slots">
            {[0, 1, 2].map((i) => {
              const c = characters[i];
              return c ? (
                <article className="character-card" key={c.id}>
                  <div className="card-number">
                    ADVENTURER 0{i + 1}
                    <button
                      aria-label={`Delete ${c.name}`}
                      onClick={() => {
                        setDeleteId(c.id);
                        setDeleteName('');
                      }}
                    >
                      ×
                    </button>
                  </div>
                  <div className={`portrait-big ${c.outfit}`}>
                    <Avatar outfit={c.outfit} appearance={c.appearance} />
                    <span>✦</span>
                  </div>
                  <h2>{c.name}</h2>
                  <div className="character-class">
                    LEVEL {c.data.level} · {c.class.toUpperCase()}
                  </div>
                  <p>⌖ {MAPS[c.data.mapId]?.name}</p>
                  <div className="character-summary">
                    <span>◈ {c.data.gold} gold</span>
                    <span>⚔ {c.data.kills} wolves</span>
                  </div>
                  {c.offlineReward && (
                    <div className="offline-reward">
                      ✧ Training rewards: {c.offlineReward.xp} XP · {c.offlineReward.gold} gold{' '}
                      <small>Claim now, or enter the world to collect.</small>
                      <button
                        className="text-button"
                        disabled={busy}
                        onClick={() =>
                          run(async () => {
                            const reward = await api(`/characters/${c.id}/claim`, 'POST', {});
                            await refresh();
                            setNotice(`Training complete: +${reward.xp} XP · +${reward.gold} gold`);
                          })
                        }
                      >
                        Claim rewards →
                      </button>
                    </div>
                  )}
                  <button className="primary" disabled={busy} onClick={() => play(c)}>
                    {busy ? 'Connecting…' : 'Enter world →'}
                  </button>
                  <button
                    className="text-button"
                    disabled={busy || !!c.offline}
                    onClick={() =>
                      run(async () => {
                        await api(`/characters/${c.id}/offline`, 'POST', { kind: 'training' });
                        await refresh();
                        setNotice('Training assigned. Earn up to 8 hours of offline rewards.');
                      })
                    }
                  >
                    {c.offline ? 'Training while away' : 'Assign offline training'}
                  </button>
                </article>
              ) : (
                <button key={i} className="empty-slot" onClick={() => setCreating(true)}>
                  <span>＋</span>
                  <h2>A story unwritten</h2>
                  <p>Create a new adventurer</p>
                  <small>SLOT 0{i + 1}</small>
                </button>
              );
            })}
          </div>
        </main>
      )}
      {page === 'game' && (
        <main className="game-shell">
          <div className="world-title">
            <div>
              <span className="eyebrow">{map.island.toUpperCase()}</span>
              <h1>
                {map.name}
                <span>CH. 01</span>
              </h1>
            </div>
            <div className="world-actions">
              <span className="connection-dot" /> Shared world{' '}
              <button onClick={() => setPanel('map')} className="secondary">
                ⌖ World map
              </button>
              <button
                onClick={leave}
                disabled={busy}
                className="icon-button"
                aria-label="Leave world"
              >
                ↪
              </button>
            </div>
          </div>
          <div className="game-stage">
            <div className="phaser-host" ref={host} />
            <div className="stage-vignette" />
            {p && (
              <>
                <div className="player-hud">
                  <div className={`portrait ${p.outfit}`}>
                    <Avatar outfit={p.outfit} appearance={p.appearance} />
                    <b>{p.level}</b>
                  </div>
                  <div className="vitals">
                    <div className="player-name">
                      {p.name}
                      <span>
                        {weaponProfile(p.weapon).className === 'Citizen'
                          ? 'Citizen'
                          : `${weaponProfile(p.weapon).className} trial`}
                      </span>
                    </div>
                    {statBar('HP', p.hp, maxHp(p.level), 'hp')}
                    {statBar('MP', p.mp, 50, 'mp')}
                  </div>
                </div>
                <div className="map-hud">
                  <span>⌖ {map.name}</span>
                  <div className="mini-map">
                    {map.platforms.map((f) => (
                      <i
                        key={f.id}
                        style={{
                          left: `${(f.x / map.width) * 100}%`,
                          top: `${(f.y / map.height) * 100}%`,
                          width: `${(f.width / map.width) * 100}%`,
                        }}
                      />
                    ))}
                    <b
                      style={{
                        left: `${(p.x / map.width) * 100}%`,
                        top: `${(p.y / map.height) * 100}%`,
                      }}
                    />
                  </div>
                  <small>
                    {map.spawns.length ? 'LV. 1–10 · HUNTING AREA' : 'SAFE ZONE · ELDERWOOD'}
                  </small>
                </div>
                <div className="area-tag">
                  <i />{' '}
                  {p.auto
                    ? 'AUTO HUNTING ACTIVE'
                    : map.spawns.length
                      ? 'THE FOREST IS ALIVE'
                      : 'WELCOME HOME, TRAVELER'}
                </div>
                <div className="objective">
                  <span className="quest-symbol">!</span>
                  <div>
                    <small>YOUR FIRST STEPS</small>
                    <b>{quest.title}</b>
                    <span>
                      {needsTrialWeapons(p)
                        ? 'Collect your class weapons from Mira'
                        : trialStatus === 'available'
                          ? 'Speak to Mira in Elderwood Village.'
                          : trialStatus === 'ready'
                            ? 'Return to Mira · reward ready'
                            : trialStatus === 'claimed'
                              ? 'First trial complete · onward'
                              : `Wolves defeated · ${p.quests?.[quest.id]?.progress ?? 0} / ${quest.target.count}`}
                    </span>
                  </div>
                  <button aria-label="Open journal" onClick={() => setPanel('quests')}>
                    ›
                  </button>
                </div>
                <div className="world-hint">
                  {map.id === 'village'
                    ? closeToMira
                      ? 'E · Talk to Mira'
                      : 'E · Talk to Mira or use a portal'
                    : 'W / ↑ to climb · J to attack · K for weapon skill'}
                </div>
                <div className="touch-controls">
                  <div>
                    <button {...hold('left')} aria-label="Move left">
                      ◀
                    </button>
                    <button {...hold('right')} aria-label="Move right">
                      ▶
                    </button>
                    <button {...hold('up')} aria-label="Climb up">
                      ↑
                    </button>
                    <button {...hold('down')} aria-label="Climb down">
                      ↓
                    </button>
                  </div>
                  <div>
                    <button {...hold('jump')} aria-label="Jump">
                      ↟
                    </button>
                    <button {...hold('attack')} aria-label="Attack">
                      ⚔
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
          {p && (
            <>
              <div className="xp-strip">
                <i style={{ width: `${(p.xp / xpNeeded(p.level)) * 100}%` }} />
                <span>
                  LV. {p.level}{' '}
                  <b>
                    {p.xp} / {xpNeeded(p.level)} XP
                  </b>
                </span>
              </div>
              <div className="game-toolbar">
                <div className="wallet">
                  <span>◈</span>
                  <b>{p.gold.toLocaleString()}</b>
                  <small>GOLD</small>
                </div>
                <div className="skillbar">
                  <button className="skill attack" {...hold('attack')}>
                    <span>{itemDefinition(p.weapon)?.icon ?? '⚔'}</span>
                    <small>J</small>
                    <b>Attack</b>
                  </button>
                  <button className="skill" {...hold('skill')}>
                    <span>✧</span>
                    <small>K</small>
                    <b>{weaponProfile(p.weapon).skillName} · 12 MP</b>
                  </button>
                  <button className="skill" onClick={() => room?.send('interact', null)}>
                    <span>⌘</span>
                    <small>E</small>
                    <b>Interact</b>
                  </button>
                </div>
                <div className="auto-group">
                  <button
                    className={`auto-button ${p.auto ? 'active' : ''}`}
                    onClick={() => room?.send('auto', !p.auto)}
                  >
                    <span>⟳</span> AUTO <b>{p.auto ? 'ON' : 'OFF'}</b>
                  </button>
                  <button
                    className="auto-settings"
                    onClick={() => setPanel('settings')}
                    aria-label="Auto settings"
                  >
                    ⚙
                  </button>
                </div>
                <div className="menu-buttons">
                  {[
                    ['inventory', '▦', 'Bag'],
                    ['character', '♙', 'Character'],
                    ['quests', '☷', 'Journal'],
                  ].map(([id, icon, label]) => (
                    <button key={id} onClick={() => setPanel(id)}>
                      <span>{icon}</span>
                      <small>{label}</small>
                    </button>
                  ))}
                </div>
              </div>
              <div className="below-world">
                <section className="chat-box">
                  <div className="chat-tabs">
                    <b>WORLD</b>
                    <span>
                      Party <small>soon</small>
                    </span>
                    <i>● Connected</i>
                  </div>
                  <div className="chat-lines" aria-live="polite">
                    {chat.slice(-3).map((m, i) => (
                      <p key={i}>
                        <b>{m.name}</b> {m.text}
                      </p>
                    ))}
                  </div>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (message.trim()) {
                        room?.send('chat', message);
                        setMessage('');
                      }
                    }}
                  >
                    <input
                      aria-label="World chat"
                      placeholder="Say something to the world…"
                      maxLength={180}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                    />
                    <button aria-label="Send chat">↵</button>
                  </form>
                </section>
                <section className="adventure-note">
                  <span>✦</span>
                  <div>
                    <h3>A world that grows with you.</h3>
                    <p>
                      Take the long way. Climb a little higher.
                      <br />
                      There’s always another story beyond the trees.
                    </p>
                    <small>
                      WASD / ARROWS <i>move</i> SPACE <i>jump</i> J <i>attack</i>
                    </small>
                  </div>
                </section>
              </div>
            </>
          )}
        </main>
      )}
      <footer>
        <span>© {new Date().getFullYear()} REALM OF SHADOWS</span>
        <span>
          Made for the journey. <i>✦</i> First playable · original placeholder art
        </span>
      </footer>
      {auth && (
        <div className="modal-backdrop">
          <section className="modal">
            <button className="close" aria-label="Close" onClick={() => setAuth(null)}>
              ×
            </button>
            <span className="eyebrow">A PLACE TO CALL YOUR OWN</span>
            <h2>
              {auth === 'login'
                ? 'Welcome back.'
                : guest && token
                  ? 'Keep your adventure.'
                  : 'Begin your story.'}
            </h2>
            <p>
              {auth === 'register'
                ? 'Create an account to access your characters across devices. Guest characters are retained when you upgrade.'
                : 'Log in to return to your characters.'}
            </p>
            <form onSubmit={authenticate}>
              <label>
                Email
                <input name="email" type="email" required autoComplete="email" />
              </label>
              <label>
                Password
                <input
                  name="password"
                  type="password"
                  minLength={10}
                  maxLength={128}
                  required
                  autoComplete={auth === 'login' ? 'current-password' : 'new-password'}
                />
              </label>
              <button disabled={busy} className="primary">
                {busy ? 'One moment…' : auth === 'login' ? 'Log in →' : 'Create account →'}
              </button>
            </form>
          </section>
        </div>
      )}
      {creating && (
        <div className="modal-backdrop">
          <section className="modal">
            <button className="close" aria-label="Close" onClick={() => setCreating(false)}>
              ×
            </button>
            <span className="eyebrow">EVERY HERO STARTS SOMEWHERE</span>
            <h2>A new adventurer.</h2>
            <div className={`portrait-big ${outfit}`}>
              <Avatar outfit={outfit} appearance={appearance} />
              <span>✦</span>
            </div>
            <form onSubmit={create}>
              <label>
                Character name
                <input
                  aria-label="Character name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  pattern="[A-Za-z][A-Za-z0-9 ]{2,15}"
                  required
                  maxLength={16}
                  placeholder="What will they call you?"
                />
              </label>
              <label>
                Appearance
                <select value={appearance} onChange={(e) => setAppearance(e.target.value)}>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </label>
              <label>
                Starting outfit
                <select value={outfit} onChange={(e) => setOutfit(e.target.value)}>
                  <option value="sage">Sage wanderer</option>
                  <option value="ember">Ember traveler</option>
                  <option value="tide">Tide explorer</option>
                </select>
              </label>
              <p>You begin as a Citizen. Your path is yet unwritten.</p>
              <button className="primary" disabled={busy}>
                {busy ? 'Creating…' : 'Create adventurer →'}
              </button>
            </form>
          </section>
        </div>
      )}
      {deleteId && (
        <div className="modal-backdrop">
          <section className="modal">
            <h2>Delete adventurer?</h2>
            <p>
              This permanently deletes their progress. Type{' '}
              <b>{characters.find((c) => c.id === deleteId)?.name}</b> to confirm.
            </p>
            <input
              aria-label="Confirm character name"
              value={deleteName}
              onChange={(e) => setDeleteName(e.target.value)}
            />
            <button
              className="danger"
              disabled={busy || deleteName !== characters.find((c) => c.id === deleteId)?.name}
              onClick={() =>
                run(async () => {
                  await api(`/characters/${deleteId}`, 'DELETE', { confirm: deleteName });
                  setDeleteId(null);
                  await refresh();
                })
              }
            >
              Delete permanently
            </button>
            <button className="secondary" onClick={() => setDeleteId(null)}>
              Keep character
            </button>
          </section>
        </div>
      )}
      {panel && p && (
        <div className="modal-backdrop">
          <section className="modal wide">
            <button className="close" aria-label="Close panel" onClick={() => setPanel(null)}>
              ×
            </button>
            <span className="eyebrow">THE TRAVELER’S COMPANION</span>
            <h2>
              {
                (
                  {
                    inventory: 'Your satchel.',
                    character: 'The road so far.',
                    quests: 'Adventure journal.',
                    mira: 'Mira · Village guide',
                    map: 'Beyond the Elderwood.',
                    settings: 'Hunt your way.',
                  } as Record<string, string>
                )[panel]
              }
            </h2>
            {panel === 'inventory' && (
              <>
                <div className="inventory-summary">
                  ◈ {p.gold} gold <span>Weapon: {itemDefinition(p.weapon)?.name ?? 'Unarmed'}</span>
                </div>
                <div className="inventory-grid">
                  {Array.from({ length: 24 }, (_, i) => {
                    const entry = Object.entries(p.inventory).filter(([, n]) => n > 0)[i];
                    const item = entry ? ITEMS[entry[0] as keyof typeof ITEMS] : null;
                    return (
                      <div
                        className="inventory-cell"
                        tabIndex={item ? 0 : -1}
                        key={i}
                        onClick={(e) => {
                          if (item) e.currentTarget.focus();
                        }}
                      >
                        {item && (
                          <>
                            <span>{item.icon}</span>
                            <b>{entry![1]}</b>
                            <div className="item-detail">
                              <strong>{item.name}</strong>
                              <p>{item.description}</p>
                              {item.type === 'weapon' && (
                                <button
                                  className="primary"
                                  onClick={() =>
                                    room?.send('equip', p.weapon === item.id ? null : item.id)
                                  }
                                >
                                  {p.weapon === item.id ? 'Unequip' : 'Equip'}
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
                <p>
                  Loot is collected when you approach it. Every fifth wolf drops a Wayfarer Blade.
                  Hover or tap an item for details.
                </p>
              </>
            )}
            {panel === 'character' && (
              <>
                <div className={`portrait-big ${p.outfit}`}>
                  <Avatar outfit={p.outfit} appearance={p.appearance} />
                  <span>✦</span>
                </div>
                <h3>
                  {p.name} · Level {p.level} Citizen
                </h3>
                <div className="stat-grid">
                  {[
                    ['Health', `${Math.floor(p.hp)} / ${maxHp(p.level)}`],
                    ['Mana', `${Math.floor(p.mp)} / 50`],
                    ['Attack', `${RULES.baseDamage + (p.level - 1) * 3 + weaponBonus(p.weapon)}`],
                    ['Wolves defeated', p.kills],
                    ['Experience', `${p.xp} / ${xpNeeded(p.level)}`],
                    ['Weapon', itemDefinition(p.weapon)?.name ?? 'Unarmed'],
                    ['Weapon trial', weaponProfile(p.weapon).className],
                    ['Attack range', `${weaponProfile(p.weapon).range}`],
                    ['Attack interval', `${weaponProfile(p.weapon).cooldown} ms`],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <span>{k}</span>
                      <b>{v}</b>
                    </div>
                  ))}
                </div>
                <p>
                  Knight, Archer, Mage, Rogue and proficiency progression are planned for the
                  expansion milestone.
                </p>
              </>
            )}
            {(panel === 'quests' || panel === 'mira') && (
              <QuestPanel
                player={p}
                dialog={panel === 'mira'}
                pending={questPending}
                nearMira={closeToMira}
                onTalk={() => room?.send('interact', { npcId: 'mira' })}
                onAction={(action) => {
                  if (questPending) return;
                  setQuestPending(true);
                  room?.send('quest', { questId: quest.id, action });
                }}
              />
            )}
            {panel === 'map' && (
              <>
                <div className="island-list">
                  <article className="island open">
                    <span>⌂</span>
                    <div>
                      <h3>Elderwood Village</h3>
                      <p>Safe haven · portal hub · open</p>
                    </div>
                  </article>
                  {ISLANDS.map((island, i) => (
                    <article key={island.id} className={`island ${island.available ? 'open' : ''}`}>
                      <span>0{i + 1}</span>
                      <div>
                        <h3>{island.name}</h3>
                        <p>
                          Lv. {island.minLevel}–{island.maxLevel} ·{' '}
                          {island.available ? 'Wolf Hollow open' : 'Coming in an expansion'}
                        </p>
                      </div>
                      <b>{island.available ? '◇' : '⌑'}</b>
                    </article>
                  ))}
                </div>
                <p>
                  Travel through the portals in the world. Five later islands retain reserved
                  content slots; Shadow Dragon is the planned final encounter.
                </p>
              </>
            )}
            {panel === 'settings' && (
              <>
                <p>
                  AUTO follows real platform connections and ladders. Moving or attacking manually
                  cancels it immediately.
                </p>
                <div className="settings">
                  {[
                    ['skills', 'Use weapon skill automatically'],
                    ['loot', 'Collect nearby loot'],
                  ].map(([k, label]) => (
                    <label key={k}>
                      {label}
                      <input
                        type="checkbox"
                        checked={p.settings[k as 'skills' | 'loot']}
                        onChange={(e) =>
                          room?.send('settings', { ...p.settings, [k]: e.target.checked })
                        }
                      />
                    </label>
                  ))}
                  <label>
                    Target preference
                    <select
                      value={p.settings.target}
                      onChange={(e) =>
                        room?.send('settings', { ...p.settings, target: e.target.value })
                      }
                    >
                      <option value="nearest">Nearest reachable</option>
                      <option value="weakest">Weakest reachable</option>
                    </select>
                  </label>
                  <label>
                    Recover below {p.settings.healBelow}% HP
                    <input
                      type="range"
                      min={0}
                      max={70}
                      value={p.settings.healBelow}
                      onChange={(e) =>
                        room?.send('settings', { ...p.settings, healBelow: Number(e.target.value) })
                      }
                    />
                  </label>
                </div>
                <p>
                  Recovery adds a small regeneration bonus below the threshold. You respawn safely
                  if defeated, without losing gold.
                </p>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
createRoot(document.getElementById('root')!).render(<App />);
