"use client";

import Link from "next/link";
import { useState } from "react";
import { LocalGame } from "./local-game";

type Mode = "lobby" | "local" | "private";

export function PlayLobby() {
  const [mode, setMode] = useState<Mode>("lobby");
  const [roomCode, setRoomCode] = useState("");
  const [notice, setNotice] = useState("");
  if (mode === "local") return <LocalGame onExit={() => setMode("lobby")} />;

  function createPrototypeRoom() {
    const code = Array.from(
      crypto.getRandomValues(new Uint8Array(6)),
      (value) => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[value % 32],
    ).join("");
    setRoomCode(code);
    setNotice(
      "Room link prepared. A connected realtime service is required before another browser can join.",
    );
  }

  return (
    <>
      <div className="play-mode-grid">
        <section className="play-mode-card primary-mode">
          <span className="mode-icon" aria-hidden="true">
            ♜
          </span>
          <div>
            <p className="eyebrow">AVAILABLE NOW</p>
            <h2>Local guided game</h2>
            <p>
              Two players share this device. The complete rules engine validates
              every move, with legal destinations, history, captures, and check
              warnings.
            </p>
          </div>
          <button
            className="button button-primary"
            type="button"
            onClick={() => setMode("local")}
          >
            Start local game →
          </button>
        </section>
        <section className="play-mode-card">
          <span className="mode-icon" aria-hidden="true">
            ↗
          </span>
          <div>
            <p className="eyebrow">PRIVATE ROOM</p>
            <h2>Play someone you know</h2>
            <p>
              Choose a clock, create a six-character room code, and share the
              link. Games are always casual for guests.
            </p>
          </div>
          <button
            className="button button-secondary"
            type="button"
            onClick={() => setMode(mode === "private" ? "lobby" : "private")}
          >
            Create or join
          </button>
        </section>
        <section className="play-mode-card">
          <span className="mode-icon" aria-hidden="true">
            ⚡
          </span>
          <div>
            <p className="eyebrow">QUICK MATCH</p>
            <h2>Find an opponent</h2>
            <p>
              Queue by time control. Rated mode unlocks after sign-in; the
              rating window expands gradually while you wait.
            </p>
          </div>
          <Link className="button button-secondary" href="/profile">
            Connect account
          </Link>
        </section>
      </div>
      {mode === "private" && (
        <section
          className="private-panel surface"
          aria-labelledby="private-title"
        >
          <div>
            <p className="eyebrow">PRIVATE GAMES</p>
            <h2 id="private-title">Create or join a room</h2>
            <p>
              Room codes avoid ambiguous characters and waiting rooms expire
              after 30 minutes.
            </p>
          </div>
          <div className="private-actions">
            <label className="form-field">
              <span>Time control</span>
              <select defaultValue="10">
                <option value="5">5 minutes</option>
                <option value="10">10 minutes</option>
                <option value="15">15 minutes + 10 seconds</option>
              </select>
            </label>
            <button
              className="button button-primary"
              type="button"
              onClick={createPrototypeRoom}
            >
              Prepare room link
            </button>
            <span className="or-divider">OR</span>
            <label className="form-field">
              <span>Room code</span>
              <input
                maxLength={6}
                inputMode="text"
                autoCapitalize="characters"
                placeholder="ABC234"
                aria-label="Six-character room code"
              />
            </label>
            <button
              className="button button-secondary"
              type="button"
              onClick={() =>
                setNotice(
                  "Joining requires the realtime game service. Run it locally or connect the production endpoint.",
                )
              }
            >
              Check room
            </button>
          </div>
          {roomCode && (
            <div className="room-result">
              <b>{roomCode}</b>
              <code>
                {typeof window !== "undefined"
                  ? `${window.location.origin}/game/${roomCode}`
                  : `/game/${roomCode}`}
              </code>
            </div>
          )}
          {notice && (
            <p className="inline-notice" role="status">
              {notice}
            </p>
          )}
        </section>
      )}
      <section className="play-footnote">
        <span aria-hidden="true">◎</span>
        <p>
          <strong>What “server-authoritative” means</strong>The connected game
          service—not either browser—decides legal moves, clocks, versions, and
          results. Duplicate or delayed commands cannot apply twice.
        </p>
      </section>
    </>
  );
}
