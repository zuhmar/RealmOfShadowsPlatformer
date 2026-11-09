import { BagPanel } from './BagPanel';
import { HousingPanel } from './HousingPanel';
import { recipeFromScroll } from '@ros/game-data';
import { RecipesPanel } from './RecipesPanel';
import { provisionRecipe, type ProvisionSkill } from '@ros/game-data';
import { foodEffect } from '@ros/shared';
import { ClassSprite } from './ClassSprite';
import { canEquipSkin } from '@ros/game-data';
import { ClassCarousel } from './ClassCarousel';
import { assetUrl } from './assets';
import { HudUpdates } from './hud-updates';
import { SnapshotDecoder, type SnapshotKeyframe, type SnapshotDelta } from '@ros/shared';
import { AudioSettings } from './AudioSettings';
import { realmAudio } from './audio';
import { CrystalQuests } from './CrystalQuests';
import { ClassPanel } from './ClassPanel';
import { OfflineActivities, activitySummary } from './OfflineActivities';
import { WorldMapPanel } from './WorldMapPanel';
import { SkillsPanel } from './SkillsPanel';
import { WoodsQuests } from './WoodsQuests';
import { ForgePanel } from './ForgePanel';
import { GatheringTools } from './GatheringTools';
import { ToolIcon } from './ToolIcon';
import { ControlIcon } from './ControlIcon';
import { ActionIcon } from './ActionIcon';
import { MenuIcon } from './MenuIcon';
import { FullscreenButton } from './FullscreenButton';
import { ItemIcon } from './ItemIcon';
import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Client, type Room } from 'colyseus.js';
import {
  MAPS,
  ITEMS,
  ISLANDS,
  WOODS_QUESTS,
  QUESTS,
  STORY,
  itemDefinition,
  weaponProfile,
  WEAPON_SKILL,
  weaponSkillDescription,
  weaponSkillProgression,
  GATHERING_SKILLS,
  gatheringXpNeeded,
  starterTool,
  TOOL_MATERIALS,
  GATHERING_TOOLS,
  xpNeeded,
  RULES,
} from '@ros/game-data';
import {
  classSkillCooldown,
  playerClassName,
  questStatus,
  attackPower,
  playerAttributes,
  needsTrialWeapons,
  nearNpc,
  type Player,
  type Snapshot,
  type Event,
  type Input,
  type AutoSettings,
  type ActivityReward,
} from '@ros/shared';
import type { Bridge } from './game';
import './style.css';
import './polish.css';
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
  offline: { kind: string } | null;
  offlineActivities?: { id: string; label: string }[];
  offlineReward: ActivityReward | null;
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
  const [connectionStatus, setConnectionStatus] = useState('');
  const recoveryEpoch = useRef(0);
  const hudUpdates = useRef<HudUpdates | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [playerId, setPlayerId] = useState('');
  const [chatOpen, setChatOpen] = useState(() => window.innerWidth > 700);
  const [panel, setPanel] = useState<string | null>(null);
  const [cosmeticDialog, setCosmeticDialog] = useState<'class' | 'skin' | null>(null);
  const offeredClass = useRef(new Set<string>());
  const previousClass = useRef<{ id: string; classId?: string } | null>(null);
  const [recipePending, setRecipePending] = useState(false);
  const [recipeSkill, setRecipeSkill] = useState<ProvisionSkill>('Cooking');
  const [forgePending, setForgePending] = useState(false);
  const [questPending, setQuestPending] = useState(false);
  const [chat, setChat] = useState<{ name: string; text: string }[]>([
    { name: 'Elderwood', text: 'Welcome, traveler. Your story starts here.' },
  ]);
  const [message, setMessage] = useState('');
  const [name, setName] = useState('');
  const appearance = 'male';
  const outfit = 'sage';
  const [creating, setCreating] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteName, setDeleteName] = useState('');
  const [loadingProgress, setLoadingProgress] = useState<number | null>(null);
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
  useEffect(() => {
    const resume = () => hudUpdates.current?.flush();
    document.addEventListener('visibilitychange', resume);
    return () => {
      hudUpdates.current?.stop();
      document.removeEventListener('visibilitychange', resume);
    };
  }, []);
  useEffect(() => realmAudio.bind(), []);
  useEffect(() => {
    realmAudio.setBiome(page === 'game' ? (snapshot?.mapId ?? null) : null);
  }, [page, snapshot?.mapId]);
  const p = snapshot?.players.find((x) => x.id === playerId);
  const map = MAPS[snapshot?.mapId ?? 'village'];
  useEffect(() => {
    if (!p) return;
    if (
      previousClass.current?.id === p.id &&
      previousClass.current.classId !== p.classId &&
      p.classId
    )
      setCosmeticDialog(null);
    previousClass.current = { id: p.id, classId: p.classId };
    if (
      !p.classId &&
      p.quests?.['crystal-class-trial']?.claimed &&
      map.id === 'crystal' &&
      nearNpc(p, map, 'mentor') &&
      !offeredClass.current.has(p.id)
    ) {
      offeredClass.current.add(p.id);
      setPanel(null);
      setCosmeticDialog('class');
      bridge.current.send('auto', false);
    }
  }, [p?.id, p?.classId, p?.quests?.['crystal-class-trial']?.claimed, map.id]);

  const trialStatus = p ? questStatus(p) : 'available';
  const woodsObjective =
    p &&
    Object.values(WOODS_QUESTS).find(
      (q) => !p.quests?.[q.id]?.claimed && p.quests?.[q.prerequisite]?.claimed,
    );
  const closeToBram = !!p && map.id === 'village' && nearNpc(p, map, 'bram');
  const closeToMira = !!p && nearNpc(p, map, 'mira');
  const quest = QUESTS['mira-wolves'];
  const nearbyResource =
    p &&
    map.resources?.find(
      (n) =>
        p.grounded &&
        p.platform === n.platform &&
        Math.abs(p.x - n.x) <= 72 &&
        Math.abs(p.y - n.y) < 40,
    );
  const bossWarning = snapshot?.wolves.find((w) => w.special)?.special;
  const nearbyPortal =
    p && map.portals.find((q) => Math.abs(q.x - p.x) < 110 && Math.abs(q.y - p.y) < 65);
  const gatheringNode = p?.gathering && map.resources?.find((n) => n.id === p.gathering?.nodeId);
  const skillCooldown = p
    ? Math.max(
        0,
        Math.ceil((classSkillCooldown(p) - ((snapshot?.time ?? Date.now()) - p.lastSkill)) / 1000),
      )
    : 0;
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
  async function join(
    c: Character,
    mapId = c.data.mapId,
    reconnectToken?: string,
    epoch?: number,
    reservation?: Parameters<Client['consumeSeatReservation']>[0],
  ) {
    const client = new Client(SERVER.replace(/^http/, 'ws'));
    const joinOptions = { token, characterId: c.id, mapId, snapshotProtocol: 1, travelProtocol: 2 };
    const next = reconnectToken
      ? await client.reconnect(reconnectToken)
      : reservation
        ? await client
            .consumeSeatReservation(reservation)
            .catch(() => client.joinOrCreate('map', joinOptions))
        : await client.joinOrCreate('map', {
            token,
            characterId: c.id,
            mapId,
            snapshotProtocol: 1,
            travelProtocol: 2,
          });
    if (epoch !== undefined && epoch !== recoveryEpoch.current) {
      await next.leave();
      return false;
    }
    roomRef.current = next;
    hudUpdates.current?.stop();
    const hud = new HudUpdates(c.id, (s) => {
      if (roomRef.current === next) setSnapshot(s);
    });
    hudUpdates.current = hud;
    const decoder = new SnapshotDecoder();
    next.onMessage('welcome', (w: { id: string }) => {
      setPlayerId(w.id);
      bridge.current.id = w.id;
    });
    const receiveSnapshot = (s: Snapshot) => {
      if (roomRef.current !== next) return;
      bridge.current.snapshot = s;
      snapshotRef.current = s;
      hud.push(s);
      setPlayerId(c.id);
      bridge.current.id = c.id;
      setRoom(next);
      setPage('game');
    };
    next.onMessage('snapshot', (s: SnapshotKeyframe) => receiveSnapshot(decoder.full(s)));
    let resyncAt = 0;
    next.onMessage('snapshotDelta', (delta: SnapshotDelta) => {
      if (roomRef.current !== next) return;
      const s = decoder.delta(delta);
      if (s) receiveSnapshot(s);
      else if (Date.now() - resyncAt > 1000) {
        resyncAt = Date.now();
        next.send('snapshotResync');
      }
    });
    next.onMessage('events', (events: Event[]) => {
      for (const event of events) {
        realmAudio.event(event, c.id);
        if (event.playerId === c.id && event.lootStage === 'pickup') {
          const recipes = event.loot?.map((i) => recipeFromScroll(i.item)).filter(Boolean);
          if (recipes?.length)
            setNotice(`Recipe learned: ${recipes.map((r) => r!.name).join(', ')}`);
        }
        game.current?.scene.getScene('realm')?.events.emit('float', event);
      }
    });
    next.onMessage('chat', (m: { name: string; text: string }) =>
      setChat((old) => [...old.slice(-39), m]),
    );
    next.onMessage('notice', (m: string) => setNotice(m));
    next.onMessage('npc', (npc: { id: string }) => {
      if (npc.id === 'mira') setPanel('mira');
      if (npc.id === 'bram') setPanel('bram');
      if (npc.id === 'mentor') setPanel('crystal-quests');
      if (npc.id === 'cooking-station' || npc.id === 'alchemy-station') {
        setRecipeSkill(npc.id === 'cooking-station' ? 'Cooking' : 'Alchemy');
        setPanel('recipes');
      }
    });
    next.onMessage('provisionResult', (result: { ok: boolean; message: string }) => {
      setRecipePending(false);
      if (result.ok) setNotice(result.message);
      else setError(result.message);
    });
    next.onMessage('forgeResult', (result: { ok: boolean; message: string }) => {
      setForgePending(false);
      if (result.ok) setNotice(result.message);
      else setError(result.message);
    });
    next.onMessage('questResult', (result: { ok: boolean; message: string }) => {
      setQuestPending(false);
      if (result.ok) setNotice(result.message);
      else setError(result.message);
    });
    next.onMessage(
      'travel',
      (
        message:
          | string
          | {
              target: string;
              overlapLeave: boolean;
              reservation?: Parameters<Client['consumeSeatReservation']>[0];
            },
      ) => {
        const target = typeof message === 'string' ? message : message.target;
        const overlapLeave = typeof message !== 'string' && message.overlapLeave;
        void run(async () => {
          hud.stop();
          bridge.current.snapshot = null;
          bridge.current.held = {};
          host.current?.setAttribute('aria-busy', 'true');
          setLoadingProgress(null);
          roomRef.current = null;
          const leaving = next.leave();
          if (overlapLeave) void leaving.catch(() => {});
          else await leaving;
          setRoom(null);
          setSnapshot(null);
          bridge.current.snapshot = null;
          await join(
            c,
            target,
            undefined,
            undefined,
            typeof message === 'string' ? undefined : message.reservation,
          );
        });
      },
    );
    next.onError((_code, text) => {
      setRecipePending(false);
      setQuestPending(false);
      setForgePending(false);
      setError(text ?? 'Connection error');
    });
    next.onLeave(() => {
      hud.stop();
      if (roomRef.current !== next) return;
      setRecipePending(false);
      roomRef.current = null;
      setRoom(null);
      setQuestPending(false);
      setForgePending(false);
      setPanel(null);
      bridge.current.held = {};
      bridge.current.blocked = true;
      const attempt = ++recoveryEpoch.current;
      setConnectionStatus('Connection interrupted. Reconnecting…');
      void (async () => {
        for (const delay of [250, 750, 1500, 2500, 4000, 4000, 4000, 4000, 4000]) {
          await new Promise((resolve) => setTimeout(resolve, delay));
          if (attempt !== recoveryEpoch.current) return;
          try {
            const connected = await join(
              c,
              bridge.current.snapshot?.mapId ?? mapId,
              next.reconnectionToken,
              attempt,
            );
            if (connected && attempt === recoveryEpoch.current) {
              setConnectionStatus('');
              setError('');
              setNotice('Connection restored. Resume movement or AUTO when ready.');
            }
            return;
          } catch {}
        }
        if (attempt !== recoveryEpoch.current) return;
        setConnectionStatus('');
        setPage('characters');
        setSnapshot(null);
        bridge.current.snapshot = null;
        setNotice('Could not restore the connection. Re-enter using your last confirmed save.');
        await refresh().catch((e) => setError(e.message));
      })();
    });
    return true;
  }

  function recipeAction(action: 'craft' | 'use', recipeId: string) {
    if (recipePending || !roomRef.current) return;
    setRecipePending(true);
    roomRef.current.send('provision', { action, recipeId });
  }
  async function play(c: Character) {
    await run(async () => {
      const reward = await api(`/characters/${c.id}/claim`, 'POST', {});
      if (reward.xp || reward.gold || reward.skillXp)
        setNotice(`Activity complete: ${activitySummary(reward)}`);
      await join(c);
    });
  }
  async function leave() {
    recoveryEpoch.current++;
    setConnectionStatus('');
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
    setLoadingProgress(null);
    bridge.current.onLoadProgress = (percent) => {
      if (!disposed) setLoadingProgress(percent);
    };
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
  }, [page]);
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
    bridge.current.blocked =
      !!cosmeticDialog ||
      !!connectionStatus ||
      panel === 'mira' ||
      panel === 'bram' ||
      panel === 'crystal-quests' ||
      panel === 'recipes';
    if (
      cosmeticDialog ||
      panel === 'mira' ||
      panel === 'bram' ||
      panel === 'crystal-quests' ||
      panel === 'recipes'
    )
      bridge.current.held = {};
  }, [panel, connectionStatus, cosmeticDialog]);
  function isolateControlInput(e: React.SyntheticEvent) {
    if (page === 'game' && (e.target as Element).closest('button,input,textarea,select,.modal'))
      e.stopPropagation();
  }
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
    <div
      className={`app ${page === 'game' ? 'playing' : ''}`}
      onPointerDown={isolateControlInput}
      onPointerUp={isolateControlInput}
      onMouseDown={isolateControlInput}
      onMouseUp={isolateControlInput}
      onTouchStart={isolateControlInput}
      onTouchEnd={isolateControlInput}
      onContextMenuCapture={(e) => {
        if (page === 'game' && (e.target as Element).closest('button, .phaser-host'))
          e.preventDefault();
      }}
      onDragStartCapture={(e) => {
        if (page === 'game' && (e.target as Element).closest('button, .phaser-host'))
          e.preventDefault();
      }}
    >
      <header className="site-header">
        <a className="brand" href="#" onClick={(e) => e.preventDefault()}>
          <img
            src={assetUrl('/assets/ui/realm-of-shadows-logo.png')}
            alt="Realm of Shadows"
            className="brand-logo"
          />
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
          <div className="landing-art" aria-hidden="true" />
          <section className="hero">
            <img
              className="hero-logo"
              src={assetUrl('/assets/ui/realm-of-shadows-logo.png')}
              alt="Realm of Shadows"
            />
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
              Already a traveler? Log in
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
            <span>01 / THE JOURNEY BEGINS</span>
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
                    <ClassSprite
                      skin={
                        canEquipSkin(c.data.classId, c.data.skin) ? (c.data.skin ?? null) : null
                      }
                      outfit={c.outfit}
                      appearance={c.appearance}
                    />
                    <span>✦</span>
                  </div>
                  <h2>{c.name}</h2>
                  <div className="character-class">
                    LEVEL {c.data.level} ·{' '}
                    {(c.class === 'Citizen' ? 'Civilian' : c.class).toUpperCase()}
                  </div>
                  <p>⌖ {MAPS[c.data.mapId]?.name}</p>
                  <div className="character-summary">
                    <span>◈ {c.data.gold} gold</span>
                    <span>⚔ {c.data.kills} wolves</span>
                  </div>
                  <OfflineActivities
                    active={!!c.offline}
                    reward={c.offlineReward}
                    choices={c.offlineActivities ?? [{ id: 'training', label: 'General training' }]}
                    busy={busy}
                    assign={(kind) =>
                      void run(async () => {
                        await api(`/characters/${c.id}/offline`, 'POST', { kind });
                        await refresh();
                        setNotice('Offline activity assigned.');
                      })
                    }
                    claim={() =>
                      void run(async () => {
                        const reward = await api(`/characters/${c.id}/claim`, 'POST', {});
                        await refresh();
                        setNotice(`Activity complete: ${activitySummary(reward)}`);
                      })
                    }
                  />
                  <button className="primary" disabled={busy} onClick={() => play(c)}>
                    {busy ? 'Connecting…' : 'Enter world →'}
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
          {connectionStatus && (
            <div className="connection-recovery" role="status">
              <div>
                <h2>Finding your way back</h2>
                <p>{connectionStatus}</p>
                <button
                  onClick={() => {
                    recoveryEpoch.current++;
                    const abandoned = roomRef.current;
                    roomRef.current = null;
                    void abandoned?.leave();
                    setConnectionStatus('');
                    setPage('characters');
                    setSnapshot(null);
                    bridge.current.snapshot = null;
                    void refresh().catch((e) => setError(e.message));
                  }}
                >
                  Return to characters
                </button>
              </div>
            </div>
          )}
          <div className="game-stage">
            <div className="world-title">
              <div>
                <span className="eyebrow">{map.island.toUpperCase()}</span>
                <h1>
                  {map.name}
                  <span>CH. 01</span>
                </h1>
              </div>
              <div className="world-actions">
                <button
                  className="icon-button utility-button"
                  aria-label="Chat"
                  title="Chat"
                  aria-expanded={chatOpen}
                  aria-controls="world-chat"
                  onClick={() => setChatOpen((v) => !v)}
                >
                  <ActionIcon name="chat" />
                </button>
                <FullscreenButton />
                <span className="connection-dot" /> Shared world{' '}
                <button
                  onClick={() => setPanel('map')}
                  className="icon-button utility-button"
                  aria-label="World map"
                  title="World map"
                >
                  <ActionIcon name="world-map" />
                </button>
                <button
                  onClick={leave}
                  disabled={busy}
                  className="icon-button utility-button"
                  title="Back to characters"
                  aria-label="Leave world"
                >
                  <ActionIcon name="back" />
                </button>
              </div>
            </div>
            <div className="phaser-host" ref={host} aria-busy="true" />
            <div className="adventure-loading" role="status" aria-live="polite">
              <div className="adventure-loading-content">
                <img
                  src={assetUrl('/assets/ui/realm-of-shadows-logo.png')}
                  alt="Realm of Shadows"
                  draggable={false}
                />
                <span className="loading-rune" aria-hidden="true">
                  ✦
                </span>
                <h2>Preparing your adventure…</h2>
                <p>
                  {loadingProgress === null
                    ? 'Opening the realm…'
                    : `Loading artwork… ${loadingProgress}%`}
                </p>
                <div className="loading-trail" aria-hidden="true">
                  <span />
                </div>
              </div>
            </div>
            <div className="stage-vignette" />
            {p && (
              <>
                <div className="player-hud">
                  <div className={`portrait ${p.outfit}`}>
                    <ClassSprite
                      skin={p.skin ?? null}
                      outfit={p.outfit}
                      appearance={p.appearance}
                    />
                    <b>{p.level}</b>
                  </div>
                  <div className="vitals">
                    <div className="player-name">
                      {p.name}
                      <span>{playerClassName(p)}</span>
                    </div>
                    {statBar('HP', p.hp, playerAttributes(p).maxHealth, 'hp')}
                    {statBar('MP', p.mp, playerAttributes(p).maxMana, 'mp')}
                    <div className="profile-gold">
                      ◈ {p.gold.toLocaleString()} gold{' '}
                      {foodEffect(p, snapshot?.time) && (
                        <button
                          className="food-active"
                          onClick={() => setPanel('recipes')}
                          title={`${provisionRecipe(p.foodBuff!.recipeId)?.name}: ${provisionRecipe(p.foodBuff!.recipeId)?.description}`}
                          aria-label="Active food buff"
                        >
                          <ItemIcon id={p.foodBuff!.recipeId} />
                          {Math.max(
                            0,
                            Math.ceil(
                              (p.foodBuff!.expiresAt - (snapshot?.time ?? Date.now())) / 1000,
                            ),
                          )}
                          s
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <nav className="profile-menu" aria-label="Player menus">
                  {(
                    [
                      ['inventory', 'bag', 'Bag'],
                      ['character', 'character', 'Character'],
                      ['quests', 'journal', 'Journal'],
                      ['skills', 'skills', 'Skills'],
                    ] as const
                  ).map(([id, icon, label]) => (
                    <button key={id} onClick={() => setPanel(id)} aria-label={label}>
                      <MenuIcon name={icon} />
                      <small>{label}</small>
                    </button>
                  ))}
                  <button onClick={() => setPanel('housing')} aria-label="Housing">
                    <ItemIcon id="house-small" />
                    <small>Home</small>
                  </button>
                </nav>
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
                    <small>{woodsObjective ? 'WOODS JOURNEY' : 'YOUR FIRST STEPS'}</small>
                    <b>{woodsObjective?.title ?? quest.title}</b>
                    <span>
                      {woodsObjective
                        ? p.quests?.[woodsObjective.id]
                          ? `${Math.min(p.quests[woodsObjective.id].progress, woodsObjective.target.count)} / ${woodsObjective.target.count} · ${questStatus(p, woodsObjective.id) === 'ready' ? 'Return to Mira' : 'Defeat ' + woodsObjective.target.monsterId.replaceAll('-', ' ')}`
                          : 'Speak to Mira for your next trial'
                        : needsTrialWeapons(p)
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
                    <ControlIcon name="right" />
                  </button>
                </div>
                <div className="world-hint">
                  {bossWarning
                    ? 'GROUND SLAM — move out of the red zone!'
                    : gatheringNode
                      ? `${gatheringNode.skill}… ${Math.max(0, Math.ceil(((p.gathering?.finishAt ?? 0) - (snapshot?.time ?? 0)) / 1000))}s • Repeats · Move to stop`
                      : nearbyResource
                        ? `E • ${nearbyResource.skill} • Lv. ${p.gatheringSkills?.[nearbyResource.skill]?.level ?? 1}`
                        : nearbyPortal
                          ? `E • ${nearbyPortal.label}${nearbyPortal.key ? ` • ${p.inventory[nearbyPortal.key] ?? 0} key(s) · 1 consumed` : ''}`
                          : map.id === 'village'
                            ? closeToMira
                              ? 'E · Talk to Mira'
                              : closeToBram
                                ? 'E · Talk to Bram'
                                : 'E · Talk to Mira, Bram or use a portal'
                            : 'W / ↑ to climb · J to attack · K for weapon skill'}
                </div>
                <div className="touch-controls">
                  <div className="movement-buttons">
                    <button {...hold('left')} aria-label="Move left">
                      <ControlIcon name="left" />
                    </button>
                    <button {...hold('right')} aria-label="Move right">
                      <ControlIcon name="right" />
                    </button>
                    <button {...hold('up')} aria-label="Climb up">
                      <ControlIcon name="up" />
                    </button>
                    <button {...hold('down')} aria-label="Climb down">
                      <ControlIcon name="down" />
                    </button>
                  </div>
                  <div className="auto-group">
                    <button
                      className={`auto-button ${p.auto ? 'active' : ''}`}
                      aria-pressed={p.auto}
                      onClick={() => room?.send('auto', !p.auto)}
                    >
                      <ControlIcon name="auto" /> AUTO <b>{p.auto ? 'ON' : 'OFF'}</b>
                    </button>
                    <button
                      className="auto-settings"
                      onClick={() => setPanel('settings')}
                      aria-label="Auto settings"
                    >
                      <ControlIcon name="settings" />
                    </button>
                  </div>
                  <div className="jump-buttons">
                    <button {...hold('jump')} aria-label="Jump">
                      <ControlIcon name="jump" />
                    </button>
                    <button {...hold('attack')} aria-label="Attack">
                      <ControlIcon name="attack" />
                    </button>
                  </div>
                </div>
              </>
            )}
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
                <div className="floating-actions" role="group" aria-label="Combat controls">
                  <div className="skillbar">
                    <button className="skill attack" {...hold('attack')} aria-label="Basic attack">
                      <ControlIcon name="attack" />
                      <small>J</small>
                      <b>Attack</b>
                    </button>
                    <button
                      className="skill"
                      {...hold('skill')}
                      aria-label="Weapon skill"
                      title={`${weaponSkillDescription(p.weapon)} · ${WEAPON_SKILL.mana} MP · ${classSkillCooldown(p) / 1000}s cooldown`}
                      data-ready={skillCooldown === 0 && p.mp >= WEAPON_SKILL.mana}
                    >
                      <ControlIcon name="skill" />
                      <small>K</small>
                      <b>
                        {weaponProfile(p.weapon).skillName} {weaponSkillProgression(p.weapon).rank}{' '}
                        · {WEAPON_SKILL.mana} MP · {classSkillCooldown(p) / 1000}s
                      </b>
                      <span className="skill-status" aria-live="polite">
                        {skillCooldown > 0
                          ? `${skillCooldown}s`
                          : p.mp < WEAPON_SKILL.mana
                            ? 'MP'
                            : ''}
                      </span>
                    </button>
                    <button
                      className="skill"
                      aria-label="Interact"
                      onClick={() => room?.send('interact', null)}
                    >
                      <ControlIcon name="interact" />
                      <small>E</small>
                      <b>Interact</b>
                    </button>
                  </div>
                </div>
                <div className="below-world" id="world-chat" hidden={!chatOpen}>
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
                      <button aria-label="Send chat">
                        <ControlIcon name="send" />
                      </button>
                    </form>
                  </section>
                </div>
              </>
            )}
          </div>
        </main>
      )}
      <footer>
        <span>© {new Date().getFullYear()} REALM OF SHADOWS</span>
        <span>
          Made for the journey. <i>✦</i> Your journey begins in Elderwood.
        </span>
      </footer>
      {auth && (
        <div className="modal-backdrop">
          <section className="modal">
            <button className="close" aria-label="Close" onClick={() => setAuth(null)}>
              <ControlIcon name="close" />
            </button>
            <img
              className="login-logo"
              src={assetUrl('/assets/ui/realm-of-shadows-logo.png')}
              alt="Realm of Shadows"
            />
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
              <ControlIcon name="close" />
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
              <p>Your adventurer uses the white-and-gold Celestial form.</p>
              <p>
                Begin as a Civilian. Complete the Crystal Caverns class quest to choose your path.
              </p>
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
      {panel === 'map' && p && (
        <div
          className="world-map-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="World map"
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.stopPropagation();
              setPanel(null);
            }
          }}
        >
          <button
            className="world-map-close"
            aria-label="Close panel"
            onClick={() => setPanel(null)}
          >
            <ControlIcon name="close" />
          </button>
          <WorldMapPanel
            onPreview={(id) => bridge.current.prepareMap?.(id)}
            player={p}
            onTeleport={(id) => {
              room?.send('teleport', id);
              setPanel(null);
            }}
            onBuy={() => room?.send('buyTeleportCrystal')}
          />
        </div>
      )}
      {cosmeticDialog && p && page === 'game' && (
        <ClassCarousel
          player={p}
          mode={cosmeticDialog}
          near={
            (map.id === 'crystal' && nearNpc(p, map, 'mentor')) ||
            (!!p.classId && map.id === 'village' && nearNpc(p, map, 'mira'))
          }
          onClose={() => setCosmeticDialog(null)}
          send={bridge.current.send}
        />
      )}
      {panel === 'inventory' && p && (
        <BagPanel
          player={p}
          time={snapshot?.time ?? Date.now()}
          pending={recipePending}
          onUse={(id) => recipeAction('use', id)}
          send={bridge.current.send}
          onClose={() => setPanel(null)}
        />
      )}
      {panel && panel !== 'map' && panel !== 'inventory' && p && (
        <div className="modal-backdrop">
          <section className="modal wide">
            <button className="close" aria-label="Close panel" onClick={() => setPanel(null)}>
              <ControlIcon name="close" />
            </button>
            <span className="eyebrow">THE TRAVELER’S COMPANION</span>
            <h2>
              {
                (
                  {
                    housing: 'Your Elderwood home.',
                    inventory: 'Your satchel.',
                    character: 'The road so far.',
                    skills: 'Skills & attributes.',
                    quests: 'Adventure journal.',
                    mira: 'Mira · Village guide',
                    bram: 'Bram’s Forge',
                    map: 'Beyond the Elderwood.',
                    settings: 'Hunt your way.',
                    recipes: 'Cooking & Alchemy',
                  } as Record<string, string>
                )[panel]
              }
            </h2>
            {panel === 'housing' && (
              <HousingPanel
                player={p}
                players={snapshot?.players ?? []}
                send={bridge.current.send}
              />
            )}
            {panel === 'skills' && (
              <>
                <ClassPanel
                  player={p}
                  send={bridge.current.send}
                  onBrowse={() => setCosmeticDialog('class')}
                />
                <button className="primary" onClick={() => setPanel('recipes')}>
                  Cooking & Alchemy recipes
                </button>
                <SkillsPanel player={p} />
              </>
            )}
            {panel === 'recipes' && (
              <RecipesPanel
                key={recipeSkill}
                player={p}
                initialSkill={recipeSkill}
                pending={recipePending}
                onAction={recipeAction}
              />
            )}
            {panel === 'character' && (
              <>
                <button className="primary" onClick={() => setCosmeticDialog('skin')}>
                  Change skin
                </button>
                <div className={`portrait-big ${p.outfit}`}>
                  <ClassSprite skin={p.skin ?? null} outfit={p.outfit} appearance={p.appearance} />
                  <span>✦</span>
                </div>
                <h3>
                  {p.name} · Level {p.level} {playerClassName(p)}
                </h3>
                <div className="stat-grid">
                  {[
                    ['Health', `${Math.floor(p.hp)} / ${playerAttributes(p).maxHealth}`],
                    ['Mana', `${Math.floor(p.mp)} / ${playerAttributes(p).maxMana}`],
                    ['Attack', `${attackPower(p)}`],
                    ['Enemies defeated', p.kills],
                    ['Experience', `${p.xp} / ${xpNeeded(p.level)}`],
                    ['Weapon', itemDefinition(p.weapon)?.name ?? 'Unarmed'],
                    ['Class', playerClassName(p)],
                    ['Attack range', `${weaponProfile(p.weapon).range}`],
                    ['Attack interval', `${weaponProfile(p.weapon).cooldown} ms`],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <span>{k}</span>
                      <b>{v}</b>
                    </div>
                  ))}
                </div>
                <h3>Accessory</h3>
                <p>
                  <ItemIcon id="forest-guardian-ring" /> Forest Guardian Ring · +4 attack ·{' '}
                  {p.inventory['forest-guardian-ring'] ?? 0} owned
                </p>
                <button
                  className="secondary"
                  disabled={!(p.inventory['forest-guardian-ring'] > 0)}
                  onClick={() =>
                    room?.send(
                      'equipAccessory',
                      p.accessory === 'forest-guardian-ring' ? null : 'forest-guardian-ring',
                    )
                  }
                >
                  {p.accessory === 'forest-guardian-ring'
                    ? 'Unequip Forest Guardian Ring'
                    : 'Equip Forest Guardian Ring'}
                </button>
                <GatheringTools player={p} onEquip={(id) => room?.send('equipTool', id)} />
                <details className="tool-tiers">
                  <summary>View tool tiers</summary>
                  <p>Forge Iron tools with Bram. Higher ore tiers arrive with later islands.</p>
                  {TOOL_MATERIALS.map((material) => (
                    <div className="tool-tier" key={material.id}>
                      <span>{material.name}</span>
                      {GATHERING_TOOLS.filter((tool) => tool.material === material.id).map(
                        (tool) => (
                          <ToolIcon key={tool.id} id={tool.id} />
                        ),
                      )}
                    </div>
                  ))}
                </details>
                <h3>Gathering skills</h3>
                <div className="stat-grid">
                  {GATHERING_SKILLS.map((name) => {
                    const skill = p.gatheringSkills?.[name] ?? { level: 1, xp: 0 };
                    return (
                      <div key={name}>
                        <span>{name}</span>
                        <b>
                          Lv. {skill.level} · {skill.xp}/{gatheringXpNeeded(skill.level)} XP
                        </b>
                      </div>
                    );
                  })}
                </div>
                <p>
                  Civilians can try all four weapons. Complete the Crystal Caverns class quest to
                  unlock your path and combat training. Open Skills for class talents and equipment
                  attributes.
                </p>
              </>
            )}
            {panel === 'quests' && (
              <article>
                <h3>{STORY.title}</h3>
                <p>{STORY.prologue}</p>
                {p.originRevelation && (
                  <section>
                    <h3>{p.originRevelation.title}</h3>
                    <p>{p.originRevelation.text}</p>
                  </section>
                )}
              </article>
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
            {(panel === 'quests' || panel === 'crystal-quests') && (
              <CrystalQuests
                onBrowse={() => setCosmeticDialog('class')}
                player={p}
                dialog={panel === 'crystal-quests'}
                near={nearNpc(p, map, 'mentor')}
                pending={questPending}
                send={bridge.current.send}
              />
            )}
            {(panel === 'quests' || panel === 'mira') && (
              <WoodsQuests
                player={p}
                dialog={panel === 'mira'}
                pending={questPending}
                nearMira={closeToMira}
                onAction={(questId, action) => {
                  if (questPending) return;
                  setQuestPending(true);
                  room?.send('quest', { questId, action });
                }}
              />
            )}
            {(panel === 'bram' || panel === 'quests') && (
              <ForgePanel
                player={p}
                near={closeToBram}
                pending={forgePending}
                onTalk={() => room?.send('interact', { npcId: 'bram' })}
                onAction={(action, recipeId) => {
                  if (forgePending) return;
                  setForgePending(true);
                  room?.send('forge', { action, recipeId });
                }}
              />
            )}
            {panel === 'settings' && (
              <>
                <AudioSettings />
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
