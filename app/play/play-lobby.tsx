"use client";

import { useState } from "react";
import { useLanguage } from "../i18n";
import { LocalGame } from "./local-game";
import { OnlineLobby } from "./online-lobby";

type Mode = "lobby" | "local";

export function PlayLobby({
  initialMode = "lobby",
  guided = false,
}: {
  initialMode?: Mode;
  guided?: boolean;
}) {
  const { t } = useLanguage();
  const [mode, setMode] = useState<Mode>(initialMode);
  if (mode === "local") {
    return <LocalGame solo={guided} onExit={() => setMode("lobby")} />;
  }

  return (
    <>
      <div className="play-mode-grid">
        <section className="play-mode-card primary-mode">
          <span className="mode-icon" aria-hidden="true">
            ♜
          </span>
          <div>
            <p className="eyebrow">{t("play.available")}</p>
            <h2>{t("play.localTitle")}</h2>
            <p>{t("play.localCopy")}</p>
          </div>
          <button
            className="button button-primary"
            type="button"
            onClick={() => setMode("local")}
          >
            {t("play.startLocal")}
          </button>
        </section>
      </div>
      <OnlineLobby />
      <section className="play-footnote">
        <span aria-hidden="true">◎</span>
        <p>
          <strong>{t("play.authorityTitle")}</strong>
          {t("play.authorityCopy")}
        </p>
      </section>
    </>
  );
}
