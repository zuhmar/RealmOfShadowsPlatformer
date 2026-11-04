import type { Event } from '@ros/shared';
export type AudioSettings = { effects: boolean; music: boolean; muted: boolean; volume: number };
const defaults: AudioSettings = { effects: true, music: false, muted: false, volume: 0.35 };
class RealmAudio {
  settings: AudioSettings;
  private context?: AudioContext;
  private master?: GainNode;
  private musicGain?: GainNode;
  private biome: string | null = null;
  private musicTimer?: ReturnType<typeof setInterval>;
  private voices = 0;
  private lastEffect = -1000;
  private played = 0;
  private musicVoices = new Set<OscillatorNode>();
  constructor() {
    let stored: any;
    try {
      stored = JSON.parse(localStorage.getItem('ros-audio') ?? '{}');
    } catch {
      stored = {};
    }
    this.settings = {
      effects: typeof stored?.effects === 'boolean' ? stored.effects : defaults.effects,
      music: stored?.music === true,
      muted: stored?.muted === true,
      volume: Number.isFinite(stored?.volume)
        ? Math.max(0, Math.min(1, stored.volume))
        : defaults.volume,
    };
  }
  bind() {
    const unlock = () => void this.unlock();
    const visibility = () => {
      if (document.hidden) {
        void this.context?.suspend();
        this.stopMusic();
      } else void this.unlock();
    };
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('keydown', unlock);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      document.removeEventListener('visibilitychange', visibility);
      this.stopMusic();
      void this.context?.suspend();
    };
  }
  async unlock() {
    if (document.hidden) return;
    if (!this.context) {
      const Audio =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Audio) return;
      this.context = new Audio();
      this.master = this.context.createGain();
      this.master.connect(this.context.destination);
      this.musicGain = this.context.createGain();
      this.musicGain.connect(this.master);
      this.applyVolume();
    }
    try {
      if (this.context.state === 'suspended') await this.context.resume();
      this.startMusic();
    } catch {}
  }
  setSettings(value: Partial<AudioSettings>) {
    this.settings = { ...this.settings, ...value };
    this.settings.volume = Math.max(
      0,
      Math.min(1, Number.isFinite(this.settings.volume) ? this.settings.volume : defaults.volume),
    );
    localStorage.setItem('ros-audio', JSON.stringify(this.settings));
    this.applyVolume();
    this.stopMusic();
    void this.unlock();
  }
  setBiome(id: string | null) {
    if (id === this.biome) return;
    this.biome = id;
    this.stopMusic();
    this.startMusic();
  }
  private applyVolume() {
    if (this.master && this.context)
      this.master.gain.setTargetAtTime(
        this.settings.muted ? 0 : this.settings.volume,
        this.context.currentTime,
        0.025,
      );
  }
  private tone(frequency: number, duration: number, delay = 0, music = false) {
    const c = this.context;
    if (!c || c.state !== 'running' || this.settings.muted || (!music && this.voices >= 8)) return;
    const osc = c.createOscillator(),
      gain = c.createGain(),
      at = c.currentTime + delay;
    osc.type = music ? 'sine' : 'triangle';
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(music ? 0.025 : 0.1, at + (music ? 0.7 : 0.008));
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    osc.connect(gain);
    gain.connect(music ? this.musicGain! : this.master!);
    if (music) this.musicVoices.add(osc);
    else this.voices++;
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
      if (music) this.musicVoices.delete(osc);
      else this.voices = Math.max(0, this.voices - 1);
    };
    osc.start(at);
    osc.stop(at + duration + 0.01);
  }
  private startMusic() {
    if (
      this.musicTimer ||
      !this.biome ||
      !this.settings.music ||
      this.settings.muted ||
      document.hidden ||
      this.context?.state !== 'running'
    )
      return;
    let step = 0;
    const play = () => {
      const root = this.biome!.startsWith('crystal')
        ? 146.83
        : this.biome === 'village'
          ? 130.81
          : 110;
      const shift = [1, 0.89, 0.75, 1][step++ % 4];
      for (const ratio of [1, 1.1892, 1.4983]) this.tone(root * ratio * shift, 8, 0, true);
    };
    play();
    this.musicTimer = setInterval(play, 10000);
  }
  private stopMusic() {
    if (this.musicTimer) clearInterval(this.musicTimer);
    this.musicTimer = undefined;
    for (const osc of this.musicVoices) {
      try {
        osc.stop();
      } catch {}
    }
    this.musicVoices.clear();
  }
  event(e: Event, localId: string) {
    if (!this.settings.effects || this.settings.muted || document.hidden) return;
    if (e.playerId && e.playerId !== localId) return;
    if (e.type === 'loot' && e.lootStage === 'drop') return;
    const now = performance.now();
    if (now - this.lastEffect < 45) return;
    this.lastEffect = now;
    const notes =
      e.type === 'level'
        ? [523.25, 659.25, 783.99]
        : e.type === 'bossAttack'
          ? [55, 82.4]
          : e.type === 'loot'
            ? [880, 1174]
            : e.type === 'skill'
              ? e.skill === 'staff'
                ? [440, 660]
                : e.skill === 'bow'
                  ? [660, 880]
                  : [180, 240]
              : e.type === 'respawn'
                ? [196, 130.8]
                : e.type === 'kill'
                  ? [293.66, 392]
                  : [e.playerId ? 110 : 240];
    for (const [i, n] of notes.entries()) this.tone(n, e.type === 'level' ? 0.4 : 0.16, i * 0.055);
    if (this.context?.state === 'running') this.played++;
  }
  get stats() {
    return {
      state: this.context?.state ?? 'locked',
      activeVoices: this.voices,
      effectsPlayed: this.played,
      musicActive: !!this.musicTimer,
      settings: { ...this.settings },
    };
  }
}
export const realmAudio = new RealmAudio();
