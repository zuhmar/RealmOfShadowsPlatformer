import { BATTLEGROUND_RULES, WOODS_MONSTERS } from '@ros/game-data';
import { playerAttributes } from './combat-skills';
import { grantXp, idleInput, type World, type Player, type Input, type Wolf } from './index';
export type BattlegroundStatus = {
  phase: 'waiting' | 'countdown' | 'fighting' | 'intermission' | 'finished';
  groupId: string;
  leaderId: string;
  ready: boolean;
  eliminated: boolean;
  wave: number;
  totalWaves: number;
  endsAt: number;
  result?: string;
  rewardGold?: number;
};
export class BattlegroundRun {
  phase: BattlegroundStatus['phase'] = 'waiting';
  wave = 0;
  endsAt = 0;
  deadline = 0;
  groupId: string;
  leaderId: string;
  result?: string;
  rewarded = false;
  roster: string[] = [];
  eliminated = new Set<string>();
  constructor(
    private world: World,
    groupId: string,
    leaderId = groupId,
  ) {
    this.groupId = groupId;
    this.leaderId = leaderId;
  }
  join(p: Player) {
    delete p.battleground;
    p.auto = false;
    if (this.phase !== 'waiting' && this.phase !== 'finished') {
      this.eliminated.add(p.id);
      p.hp = 0;
    }
    if (this.phase === 'finished') {
      p.hp = playerAttributes(p).maxHealth;
      p.mp = playerAttributes(p).maxMana;
    }
    p.x = 180 + this.world.players.size * 70;
    p.y = 820;
    p.grounded = true;
    p.platform = 'ground';
    this.publish();
  }
  ready(p: Player, ready: boolean) {
    if (this.phase !== 'waiting') return;
    p.battleground = { ...this.status(p), ready };
    this.publish();
  }
  start(p: Player, now: number) {
    if (this.phase !== 'waiting' || p.id !== this.leaderId)
      throw new Error('Only the party leader can start a waiting expedition.');
    const players = [...this.world.players.values()];
    if (players.some((q) => q.id !== p.id && !q.battleground?.ready))
      throw new Error('Every party member must press Ready first.');
    this.roster = players.map((q) => q.id);
    this.phase = 'countdown';
    this.endsAt = now + BATTLEGROUND_RULES.countdownMs;
    this.deadline = now + BATTLEGROUND_RULES.runMs;
    this.eliminated.clear();
    for (const q of players) {
      q.hp = playerAttributes(q).maxHealth;
      q.mp = playerAttributes(q).maxMana;
      q.auto = false;
      delete q.gathering;
      q.lastHit = now;
      q.lastSkill = 0;
      q.nextAttackAt = 0;
    }
    this.publish();
  }
  status(p: Player): BattlegroundStatus {
    return {
      phase: this.phase,
      groupId: this.groupId,
      leaderId: this.leaderId,
      ready: this.phase === 'waiting' ? !!p.battleground?.ready : false,
      eliminated: this.eliminated.has(p.id),
      wave: this.wave,
      totalWaves: BATTLEGROUND_RULES.waves,
      endsAt: this.endsAt,
      result: this.result,
      rewardGold:
        this.rewarded && this.roster.includes(p.id) ? BATTLEGROUND_RULES.rewardGold : undefined,
    };
  }
  publish() {
    for (const p of this.world.players.values()) p.battleground = this.status(p);
  }
  step(now: number) {
    if (this.phase === 'waiting' || this.phase === 'finished') {
      for (const p of this.world.players.values()) p.auto = false;
      return;
    }
    if (now >= this.deadline) {
      this.finish(false, 'Time limit reached', now);
      return;
    }
    const active = this.roster.filter(
      (id) => this.world.players.has(id) && !this.eliminated.has(id),
    );
    if (!active.length) {
      this.finish(false, 'The expedition fell', now);
      return;
    }
    for (const p of this.world.players.values()) {
      p.auto = false;
      if (this.eliminated.has(p.id)) p.lastHit = now;
    }
    if ((this.phase === 'countdown' || this.phase === 'intermission') && now >= this.endsAt)
      this.spawnWave(now);
    else if (this.phase === 'fighting' && this.world.wolves.every((w) => w.hp <= 0)) {
      if (this.wave >= BATTLEGROUND_RULES.waves) this.finish(true, 'All ten waves cleared!', now);
      else {
        this.phase = 'intermission';
        this.endsAt = now + BATTLEGROUND_RULES.breakMs;
        this.world.projectiles = [];
        this.publish();
      }
    }
  }
  spawnWave(now: number) {
    this.wave++;
    this.phase = 'fighting';
    this.endsAt = this.deadline;
    this.world.projectiles = [];
    const party = this.roster.length,
      count = this.wave === 10 ? 1 : Math.min(14, 3 + this.wave + Math.floor((party - 1) * 1.5));
    const kinds = ['frost-wolf', 'ice-troll', 'frozen-wraith'] as const;
    this.world.wolves = Array.from({ length: count }, (_, i) => {
      const monster =
          this.wave === 10
            ? 'frost-giant'
            : kinds[(i + this.wave - 1) % Math.min(3, Math.ceil(this.wave / 2))],
        stats = WOODS_MONSTERS[monster];
      const platform = this.world.map.platforms[i % 3 === 0 && this.wave !== 10 ? 1 + (i % 2) : 0];
      const x =
          platform.id === 'ground'
            ? 650 + ((i * 137) % 1450)
            : platform.x + 100 + ((i * 97) % (platform.width - 200)),
        scale = (0.45 + (this.wave - 1) * 0.035) * (1 + (party - 1) * 0.45);
      return {
        id: `wave-${this.wave}-${i}`,
        monster,
        x,
        y: platform.y,
        homeX: x,
        homeY: platform.y,
        platform: platform.id,
        hp: Math.round(stats.hp * scale),
        maxHp: Math.round(stats.hp * scale),
        damageScale: 1 + (this.wave - 1) * 0.035,
        deadUntil: 0,
        lastAttack: now,
        state: 'idle',
        killer: null,
      } satisfies Wolf;
    });
    this.publish();
  }
  input(p: Player, input: Input) {
    return this.phase === 'countdown' || (this.eliminated.has(p.id) && this.phase !== 'finished')
      ? idleInput()
      : input;
  }
  knockout(p: Player, now: number) {
    p.hp = 0;
    p.vx = 0;
    p.vy = 0;
    p.auto = false;
    this.eliminated.add(p.id);
    this.publish();
    if (this.roster.every((id) => !this.world.players.has(id) || this.eliminated.has(id)))
      this.finish(false, 'The expedition fell', now);
  }
  killed(w: Wolf) {
    w.state = 'dead';
    w.deadUntil = Number.MAX_SAFE_INTEGER;
    delete w.special;
  }
  depart(p: Player, now: number) {
    this.eliminated.add(p.id);
    delete p.battleground;
    if (this.phase === 'waiting' && p.id === this.leaderId) {
      this.leaderId = [...this.world.players.keys()].find((id) => id !== p.id) ?? this.groupId;
      this.publish();
    } else if (
      this.phase !== 'waiting' &&
      this.phase !== 'finished' &&
      this.roster.every(
        (id) => id === p.id || !this.world.players.has(id) || this.eliminated.has(id),
      )
    )
      this.finish(false, 'The expedition ended', now);
    delete p.battleground;
  }
  finish(won: boolean, result: string, now: number) {
    if (this.phase === 'finished' || this.phase === 'waiting') return;
    this.phase = 'finished';
    this.result = result;
    this.endsAt = now;
    this.world.wolves = [];
    this.world.projectiles = [];
    if (won && !this.rewarded) {
      this.rewarded = true;
      for (const p of this.world.players.values())
        if (this.roster.includes(p.id)) {
          p.gold += BATTLEGROUND_RULES.rewardGold;
          grantXp(p, BATTLEGROUND_RULES.rewardXp);
          this.world.events.push({
            type: 'loot',
            x: p.x,
            y: p.y - 80,
            text: 'Battleground cleared!',
            lootGold: BATTLEGROUND_RULES.rewardGold,
            playerId: p.id,
          });
        }
    }
    for (const p of this.world.players.values()) {
      p.hp = playerAttributes(p).maxHealth;
      p.mp = playerAttributes(p).maxMana;
      p.auto = false;
    }
    this.publish();
  }
}
