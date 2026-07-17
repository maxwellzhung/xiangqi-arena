"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Color, ServerEvent, TimeControlId } from "@/packages/shared/src";
import { type TranslationKey, useLanguage } from "@/app/i18n";
import {
  configuredGameServerUrl,
  GameServerClient,
  GameServerError,
  saveActiveGame,
  stableRoomCommandId,
  type StreamStatus,
} from "@/app/lib/game-server-client";

type ConnectionState = "connecting" | "ready" | "unavailable" | "error";

const timeControls: Array<{ id: TimeControlId; label: TranslationKey }> = [
  { id: "blitz-5", label: "play.fiveMinutes" },
  { id: "rapid-10", label: "play.tenMinutes" },
  { id: "classic-15-10", label: "play.fifteenMinutes" },
];

function messageFor(error: unknown, fallback: string): string {
  if (error instanceof GameServerError) return error.message;
  return fallback;
}

export function OnlineLobby() {
  const { t } = useLanguage();
  const router = useRouter();
  const clientRef = useRef<GameServerClient | null>(null);
  const [connection, setConnection] = useState<ConnectionState>("connecting");
  const [streamStatus, setStreamStatus] = useState<StreamStatus>("closed");
  const [notice, setNotice] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [joinUrl, setJoinUrl] = useState("");
  const [timeControlId, setTimeControlId] = useState<TimeControlId>("rapid-10");
  const [queued, setQueued] = useState(false);
  const [busy, setBusy] = useState(false);
  const [displayName, setDisplayName] = useState("guest");

  const enterGame = useCallback(
    (gameId: string, color: Color) => {
      saveActiveGame({ gameId, color });
      router.push(`/game/${gameId}`);
    },
    [router],
  );

  const handleEvent = useCallback(
    (event: ServerEvent) => {
      switch (event.type) {
        case "roomCreated":
          setRoomCode(event.roomCode);
          setJoinUrl(event.joinUrl);
          setNotice(t("play.roomReady"));
          break;
        case "roomJoined":
        case "matchFound":
          setQueued(false);
          enterGame(event.gameId, event.color);
          break;
        case "protocolError":
          setNotice(event.message);
          break;
        default:
          break;
      }
    },
    [enterGame, t],
  );

  useEffect(() => {
    let stop = () => {};
    let cancelled = false;
    if (!configuredGameServerUrl) {
      // This mirrors an external deployment capability during initial hydration.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setConnection("unavailable");
      setNotice(t("play.serviceMissing"));
      return;
    }
    void GameServerClient.connect()
      .then(({ client, activeGame }) => {
        if (cancelled) return;
        clientRef.current = client;
        setDisplayName(client.session.player.displayName);
        setConnection("ready");
        if (activeGame) {
          enterGame(activeGame.snapshot.gameId, activeGame.color);
          return;
        }
        stop = client.listen(handleEvent, setStreamStatus);
      })
      .catch((error) => {
        if (cancelled) return;
        setConnection("error");
        setNotice(messageFor(error, t("play.serviceError")));
      });
    return () => {
      cancelled = true;
      stop();
    };
  }, [enterGame, handleEvent, t]);

  useEffect(() => {
    if (!queued || !clientRef.current) return;
    const interval = window.setInterval(() => {
      void clientRef.current?.command({
        type: "heartbeat",
        commandId: crypto.randomUUID(),
        sentAt: Date.now(),
      });
    }, 15_000);
    return () => window.clearInterval(interval);
  }, [queued]);

  useEffect(() => {
    if (connection !== "ready" || !clientRef.current) return;
    const interval = window.setInterval(() => {
      void clientRef.current
        ?.getActiveGame()
        .then((activeGame) => {
          if (activeGame) {
            enterGame(activeGame.snapshot.gameId, activeGame.color);
          }
        })
        .catch(() => {
          // The event stream may still recover; retain the current lobby state.
        });
    }, 2_500);
    return () => window.clearInterval(interval);
  }, [connection, enterGame]);

  async function send(
    command: Parameters<GameServerClient["command"]>[0],
  ): Promise<ServerEvent[]> {
    const client = clientRef.current;
    if (!client) throw new Error(t("play.notConnected"));
    const events = await client.command(command);
    events.forEach(handleEvent);
    return events;
  }

  async function createRoom() {
    setBusy(true);
    setNotice("");
    try {
      await send({
        type: "createPrivateRoom",
        commandId: crypto.randomUUID(),
        timeControlId,
        rated: false,
      });
    } catch (error) {
      setNotice(messageFor(error, t("play.serviceError")));
    } finally {
      setBusy(false);
    }
  }

  async function joinRoom() {
    const normalized = joinCode.trim().toUpperCase();
    if (!/^[A-Z2-9]{6}$/.test(normalized)) {
      setNotice(t("play.enterCode"));
      return;
    }
    setBusy(true);
    setNotice("");
    try {
      await send({
        type: "joinPrivateRoom",
        commandId: stableRoomCommandId(normalized),
        roomCode: normalized,
      });
    } catch (error) {
      setNotice(messageFor(error, t("play.serviceError")));
    } finally {
      setBusy(false);
    }
  }

  async function toggleQueue() {
    setBusy(true);
    setNotice("");
    try {
      if (queued) {
        await send({
          type: "leaveMatchmaking",
          commandId: crypto.randomUUID(),
        });
        setQueued(false);
        setNotice(t("play.leftQueue"));
      } else {
        const events = await send({
          type: "joinMatchmaking",
          commandId: crypto.randomUUID(),
          timeControlId,
          rated: false,
        });
        if (!events.some((event) => event.type === "matchFound")) {
          setQueued(true);
          setNotice(t("play.searching"));
        }
      }
    } catch (error) {
      setQueued(false);
      setNotice(messageFor(error, t("play.serviceError")));
    } finally {
      setBusy(false);
    }
  }

  const online = connection === "ready";
  return (
    <>
      <div className="play-mode-grid">
        <section className="play-mode-card">
          <span className="mode-icon" aria-hidden="true">
            ↗
          </span>
          <div>
            <p className="eyebrow">{t("play.privateRoom")}</p>
            <h2>{t("play.knowTitle")}</h2>
            <p>{t("play.knowCopy")}</p>
          </div>
          <button
            className="button button-secondary"
            type="button"
            disabled={!online || busy}
            onClick={createRoom}
          >
            {t("play.createRoom")}
          </button>
        </section>
        <section className="play-mode-card">
          <span className="mode-icon" aria-hidden="true">
            ⚡
          </span>
          <div>
            <p className="eyebrow">{t("play.quickMatch")}</p>
            <h2>{queued ? t("play.finding") : t("play.findTitle")}</h2>
            <p>{t("play.findCopy")}</p>
          </div>
          <button
            className={`button ${queued ? "button-secondary" : "button-primary"}`}
            type="button"
            disabled={!online || busy}
            onClick={toggleQueue}
          >
            {queued ? t("play.cancelSearch") : t("play.findCasual")}
          </button>
        </section>
      </div>

      <section className="private-panel surface" aria-labelledby="online-title">
        <div>
          <p className="eyebrow">{t("play.online")}</p>
          <h2 id="online-title">{t("play.createJoin")}</h2>
          <p>
            {online
              ? t("play.connected", {
                  name: displayName,
                  status:
                    streamStatus === "reconnecting"
                      ? t("play.restoring")
                      : t("play.liveOn"),
                })
              : connection === "connecting"
                ? t("play.connecting")
                : t("play.unavailable")}
          </p>
        </div>
        <div className="private-actions">
          <label className="form-field">
            <span>{t("play.timeControl")}</span>
            <select
              value={timeControlId}
              onChange={(event) =>
                setTimeControlId(event.target.value as TimeControlId)
              }
              disabled={!online || queued || busy}
            >
              {timeControls.map((control) => (
                <option key={control.id} value={control.id}>
                  {t(control.label)}
                </option>
              ))}
            </select>
          </label>
          <span className="or-divider">{t("play.orJoin")}</span>
          <label className="form-field">
            <span>{t("play.roomCode")}</span>
            <input
              value={joinCode}
              maxLength={6}
              inputMode="text"
              autoCapitalize="characters"
              autoComplete="off"
              placeholder="ABC234"
              aria-label={t("play.roomCodeA11y")}
              onChange={(event) =>
                setJoinCode(
                  event.target.value.toUpperCase().replace(/[^A-Z2-9]/g, ""),
                )
              }
              disabled={!online || busy}
            />
          </label>
          <button
            className="button button-secondary"
            type="button"
            disabled={!online || busy}
            onClick={joinRoom}
          >
            {t("play.joinRoom")}
          </button>
        </div>
        {roomCode && (
          <div className="room-result" role="status">
            <b>{roomCode}</b>
            <code>{joinUrl}</code>
            <button
              className="button button-secondary"
              type="button"
              onClick={() => void navigator.clipboard.writeText(joinUrl)}
            >
              {t("play.copyInvite")}
            </button>
          </div>
        )}
        {notice && (
          <p className="inline-notice" role="status">
            {notice}
          </p>
        )}
      </section>
    </>
  );
}
