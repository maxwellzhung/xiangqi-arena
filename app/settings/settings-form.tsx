"use client";

import { useEffect, useState } from "react";
import { localeOptions, useLanguage } from "../i18n";

type Preferences = {
  pieces: "western" | "traditional";
  sound: boolean;
  coordinates: boolean;
  motion: boolean;
};
const defaults: Preferences = {
  pieces: "traditional",
  sound: true,
  coordinates: true,
  motion: true,
};

export function SettingsForm() {
  const { locale, setLocale, t } = useLanguage();
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
      <section className="surface language-settings">
        <h2>{t("language.heading")}</h2>
        <p>{t("language.copy")}</p>
        <div
          className="language-options"
          role="radiogroup"
          aria-label={t("language.label")}
        >
          {localeOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={locale === option.value}
              lang={option.value}
              onClick={() => setLocale(option.value)}
            >
              <span>{option.label}</span>
              {locale === option.value && <i aria-hidden="true">✓</i>}
            </button>
          ))}
        </div>
      </section>
      <section className="surface">
        <h2>{t("settings.pieces")}</h2>
        <p>{t("settings.piecesCopy")}</p>
        <div
          className="segmented"
          role="radiogroup"
          aria-label={t("settings.pieceDisplay")}
        >
          <button
            type="button"
            role="radio"
            aria-checked={prefs.pieces === "western"}
            onClick={() => setPrefs({ ...prefs, pieces: "western" })}
          >
            {t("settings.general")}
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={prefs.pieces === "traditional"}
            onClick={() => setPrefs({ ...prefs, pieces: "traditional" })}
          >
            {t("settings.traditional")}
          </button>
        </div>
      </section>
      <section className="surface">
        <h2>{t("settings.boardAids")}</h2>
        <Toggle
          label={t("settings.coordinates")}
          checked={prefs.coordinates}
          onChange={(coordinates) => setPrefs({ ...prefs, coordinates })}
        />
        <Toggle
          label={t("settings.sound")}
          checked={prefs.sound}
          onChange={(sound) => setPrefs({ ...prefs, sound })}
        />
        <Toggle
          label={t("settings.motion")}
          checked={prefs.motion}
          onChange={(motion) => setPrefs({ ...prefs, motion })}
        />
      </section>
      <button className="button button-primary" type="button" onClick={save}>
        {saved ? t("settings.saved") : t("settings.save")}
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
