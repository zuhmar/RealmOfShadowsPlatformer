import Phaser from 'phaser';
import { VillageScenery, preloadVillage } from './village';
import { WoodsScenery, preloadWoods } from './woods';
import { CharacterVisual, preloadCharacters, registerCharacters } from './character';
import { WolfVisual, registerWolfAnimations, WOLF_TEXTURE, WOLF_FRAME_SIZE } from './wolf';
import { MAPS, RULES, weaponKind, type GameMap } from '@ros/game-data';
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
  send: (type: string, data: unknown) => void;
  onReady?: () => void;
};
export function mountGame(parent: HTMLElement, bridge: Bridge) {
  parent.setAttribute('aria-busy', 'true');
  class RealmScene extends Phaser.Scene {
    map!: GameMap;
    actors = new Map<string, Phaser.GameObjects.Container>();
    labels = new Map<string, Phaser.GameObjects.Text>();
    keys!: Record<string, Phaser.Input.Keyboard.Key>;
    lastSend = 0;
    lastInput = '';
    floor!: Phaser.Physics.Arcade.StaticGroup;
    playerBody?: Phaser.Physics.Arcade.Sprite;
    wolves = new Map<string, WolfVisual>();
    characters = new Map<string, CharacterVisual>();
    woods?: WoodsScenery;
    village?: VillageScenery;
    miraMarker?: Phaser.GameObjects.Text;
    constructor() {
      super('realm');
    }
    preload() {
      preloadCharacters(this);
      if (bridge.snapshot?.mapId === 'woods') preloadWoods(this);
      else preloadVillage(this);
      this.load.json('wolf-config', '/assets/monsters/wolf-spritesheet.json');
      this.load.spritesheet(WOLF_TEXTURE, '/assets/monsters/wolf-spritesheet.png', {
        frameWidth: WOLF_FRAME_SIZE,
        frameHeight: WOLF_FRAME_SIZE,
      });
    }
    create() {
      registerWolfAnimations(this);
      registerCharacters(this);
      const id = bridge.snapshot?.mapId ?? 'village';
      this.map = MAPS[id];
      this.cameras.main.setBackgroundColor(id === 'woods' ? '#b6c9b2' : '#c1d6c5');
      this.cameras.main.setBounds(0, 0, this.map.width, this.map.height);
      this.physics.world.setBounds(0, 0, this.map.width, this.map.height);
      this.drawWorld();
      this.keys = this.input.keyboard!.addKeys(
        'A,D,W,S,SPACE,J,K,E,LEFT,RIGHT,UP,DOWN',
        false,
      ) as typeof this.keys;
      this.events.on('float', (e: Event) => {
        if (e.type === 'respawn' && e.playerId)
          this.characters.get(e.playerId)?.die(e.deathX, e.deathY);
        const t = this.add
          .text(e.x, e.y, e.text, {
            fontFamily: 'Georgia',
            fontSize: e.type === 'level' ? '25px' : '18px',
            color: e.type === 'hit' ? '#fff4d5' : '#ffe69b',
            stroke: '#243b32',
            strokeThickness: 4,
          })
          .setOrigin(0.5)
          .setDepth(50);
        this.tweens.add({
          targets: t,
          y: e.y - 65,
          alpha: 0,
          duration: 1300,
          onComplete: () => t.destroy(),
        });
      });
      parent.setAttribute('aria-busy', 'false');
      bridge.onReady?.();
    }
    drawWorld() {
      const m = this.map;
      const woods = m.id === 'woods';
      if (woods) this.woods = new WoodsScenery(this, m);
      else this.village = new VillageScenery(this, m);
      const g = this.add.graphics();
      this.floor = this.physics.add.staticGroup();
      for (const p of m.platforms) {
        const body = this.add.rectangle(p.x + p.width / 2, p.y + 12, p.width, 24, 0, 0);
        this.physics.add.existing(body, true);
        this.floor.add(body);
      }
      for (const p of m.portals) {
        g.lineStyle(8, 0x57634a);
        g.strokeRoundedRect(p.x - 36, p.y - 113, 72, 113, 35);
        g.fillStyle(0x8cddca, 0.3);
        g.fillEllipse(p.x, p.y - 55, 59, 103);
        g.lineStyle(3, 0xc5fff0, 0.9);
        g.strokeEllipse(p.x, p.y - 55, 46, 90);
        const glow = this.add.ellipse(p.x, p.y - 55, 25, 68, 0x9cf7df, 0.4);
        this.tweens.add({
          targets: glow,
          alpha: 0.1,
          scaleX: 1.5,
          duration: 1600,
          yoyo: true,
          repeat: -1,
        });
        this.add
          .text(p.x, p.y - 140, p.label, {
            fontSize: '14px',
            fontFamily: 'Georgia',
            color: '#fff5d5',
            stroke: '#294736',
            strokeThickness: 4,
          })
          .setOrigin(0.5);
      }
      for (const npc of m.npcs) {
        const c =
          npc.id === 'mira'
            ? this.add
                .sprite(npc.x, npc.y, 'mira', 'idle-0')
                .setOrigin(0.5, 700 / 768)
                .setScale(0.11)
                .play('mira-idle')
            : this.character(npc.x, npc.y, 'sage', true);
        this.add
          .text(npc.x, npc.y - 80, `${npc.name}\n${npc.role}`, {
            fontFamily: 'Georgia',
            fontSize: '14px',
            color: '#f6e9b6',
            align: 'center',
            stroke: '#263c31',
            strokeThickness: 4,
          })
          .setOrigin(0.5);
        c.setDepth(8);
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
      const alive = new Set<string>();
      const local = s.players.find((p) => p.id === bridge.id);
      if (local && this.miraMarker) {
        const status = questStatus(local);
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
      for (const p of s.players) {
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
          visual = new WolfVisual(this, w);
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
        visual.sync(w, s.players, this.time.now);
        this.labels
          .get(w.id)!
          .setVisible(w.hp > 0)
          .setText(`Wolf · ${w.hp}/${RULES.wolfHp}`)
          .setPosition(visual.container.x, w.y - 78);
      }
      for (const shot of s.projectiles ?? []) {
        alive.add(shot.id);
        let node = this.actors.get(shot.id);
        if (!node) {
          node = this.add.container(shot.x, shot.y).setDepth(12);
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
        node.x = Phaser.Math.Linear(node.x, shot.x, 0.75);
        node.y = shot.y;
        node.scaleX = shot.vx < 0 ? -1 : 1;
      }
      for (const d of s.drops) {
        alive.add(d.id);
        if (!this.actors.has(d.id)) {
          const c = this.add.container(d.x, d.y - 12);
          const kind = weaponKind(d.item);
          if (kind !== 'unarmed') {
            const icon = this.add.image(0, 0, 'elderwood-weapons', kind);
            icon.setScale(26 / Math.max(icon.width, icon.height));
            c.add(icon);
          } else c.add(this.add.star(0, 0, 4, 4, 10, 0xf3cf72).setStrokeStyle(2, 0x7d6542));
          this.actors.set(d.id, c);
        }
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
      if (s) this.sync(s);
      this.woods?.refresh();
      this.village?.refresh();
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
  return game;
}
