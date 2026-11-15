import { reducedEffects, setReducedEffects } from './visual-settings';
import { useState } from 'react';
import { realmAudio, type AudioSettings as Settings } from './audio';
export function AudioSettings() {
  const [reduced, setReduced] = useState(reducedEffects);
  const [settings, set] = useState(realmAudio.settings);
  const update = (value: Partial<Settings>) => {
    realmAudio.setSettings(value);
    set({ ...realmAudio.settings });
  };
  return (
    <section className="audio-settings">
      <h3>Sound & music</h3>
      <label>
        <input
          type="checkbox"
          checked={settings.muted}
          onChange={(e) => update({ muted: e.target.checked })}
        />
        Mute all audio
      </label>
      <label>
        <input
          type="checkbox"
          checked={settings.effects}
          onChange={(e) => update({ effects: e.target.checked })}
        />
        Sound effects
      </label>
      <label>
        <input
          type="checkbox"
          checked={settings.music}
          onChange={(e) => update({ music: e.target.checked })}
        />
        Ambient music
      </label>
      <label>
        Volume
        <input
          aria-label="Audio volume"
          type="range"
          min="0"
          max="100"
          value={Math.round(settings.volume * 100)}
          onChange={(e) => update({ volume: Number(e.target.value) / 100 })}
        />
        {Math.round(settings.volume * 100)}%
      </label>
      {(['effectsVolume', 'musicVolume'] as const).map((key) => (
        <label key={key}>
          {key === 'effectsVolume' ? 'Effects volume' : 'Music volume'}
          <input
            type="range"
            min="0"
            max="100"
            aria-label={key === 'effectsVolume' ? 'Effects volume' : 'Music volume'}
            value={Math.round(settings[key] * 100)}
            onChange={(e) => update({ [key]: Number(e.target.value) / 100 })}
          />
          {Math.round(settings[key] * 100)}%
        </label>
      ))}
      <h3>Display</h3>
      <label>
        <input
          type="checkbox"
          checked={reduced}
          onChange={(e) => {
            setReduced(e.target.checked);
            setReducedEffects(e.target.checked);
          }}
        />
        Reduced visual effects
      </label>
      <small>
        Reduces decorative motion and weapon bursts. Enemy attack warnings stay visible.
      </small>
      <small>
        Audio starts after your first tap or key press. Settings are saved on this device.
      </small>
    </section>
  );
}
