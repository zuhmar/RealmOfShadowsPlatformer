import { useState } from 'react';
import { realmAudio, type AudioSettings as Settings } from './audio';
export function AudioSettings() {
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
      <small>
        Audio starts after your first tap or key press. Settings are saved on this device.
      </small>
    </section>
  );
}
