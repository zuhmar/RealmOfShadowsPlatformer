import { ARENA_RULES, weaponProfile, weaponKind } from '@ros/game-data';
import { playerAttributes, attackPower } from './combat-skills';
import { classSkillEvolution } from './classes';
import type { World, Player, Input } from './index';
export type ArenaStatus = {
  phase: 'waiting' | 'countdown' | 'fighting' | 'finished';
  ready: boolean;
  participant: boolean;
  endsAt: number;
  maxHealth: number;
  winnerId?: string;
  result?: string;
};
/** One room is one duel. No PvE loot, XP, quest credit, wagers or ranked rewards. */
export class ArenaDuel {
  phase: ArenaStatus['phase'] = 'waiting';
  endsAt = 0;
  roster: string[] = [];
  winnerId?: string;
  result?: string;
  private strikes: {
    owner: string;
    target: string;
    at: number;
    damage: number;
    critical: boolean;
  }[] = [];
  constructor(private world: World) {}
  join(p: Player) {
    delete p.arena;
    p.x = this.world.players.size > 1 ? 1520 : 280;
    p.y = 820;
    p.platform = 'ground';
    p.facing = p.x < 900 ? 1 : -1;
    this.publish();
  }
  ready(p: Player, value: boolean, now: number) {
    if (this.phase !== 'waiting' || !this.world.players.has(p.id)) return;
    p.arena = {
      phase: this.phase,
      endsAt: 0,
      ready: value,
      participant: false,
      maxHealth: playerAttributes(p).maxHealth,
    };
    const players = [...this.world.players.values()];
    if (players.length === 2 && players.every((p) => p.arena?.ready)) {
      this.roster = players.map((p) => p.id);
      this.phase = 'countdown';
      this.endsAt = now + ARENA_RULES.countdownMs;
      players.forEach((p, i) => {
        Object.assign(p, {
          x: i ? 1520 : 280,
          y: 820,
          vx: 0,
          vy: 0,
          grounded: true,
          climbing: false,
          platform: 'ground',
          facing: i ? -1 : 1,
        });
        this.restore(p, now);
      });
    }
    this.publish();
  }
  private restore(p: Player, now: number) {
    p.hp = playerAttributes(p).maxHealth;
    p.mp = playerAttributes(p).maxMana;
    p.lastAttack = 0;
    p.nextAttackAt = 0;
    p.lastSkill = 0;
    p.lastHit = now;
    p.auto = false;
    p.targetId = null;
    delete p.gathering;
  }
  publish() {
    for (const p of this.world.players.values())
      p.arena = {
        maxHealth: playerAttributes(p).maxHealth,
        participant: this.roster.includes(p.id),
        phase: this.phase,
        ready: this.phase === 'waiting' ? !!p.arena?.ready : false,
        endsAt: this.endsAt,
        winnerId: this.winnerId,
        result: this.result,
      };
  }
  step(now: number) {
    if (
      (this.phase === 'countdown' || this.phase === 'fighting') &&
      this.roster.some((id) => !this.world.players.has(id))
    ) {
      this.finish(
        this.roster.find((id) => this.world.players.has(id)),
        'Opponent left the arena',
        now,
      );
    }
    if (this.phase === 'countdown' && now >= this.endsAt) {
      this.phase = 'fighting';
      this.endsAt = now + ARENA_RULES.matchMs;
      for (const p of this.world.players.values()) this.restore(p, now);
      this.world.projectiles = [];
      this.publish();
    } else if (this.phase === 'fighting' && now >= this.endsAt)
      this.finish(undefined, 'Time limit · draw', now);
    else if (this.phase === 'finished' && now >= this.endsAt) {
      this.phase = 'waiting';
      this.endsAt = 0;
      this.roster = [];
      this.winnerId = undefined;
      this.result = undefined;
      this.publish();
    }
    for (const p of this.world.players.values()) {
      p.auto = false;
      if (this.phase === 'fighting') p.lastHit = now;
    }
    const pending = this.strikes;
    this.strikes = [];
    for (const strike of pending) {
      if (this.phase !== 'fighting') break;
      if (now < strike.at) {
        this.strikes.push(strike);
        continue;
      }
      const owner = this.world.players.get(strike.owner),
        target = this.world.players.get(strike.target);
      if (owner && target && this.inReach(owner, target, true)) {
        this.damage(owner, target, strike.damage, now, strike.critical);
        this.world.events.push({
          type: 'skill',
          skill: 'dagger',
          weapon: owner.weapon,
          phase: 'impact',
          facing: owner.facing,
          x: target.x,
          y: target.y - 30,
          text: '',
        });
      }
    }
  }
  input(input: Input): Input {
    return this.phase === 'countdown'
      ? {
          left: false,
          right: false,
          up: false,
          down: false,
          jump: false,
          attack: false,
          skill: false,
          interact: false,
        }
      : input;
  }
  opponent(p: Player) {
    if (this.phase !== 'fighting' || !this.roster.includes(p.id)) return undefined;
    return [...this.world.players.values()].find(
      (q) => q.id !== p.id && this.roster.includes(q.id),
    );
  }
  private inReach(p: Player, target: Player, empowered: boolean) {
    return (
      Math.abs(target.y - p.y) < 55 &&
      Math.abs(target.x - p.x) <
        weaponProfile(p.weapon).range + (empowered ? classSkillEvolution(p).meleeReach : 0) &&
      (target.x - p.x) * p.facing >= -12
    );
  }
  melee(p: Player, damage: number, empowered: boolean, critical: boolean, now: number) {
    const target = this.opponent(p);
    if (!target || !this.inReach(p, target, empowered)) return;
    if (empowered && weaponKind(p.weapon) === 'dagger') {
      const e = classSkillEvolution(p),
        stats = playerAttributes(p);
      damage = Math.round(attackPower(p) * e.flurryMultiplier * (critical ? stats.critDamage : 1));
      for (let i = 1; i < e.flurryStrikes; i++)
        this.strikes.push({ owner: p.id, target: target.id, at: now + i * 110, damage, critical });
    }
    this.damage(p, target, damage, now, critical);
  }
  projectiles(dt: number, now: number) {
    this.world.projectiles = this.world.projectiles.filter((shot) => {
      const owner = this.world.players.get(shot.owner),
        target = owner && this.opponent(owner);
      if (!owner || !target) return false;
      const before = shot.x,
        end = shot.startX + Math.sign(shot.vx) * shot.range;
      shot.x =
        shot.vx > 0 ? Math.min(end, before + shot.vx * dt) : Math.max(end, before + shot.vx * dt);
      if (
        shot.y >= target.y - 60 &&
        shot.y <= target.y &&
        target.x + 23 >= Math.min(before, shot.x) &&
        target.x - 23 <= Math.max(before, shot.x)
      ) {
        this.damage(owner, target, shot.damage, now, !!shot.critical);
        if (shot.empowered && shot.kind === 'orb')
          this.world.events.push({
            type: 'skill',
            skill: 'staff',
            weapon: shot.weapon,
            phase: 'impact',
            x: target.x,
            y: target.y - 30,
            text: '',
          });
        return false;
      }
      return Math.abs(shot.x - shot.startX) < shot.range;
    });
  }
  damage(owner: Player, target: Player, amount: number, now: number, critical = false) {
    if (this.phase !== 'fighting' || this.opponent(owner)?.id !== target.id || target.hp <= 0)
      return;
    const stats = playerAttributes(target);
    if (Math.random() < stats.dodgeChance) {
      this.world.events.push({
        type: 'hit',
        x: target.x,
        y: target.y - 55,
        text: 'Dodge!',
        playerId: target.id,
      });
      return;
    }
    const blocked = Math.random() < stats.blockChance;
    amount = Math.max(
      1,
      Math.round(Math.max(1, amount - stats.armor) * (blocked ? 1 - stats.blockReduction : 1)),
    );
    target.hp = Math.max(0, target.hp - amount);
    target.lastHit = now;
    this.world.events.push({
      type: 'hit',
      x: target.x,
      y: target.y - 55,
      text: `${blocked ? 'Block ' : ''}−${amount}${critical ? ' CRIT!' : ''}`,
      critical,
      playerId: target.id,
    });
    if (!target.hp) this.finish(owner.id, 'Knockout', now);
  }
  depart(p: Player, now: number) {
    if ((this.phase === 'fighting' || this.phase === 'countdown') && this.roster.includes(p.id))
      this.finish(
        this.roster.find((id) => id !== p.id && this.world.players.has(id)),
        'Opponent forfeited',
        now,
      );
    delete p.arena;
    if (this.phase === 'waiting')
      for (const other of this.world.players.values()) if (other.arena) other.arena.ready = false;
  }
  finish(winner: string | undefined, result: string, now: number) {
    if (this.phase !== 'countdown' && this.phase !== 'fighting') return;
    this.phase = 'finished';
    this.winnerId = winner;
    this.result = result;
    this.endsAt = now + ARENA_RULES.resultMs;
    this.world.projectiles = [];
    this.strikes = [];
    for (const p of this.world.players.values()) this.restore(p, now);
    this.publish();
  }
}
