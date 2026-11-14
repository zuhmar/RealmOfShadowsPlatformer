import { FrostfallScenery, preloadFrostfall } from './frostfall';
import { MurkmireScenery, preloadMurkmire, mireWarden } from './murkmire';
import { FurniturePlacement, type FurnitureSelection } from './furniture-placement';
import { constrainHouseActor } from '@ros/shared';
import { HouseInterior, preloadHouseInterior } from './house-interior';
import { houseSize } from '@ros/game-data';
import { craftingStation } from './crafting-stations';
import { HousingScenery } from './housing';
import { preloadFactionFigures, factionFigure } from './faction-figures';
import { provisionStation } from './provision-stations';
import { guardAtlasSampling } from './atlas-sampling';
import { fitArtwork } from './artwork';
import { assetUrl } from './assets';
import { CrystalScenery, preloadCrystal } from './crystal';
import { GEAR_RARITY_COLORS } from '@ros/shared';
import { BossWarnings, bossImpact } from './boss-attacks';
import { preloadBossEntrance, addBossEntrance } from './boss-entrances';
import { WoodsMonsterVisual, preloadWoodsMonster, registerWoodsMonster } from './woods-monsters';
import { preloadPortals, registerPortals, addPortal } from './portals';
import {
  skillEffect,
  preloadWeaponEffects,
  registerWeaponEffects,
  themeWeaponEffect,
} from './combat-effects';
import { preloadLoot, groundLoot, lootPickup } from './loot-effects';
import Phaser from 'phaser';
import { VillageScenery, preloadVillage } from './village';
import { WoodsScenery, preloadWoods } from './woods';
import { CharacterVisual, preloadCharacters, registerCharacters } from './character';
import { WolfVisual, registerWolfAnimations, WOLF_TEXTURE, WOLF_FRAME_SIZE } from './wolf';
import { MAPS, WOODS_MONSTERS, WOODS_QUESTS, type GameMap } from '@ros/game-data';
import {
  idleInput,
  questStatus,
  needsTrialWeapons,
  type Input,
  type Snapshot,
  type Event,
  type Player,
} from '@ros/shared';
export type Bridge = {
  snapshot: Snapshot | null;
  id: string;
  held: Partial<Input>;
  blocked?: boolean;
  furniturePlacement?: FurnitureSelection;
  send: (type: string, data: unknown) => void;
  onReady?: () => void;
  onChest?: (id: string) => void;
  prepareMap?: (id: string) => void;
  onLoadProgress?: (percent: number) => void;
};
export function mountGame(parent: HTMLElement, bridge: Bridge) {
  parent.setAttribute('aria-busy', 'true');
  let destroyed = false;
  const backgroundCache: string[] = [];
  const prepared = new Set<string>();
  class RealmScene extends Phaser.Scene {
    map!: GameMap;
    actors = new Map<string, Phaser.GameObjects.Container>();
    labels = new Map<string, Phaser.GameObjects.Text>();
    keys!: Record<string, Phaser.Input.Keyboard.Key>;
    lastSend = 0;
    lastInput = '';
    floor!: Phaser.Physics.Arcade.StaticGroup;
    playerBody?: Phaser.Physics.Arcade.Sprite;
    wolves = new Map<string, WolfVisual | WoodsMonsterVisual>();
    characters = new Map<string, CharacterVisual>();
    woods?: WoodsScenery;
    crystal?: CrystalScenery;
    murkmire?: MurkmireScenery;
    frostfall?: FrostfallScenery;
    village?: VillageScenery;
    housing?: HousingScenery;
    interior?: HouseInterior;
    furniturePlacement?: FurniturePlacement;
    miraMarker?: Phaser.GameObjects.Text;
    bossWarnings!: BossWarnings;
    nextPrepareAt = 3000;
    constructor() {
      super('realm');
    }
    preload() {
      const progress = (value: number) => bridge.onLoadProgress?.(Math.round(value * 100));
      this.load.on(Phaser.Loader.Events.PROGRESS, progress);
      this.load.once(Phaser.Loader.Events.COMPLETE, () => {
        this.load.off(Phaser.Loader.Events.PROGRESS, progress);
      });
      this.load.on(Phaser.Loader.Events.COMPLETE, () => {
        for (const key of this.textures.getTextureKeys())
          guardAtlasSampling(this.textures.get(key));
      });
      this.loadMap(MAPS[bridge.snapshot?.mapId ?? 'village']);
    }
    loadMap(loadingMap: GameMap) {
      preloadCharacters(this, bridge.snapshot?.players ?? [], loadingMap);
      preloadFactionFigures(this, loadingMap);

      preloadPortals(this, loadingMap);
      preloadWeaponEffects(this);
      preloadLoot(this, loadingMap);
      preloadBossEntrance(this, loadingMap);
      preloadWoodsMonster(this, loadingMap.monster);
      if (loadingMap.id === 'frostfall-battleground')
        for (const kind of ['frost-wolf', 'ice-troll', 'frozen-wraith', 'frost-giant'] as const)
          preloadWoodsMonster(this, kind);
      if (houseSize(loadingMap.id)) preloadHouseInterior(this);
      else if (loadingMap.island === 'Whispering Woods') preloadWoods(this, loadingMap);
      else if (loadingMap.island === 'Murkmire Swamp') preloadMurkmire(this, loadingMap);
      else if (loadingMap.island === 'Frostfall Tundra') preloadFrostfall(this, loadingMap);
      else if (loadingMap.island === 'Crystal Caverns') preloadCrystal(this, loadingMap);
      else {
        preloadVillage(this);
      }
      if (loadingMap.id === 'woods' || loadingMap.monster === 'wolf') {
        this.load.json('wolf-config', '/assets/monsters/wolf-spritesheet.json');
        this.load.spritesheet(WOLF_TEXTURE, assetUrl('/assets/monsters/wolf-spritesheet.png'), {
          frameWidth: WOLF_FRAME_SIZE,
          frameHeight: WOLF_FRAME_SIZE,
        });
      }
    }
    backgroundKey(map: GameMap) {
      if (map.island === 'Whispering Woods')
        return `woods-background:${map.background ?? '/assets/backgrounds/whispering-woods.png'}`;
      if (map.island === 'Murkmire Swamp') return `murkmire-background:${map.background}`;
      if (map.island === 'Frostfall Tundra') return `frostfall-background:${map.background}`;
      if (map.island === 'Crystal Caverns') return `crystal-background:${map.background}`;
      if (houseSize(map.id)) return 'house-interior';
      return 'village-background';
    }
    rememberBackground(map: GameMap) {
      const key = this.backgroundKey(map);
      if (key === 'village-background' || !this.textures.exists(key)) return;
      const prior = backgroundCache.indexOf(key);
      if (prior >= 0) backgroundCache.splice(prior, 1);
      backgroundCache.push(key);
      while (backgroundCache.length > 3) {
        const oldest = backgroundCache.shift()!;
        if (this.map && oldest === this.backgroundKey(this.map)) backgroundCache.push(oldest);
        else this.textures.remove(oldest);
      }
    }
    prepareMap(id: string) {
      const target = MAPS[id],
        p = bridge.snapshot?.players.find((p) => p.id === bridge.id);
      const connection = (navigator as Navigator & { connection?: { saveData?: boolean } })
        .connection;
      if (
        !target ||
        !p ||
        target.id === this.map.id ||
        p.level < target.requiredLevel ||
        connection?.saveData ||
        this.load.isLoading()
      )
        return;
      if (prepared.has(id) && this.textures.exists(this.backgroundKey(target))) return;
      let failed = false;
      const error = () => {
        failed = true;
      };
      this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, error);
      this.load.once(Phaser.Loader.Events.COMPLETE, () => {
        this.load.off(Phaser.Loader.Events.FILE_LOAD_ERROR, error);
        if (!failed) prepared.add(id);
        this.rememberBackground(target);
      });
      this.loadMap(target);
      this.load.start();
    }
    create() {
      this.nextPrepareAt = this.time.now + 3000;
      if (this.textures.exists(WOLF_TEXTURE)) registerWolfAnimations(this);
      registerWeaponEffects(this);
      registerWoodsMonster(this, MAPS[bridge.snapshot?.mapId ?? 'village'].monster);
      if (bridge.snapshot?.mapId === 'frostfall-battleground')
        for (const kind of ['frost-wolf', 'ice-troll', 'frozen-wraith', 'frost-giant'] as const)
          registerWoodsMonster(this, kind);
      registerCharacters(this);
      registerPortals(this, MAPS[bridge.snapshot?.mapId ?? 'village']);
      const id = bridge.snapshot?.mapId ?? 'village';
      this.map = MAPS[id];
      this.cameras.main.setBackgroundColor(
        houseSize(this.map.id)
          ? '#291a28'
          : this.map.island === 'Whispering Woods'
            ? '#b6c9b2'
            : '#c1d6c5',
      );
      this.cameras.main.setBounds(0, 0, this.map.width, this.map.height);
      this.physics.world.setBounds(0, 0, this.map.width, this.map.height);
      this.drawWorld();
      this.rememberBackground(this.map);
      this.bossWarnings = new BossWarnings(this);
      this.keys = this.input.keyboard!.addKeys(
        'A,D,W,S,SPACE,J,K,E,LEFT,RIGHT,UP,DOWN',
        false,
      ) as typeof this.keys;
      this.events.on('float', (e: Event) => {
        if (e.type === 'loot') {
          if (e.playerId === bridge.id) lootPickup(this, e);
          return;
        }
        if (e.type === 'bossAttack') {
          bossImpact(this, e);
          return;
        }
        if (e.type === 'skill') {
          skillEffect(this, {
            ...e,
            weapon: e.weapon ?? bridge.snapshot?.players.find((p) => p.id === e.playerId)?.weapon,
          });
          if (!e.text) return;
        }
        if (e.type === 'respawn' && e.playerId)
          this.characters.get(e.playerId)?.die(e.deathX, e.deathY);
        const t = this.add
          .text(e.x, e.y, e.text, {
            fontFamily: 'Georgia',
            fontSize: e.type === 'level' ? '25px' : e.gear ? '20px' : '18px',
            color: e.gear?.rarity
              ? GEAR_RARITY_COLORS[e.gear.rarity]
              : e.critical
                ? '#ffc85f'
                : e.type === 'hit'
                  ? '#fff4d5'
                  : '#ffe69b',
            stroke: '#243b32',
            strokeThickness: 4,
          })
          .setOrigin(0.5)
          .setDepth(50);
        this.tweens.add({
          targets: t,
          y: e.y - 65,
          alpha: 0,
          duration: e.gear ? 2200 : 1300,
          onComplete: () => t.destroy(),
        });
      });
      parent.setAttribute('aria-busy', 'false');
      bridge.onReady?.();
    }
    drawWorld() {
      const m = this.map;
      const woods = m.island === 'Whispering Woods';
      if (houseSize(m.id))
        this.interior = new HouseInterior(
          this,
          m,
          () => {
            if (!bridge.furniturePlacement) bridge.send('housing', { action: 'exit' });
          },
          (id) => {
            if (!bridge.furniturePlacement) bridge.onChest?.(id);
          },
        );
      else if (woods) this.woods = new WoodsScenery(this, m, (id) => bridge.send('gather', id));
      else if (m.island === 'Murkmire Swamp')
        this.murkmire = new MurkmireScenery(this, m, (id) => bridge.send('gather', id));
      else if (m.island === 'Frostfall Tundra')
        this.frostfall = new FrostfallScenery(this, m, (id) => bridge.send('gather', id));
      else if (m.island === 'Crystal Caverns')
        this.crystal = new CrystalScenery(this, m, (id) => bridge.send('gather', id));
      else {
        this.village = new VillageScenery(this, m);
        this.events.on('enter-house', () => bridge.send('housing', { action: 'enter' }));
        this.events.on('crafting-bram', () => bridge.send('interact', { npcId: 'bram' }));
        this.housing = new HousingScenery(this);
      }
      this.floor = this.physics.add.staticGroup();
      for (const p of m.platforms) {
        const body = this.add.rectangle(p.x + p.width / 2, p.y + 12, p.width, 24, 0, 0);
        this.physics.add.existing(body, true);
        this.floor.add(body);
      }
      addBossEntrance(this, m, () => bridge.send('travel', null));
      for (const p of houseSize(m.id) ? [] : m.portals) {
        if (!p.key || !m.bossEntrance) addPortal(this, m.id, p, () => bridge.send('travel', null));
        if (p.key)
          fitArtwork(
            this.add.image(
              p.x,
              p.y - 205,
              p.key === 'frostfall-boss-key'
                ? 'loot-frostfall-items'
                : p.key === 'murkmire-boss-key'
                  ? 'loot-murkmire-items'
                  : p.key === 'crystal-boss-key'
                    ? 'loot-crystal-drops'
                    : 'forest-bear-key',
              p.key === 'frostfall-boss-key'
                ? 'frostfall-boss-key'
                : p.key === 'murkmire-boss-key'
                  ? 'murkmire-boss-key'
                  : p.key === 'crystal-boss-key'
                    ? 'crystal-boss-key'
                    : undefined,
            ),
            42,
            28,
          )
            .setDepth(7)
            .setName('boss-key-marker');
        this.add
          .text(
            p.x,
            p.y - 164,
            p.key
              ? `${p.label}\n${p.key === 'frostfall-boss-key' ? 'Frost Giant' : p.key === 'murkmire-boss-key' ? 'Hydra' : p.key === 'crystal-boss-key' ? 'Crystal Wyrm' : 'Forest Bear'} Key ×1`
              : p.label,
            {
              fontSize: '14px',
              align: 'center',
              fontFamily: 'Georgia',
              color: '#fff5d5',
              stroke: '#241034',
              strokeThickness: 4,
            },
          )
          .setOrigin(0.5)
          .setDepth(7);
      }
      for (const npc of m.npcs) {
        const c =
          npc.id === 'mirewarden'
            ? mireWarden(this, npc.x, npc.y)
            : npc.id === 'carpentry-station'
              ? craftingStation(this, 'carpentry', npc.x, npc.y, 74, 110).setName(npc.id)
              : npc.id === 'cooking-station' || npc.id === 'alchemy-station'
                ? provisionStation(this, npc.x, npc.y, npc.id === 'cooking-station')
                : factionFigure(
                    this,
                    npc.x,
                    npc.y,
                    npc.allegiance ?? 'celestial',
                    npc.id === 'bram' ? 90 : 80,
                    npc.id,
                  );
        this.add
          .text(
            npc.x,
            npc.y -
              (npc.id === 'bram' || npc.id === 'mirewarden'
                ? 112
                : npc.id?.endsWith('-station')
                  ? 110
                  : 80),
            `${npc.name}\n${npc.role}`,
            {
              fontFamily: 'Georgia',
              fontSize: '14px',
              color: '#f6e9b6',
              align: 'center',
              stroke: '#263c31',
              strokeThickness: 4,
            },
          )
          .setOrigin(0.5);
        c.setDepth(8);
        if (
          npc.id === 'cooking-station' ||
          npc.id === 'alchemy-station' ||
          npc.id === 'carpentry-station'
        )
          this.add
            .zone(npc.x, npc.y - 45, 140, 110)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => bridge.send('interact', { npcId: npc.id }));
        if (npc.id === 'bram')
          this.add
            .zone(npc.x, npc.y - 40, 80, 100)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => bridge.send('interact', { npcId: 'bram' }));
        if (npc.id === 'frostwarden')
          this.add
            .zone(npc.x, npc.y - 40, 100, 120)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => bridge.send('interact', { npcId: 'frostwarden' }));
        if (npc.id === 'mirewarden')
          this.add
            .zone(npc.x, npc.y - 40, 100, 120)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => bridge.send('interact', { npcId: 'mirewarden' }));
        if (npc.id === 'mentor')
          this.add
            .zone(npc.x, npc.y - 40, 100, 120)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => bridge.send('interact', { npcId: 'mentor' }));
        if (npc.id === 'mira') {
          this.miraMarker = this.add
            .text(npc.x, npc.y - 126, '!', {
              fontFamily: 'Georgia',
              fontSize: '26px',
              color: '#f5d884',
              stroke: '#253e2c',
              strokeThickness: 4,
            })
            .setOrigin(0.5)
            .setDepth(11);
          this.add
            .zone(npc.x, npc.y - 40, 80, 100)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => bridge.send('interact', { npcId: 'mira' }));
        }
      }
      // Tiny fireflies move softly without obscuring the playable silhouettes.
      for (let n = 0; n < 22; n++) {
        const dot = this.add.circle(120 + n * 107, 300 + (n % 5) * 70, 2, 0xffedab, 0.6);
        this.tweens.add({
          targets: dot,
          y: dot.y - 22,
          alpha: 0.15,
          duration: 1600 + n * 43,
          yoyo: true,
          repeat: -1,
        });
      }
    }
    character(x: number, y: number, outfit: string, npc = false, appearance = 'male') {
      const c = this.add.container(x, y);
      const g = this.add.graphics();
      g.lineStyle(2.5, 0x203a32);
      g.fillStyle(0x223d34, 0.22);
      g.fillEllipse(0, -2, 44, 11);
      g.fillStyle(0x3b4439);
      g.fillRoundedRect(-12, -19, 10, 18, 3);
      g.strokeRoundedRect(-12, -19, 10, 18, 3);
      g.fillRoundedRect(3, -19, 10, 18, 3);
      g.strokeRoundedRect(3, -19, 10, 18, 3);
      const color = outfit === 'ember' ? 0xc38259 : outfit === 'tide' ? 0x6c9baf : 0x87a765;
      g.fillStyle(color);
      g.fillRoundedRect(-17, -49, 34, 34, 8);
      g.strokeRoundedRect(-17, -49, 34, 34, 8);
      g.fillStyle(0xc3d298, 0.7);
      g.fillRoundedRect(-12, -46, 8, 17, 3);
      g.fillStyle(0xead0a4);
      g.fillRoundedRect(-16, -70, 32, 30, 11);
      g.strokeRoundedRect(-16, -70, 32, 30, 11);
      g.fillStyle(0x694d36);
      if (appearance === 'female') {
        g.fillRoundedRect(-20, -66, 12, 32, 6);
        g.fillRoundedRect(-21, -66, 40, 14, 7);
      }
      g.fillRoundedRect(-18, -74, 36, 13, 6);
      g.fillTriangle(-17, -65, -9, -51, -7, -65);
      g.fillStyle(0x243a30);
      g.fillCircle(6, -56, 2);
      g.fillStyle(0xf5dcae);
      g.fillRoundedRect(14, -42, 9, 15, 4);
      g.strokeRoundedRect(14, -42, 9, 15, 4);
      if (!npc) {
        g.fillStyle(0xd6ded2);
        g.fillTriangle(22, -35, 24, -65, 30, -35);
        g.lineStyle(3, 0x6c5b3e);
        g.lineBetween(18, -34, 33, -34);
        g.lineBetween(25, -34, 25, -24);
      }
      c.add(g);
      return c;
    }
    sync(s: Snapshot) {
      this.bossWarnings.sync(s.wolves, s.time);
      const alive = new Set<string>();
      const local = s.players.find((p) => p.id === bridge.id);
      if (local && this.miraMarker) {
        const nextQuest = Object.values(WOODS_QUESTS).find(
          (q) => !local.quests?.[q.id]?.claimed && local.quests?.[q.prerequisite]?.claimed,
        );
        const status = questStatus(local, nextQuest?.id ?? 'mira-wolves');
        this.miraMarker.setText(
          needsTrialWeapons(local)
            ? '?'
            : status === 'available'
              ? '!'
              : status === 'ready'
                ? '?'
                : status === 'claimed'
                  ? '✓'
                  : '…',
        );
      }
      for (const state of s.players) {
        const p = this.map.interiorBounds ? { ...state } : state;
        constrainHouseActor(p, this.map);
        const key = p.id;
        alive.add(key);
        let visual = this.characters.get(key);
        if (!visual) {
          visual = new CharacterVisual(this, p);
          this.characters.set(key, visual);
          const label = this.add
            .text(0, 0, p.name, {
              fontFamily: 'Georgia',
              fontSize: '13px',
              color: key === bridge.id ? '#fff1b0' : '#ffffff',
              stroke: '#1b342d',
              strokeThickness: 4,
            })
            .setOrigin(0.5);
          this.labels.set(key, label);
          if (key === bridge.id) {
            this.playerBody = this.physics.add.sprite(p.x, p.y, '__DEFAULT').setVisible(false);
            this.playerBody.body!.setSize(28, 48);
            (this.playerBody.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
            this.cameras.main.startFollow(this.playerBody, true, 0.12, 0.12);
            this.cameras.main.setZoom(this.scale.width < 700 ? 0.85 : 1.05);
          }
        }
        visual.sync(p, this.map, this.time.now);
        const c = visual.container;
        this.labels.get(key)!.setPosition(c.x, c.y - 90);
        if (key === bridge.id && this.playerBody) this.playerBody.setPosition(c.x, c.y - 90);
      }
      for (const [id, visual] of this.characters)
        if (!alive.has(id)) {
          visual.destroy();
          this.characters.delete(id);
          this.labels.get(id)?.destroy();
          this.labels.delete(id);
        }
      const wolfIds = new Set(s.wolves.map((w) => w.id));
      for (const [id, visual] of this.wolves)
        if (!wolfIds.has(id)) {
          visual.destroy();
          this.wolves.delete(id);
          this.labels.get(id)?.destroy();
          this.labels.delete(id);
        }
      for (const w of s.wolves) {
        alive.add(w.id);
        let visual = this.wolves.get(w.id);
        if (!visual) {
          visual =
            w.monster && w.monster !== 'wolf'
              ? new WoodsMonsterVisual(this, w)
              : new WolfVisual(this, w);
          this.wolves.set(w.id, visual);
          this.labels.set(
            w.id,
            this.add
              .text(0, 0, '', {
                fontFamily: 'Georgia',
                fontSize: '12px',
                color: '#f5e3b8',
                stroke: '#293e32',
                strokeThickness: 3,
              })
              .setOrigin(0.5),
          );
        }
        if (visual instanceof WoodsMonsterVisual) visual.sync(w, s.players, this.time.now, s.time);
        else visual.sync(w, s.players, this.time.now);
        this.labels
          .get(w.id)!
          .setVisible(w.hp > 0)
          .setText(
            `${WOODS_MONSTERS[w.monster ?? 'wolf'].name} · ${w.hp}/${w.maxHp ?? WOODS_MONSTERS[w.monster ?? 'wolf'].hp}`,
          )
          .setPosition(
            visual.container.x,
            w.y - (visual instanceof WoodsMonsterVisual ? visual.labelOffset : 78),
          );
      }
      for (const shot of s.projectiles ?? []) {
        alive.add(shot.id);
        let node = this.actors.get(shot.id);
        if (!node) {
          node = this.add.container(shot.x, shot.y).setDepth(12);
          if (shot.empowered) {
            const kind = shot.kind === 'arrow' ? 'bow' : 'staff';
            const fx = fitArtwork(
              this.add.sprite(0, 0, `special-${kind}`, 'fx-2'),
              kind === 'bow' ? 110 : 48,
              kind === 'bow' ? 64 : 48,
            ).setName('empowered-projectile-effect');
            themeWeaponEffect(
              fx,
              shot.weapon ?? s.players.find((p) => p.id === shot.owner)?.weapon,
            );
            fx.play(`special-${kind}-flight`);
            node.add(fx);
            this.actors.set(shot.id, node);
          } else {
            const g = this.add.graphics();
            if (shot.kind === 'arrow') {
              g.lineStyle(2, 0xebdab0);
              g.lineBetween(-12, 0, 10, 0);
              g.fillStyle(0xd4e7e3);
              g.fillTriangle(7, -4, 16, 0, 7, 4);
            } else {
              g.fillStyle(0x63b4e3, 0.25);
              g.fillCircle(0, 0, 11);
              g.fillStyle(0x8bd9f2);
              g.fillCircle(0, 0, 5);
              g.fillStyle(0xe9ffff);
              g.fillCircle(-1, -1, 2);
            }
            node.add(g);
            this.actors.set(shot.id, node);
          }
        }
        node.x = Phaser.Math.Linear(node.x, shot.x, 0.75);
        node.y = shot.y;
        node.scaleX = shot.vx < 0 ? -1 : 1;
      }
      for (const d of s.drops) {
        alive.add(d.id);
        if (!this.actors.has(d.id)) this.actors.set(d.id, groundLoot(this, d, bridge.id));
      }
      for (const [key, c] of this.actors)
        if (!alive.has(key)) {
          c.destroy();
          this.actors.delete(key);
          this.labels.get(key)?.destroy();
          this.labels.delete(key);
        }
    }
    update(time: number) {
      const s = bridge.snapshot;
      if (!s) return;
      if (s.mapId !== this.map.id) {
        parent.setAttribute('aria-busy', 'true');
        bridge.held = {};
        // Replace scene objects after this update; retain the renderer, textures and clips.
        queueMicrotask(() => {
          if (destroyed) return;
          game.scene.remove('realm');
          game.scene.add('realm', new RealmScene(), true);
        });
        return;
      }
      this.sync(s);
      this.housing?.update(s.players.find((p) => p.id === bridge.id));
      this.interior?.update(s.players.find((p) => p.id === bridge.id));
      if (this.interior) {
        this.furniturePlacement ??= new FurniturePlacement(this, this.map);
        this.furniturePlacement.update(
          s.players.find((p) => p.id === bridge.id),
          bridge.furniturePlacement,
        );
      }
      if (this.time.now >= this.nextPrepareAt && !this.load.isLoading()) {
        this.nextPrepareAt = this.time.now + 1000;
        const p = s.players.find((p) => p.id === bridge.id);
        const portal =
          p &&
          this.map.portals.find(
            (portal) =>
              Math.abs(portal.x - p.x) < 400 &&
              Math.abs(portal.y - p.y) < 220 &&
              (!portal.key || (p.inventory[portal.key] ?? 0) > 0),
          );
        if (portal) this.prepareMap(portal.target);
      }
      if (this.map.monster && WOODS_MONSTERS[this.map.monster].boss) {
        const zoom = this.scale.width < 700 ? 0.62 : 0.95;
        if (this.cameras.main.zoom !== zoom) this.cameras.main.setZoom(zoom);
      }
      this.woods?.refresh();
      this.crystal?.refresh();
      this.murkmire?.refresh();
      this.frostfall?.refresh();
      this.village?.refresh();
      this.interior?.refresh();
      if (!this.keys) return;
      const focus = document.activeElement?.tagName;
      const typing = focus === 'INPUT' || focus === 'TEXTAREA' || focus === 'SELECT';
      const i = idleInput();
      if (!typing && !bridge.blocked) {
        i.left = this.keys.A.isDown || this.keys.LEFT.isDown;
        i.right = this.keys.D.isDown || this.keys.RIGHT.isDown;
        i.up = this.keys.W.isDown || this.keys.UP.isDown;
        i.down = this.keys.S.isDown || this.keys.DOWN.isDown;
        i.jump = this.keys.SPACE.isDown;
        i.attack = this.keys.J.isDown;
        i.skill = this.keys.K.isDown;
        i.interact = this.keys.E.isDown;
      }
      if (!bridge.blocked) Object.assign(i, bridge.held);
      const encoded = JSON.stringify(i);
      if (time - this.lastSend > 50 || encoded !== this.lastInput) {
        bridge.send('input', i);
        if (i.interact && !JSON.parse(this.lastInput || '{}').interact)
          bridge.send('interact', null);
        this.lastSend = time;
        this.lastInput = encoded;
      }
    }
  }
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: '#aec6ae',
    scale: { mode: Phaser.Scale.RESIZE, width: parent.clientWidth, height: parent.clientHeight },
    physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, debug: false } },
    scene: RealmScene,
    render: { antialias: true },
    audio: { noAudio: true },
  });
  const prepare = (id: string) => {
    const scene = game.scene.getScene('realm') as RealmScene | undefined;
    if (scene?.sys.isActive()) scene.prepareMap(id);
  };
  bridge.prepareMap = prepare;
  const resize = new ResizeObserver(() => {
    if (parent.clientWidth && parent.clientHeight)
      game.scale.resize(parent.clientWidth, parent.clientHeight);
  });
  resize.observe(parent);
  game.events.once(Phaser.Core.Events.DESTROY, () => {
    destroyed = true;
    if (bridge.prepareMap === prepare) delete bridge.prepareMap;
    resize.disconnect();
  });
  return game;
}
