"use client";

import { useEffect, useState } from "react";

type Preferences = {
  pieces: "western" | "traditional";
  sound: boolean;
  coordinates: boolean;
  motion: boolean;
};
const defaults: Preferences = {
  pieces: "western",
  sound: true,
  coordinates: true,
  motion: true,
};

export function SettingsForm() {
  const [prefs, setPrefs] = useState(defaults);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    try {
      const value = localStorage.getItem("xiangqi-arena-preferences");
      if (value) {
        // Reading a device-local preference is the intended one-time hydration step.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setPrefs({ ...defaults, ...JSON.parse(value) });
      }
    } catch {
      /* private storage can be unavailable */
    }
  }, []);
  function save() {
    localStorage.setItem("xiangqi-arena-preferences", JSON.stringify(prefs));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  }
  return (
    <div className="settings-grid">
      <section className="surface">
        <h2>Pieces</h2>
        <p>
          Western labels use G, A, E, H, R, C, and S. Traditional mode uses
          Chinese characters.
        </p>
        <div className="segmented" role="radiogroup" aria-label="Piece display">
          <button
            type="button"
            role="radio"
            aria-checked={prefs.pieces === "western"}
            onClick={() => setPrefs({ ...prefs, pieces: "western" })}
          >
            G&nbsp; General
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={prefs.pieces === "traditional"}
            onClick={() => setPrefs({ ...prefs, pieces: "traditional" })}
          >
            帥&nbsp; Traditional
          </button>
        </div>
      </section>
      <section className="surface">
        <h2>Board aids</h2>
        <Toggle
          label="Show file and rank coordinates"
          checked={prefs.coordinates}
          onChange={(coordinates) => setPrefs({ ...prefs, coordinates })}
        />
        <Toggle
          label="Play move and clock sounds"
          checked={prefs.sound}
          onChange={(sound) => setPrefs({ ...prefs, sound })}
        />
        <Toggle
          label="Use interface motion"
          checked={prefs.motion}
          onChange={(motion) => setPrefs({ ...prefs, motion })}
        />
      </section>
      <button className="button button-primary" type="button" onClick={save}>
        {saved ? "Saved on this device ✓" : "Save preferences"}
      </button>
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="toggle-row">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <i aria-hidden="true" />
    </label>
  );
}
