"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  applyMove,
  createInitialPosition,
  deserializePosition,
  formatMove,
  generateLegalMoves,
  getPiece,
  type Move,
  type Position,
  type Square,
} from "@/packages/xiangqi-engine/src";
import type {
  ClientCommand,
  Color,
  GameSnapshot,
  PublicPlayer,
  ServerEvent,
} from "@/packages/shared/src";
import {
  configuredGameServerUrl,
  GameServerClient,
  GameServerError,
  loadActiveGame,
  saveActiveGame,
  stableRoomCommandId,
  type StreamStatus,
} from "@/app/lib/game-server-client";
import { XiangqiBoard } from "@/app/play/xiangqi-board";

function readableError(error: unknown): string {
  if (error instanceof GameServerError) return error.message;
  return "The game service could not complete that action.";
}

function clockText(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1_000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function liveClock(snapshot: GameSnapshot, color: Color, now: number): number {
  const base = color === "red" ? snapshot.clock.redMs : snapshot.clock.blackMs;
  if (snapshot.clock.running !== color) return base;
  return Math.max(0, base - Math.max(0, now - snapshot.clock.measuredAt));
}

function resultText(snapshot: GameSnapshot, color: Color): string {
  if (snapshot.result === "draw") return "Draw";
  const won = snapshot.result === `${color}-win`;
  const reason = snapshot.terminationReason?.replace(
    "draw-agreement",
    "agreement",
  );
  return `${won ? "You won" : "You lost"}${reason ? ` by ${reason}` : ""}`;
}

export function OnlineGameClient({ roomOrGameId }: { roomOrGameId: string }) {
  const router = useRouter();
  const clientRef = useRef<GameServerClient | null>(null);
  const snapshotRef = useRef<GameSnapshot | null>(null);
  const colorRef = useRef<Color | null>(null);
  const [snapshot, setSnapshot] = useState<GameSnapshot | null>(null);
  const [color, setColor] = useState<Color | null>(null);
  const [streamStatus, setStreamStatus] = useState<StreamStatus>("connecting");
  const [selected, setSelected] = useState<Square | null>(null);
  const [orientation, setOrientation] = useState<Color>("red");
  const [pieceStyle, setPieceStyle] = useState<"western" | "traditional">(
    "traditional",
  );
  const [notice, setNotice] = useState("Connecting to the game service…");
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(0);
  const [opponentAwayUntil, setOpponentAwayUntil] = useState<number | null>(
    null,
  );

  const updateSnapshot = useCallback(
    (next: GameSnapshot, knownColor?: Color) => {
      const client = clientRef.current;
      const inferred =
        knownColor ??
        (client?.session.player.id === next.redPlayer.id
          ? "red"
          : client?.session.player.id === next.blackPlayer.id
            ? "black"
            : null);
      snapshotRef.current = next;
      setSnapshot(next);
      setSelected(null);
      if (inferred) {
        colorRef.current = inferred;
        setColor(inferred);
        setOrientation(inferred);
        saveActiveGame({
          ...loadActiveGame(),
          gameId: next.gameId,
          color: inferred,
        });
      }
    },
    [],
  );

  const handleEvent = useCallback(
    (event: ServerEvent) => {
      switch (event.type) {
        case "roomJoined":
        case "matchFound":
          colorRef.current = event.color;
          setColor(event.color);
          setOrientation(event.color);
          saveActiveGame({ gameId: event.gameId, color: event.color });
          if (roomOrGameId !== event.gameId)
            router.replace(`/game/${event.gameId}`);
          break;
        case "stateSnapshot":
        case "moveAccepted":
        case "gameEnded":
        case "drawOffered":
        case "drawOfferCancelled":
        case "rematchRequested":
          updateSnapshot(event.snapshot);
          if (event.type === "moveAccepted")
            setNotice("Move accepted by the server.");
          break;
        case "moveRejected":
          if (event.snapshot) updateSnapshot(event.snapshot);
          setNotice(event.reason);
          break;
        case "clockSync":
          setSnapshot((current) => {
            if (!current || current.gameId !== event.gameId) return current;
            const next = { ...current, clock: event.clock };
            snapshotRef.current = next;
            return next;
          });
          break;
        case "opponentDisconnected":
          setOpponentAwayUntil(event.graceEndsAt);
          setNotice("Opponent disconnected. Their reconnect window is open.");
          break;
        case "opponentReconnected":
          setOpponentAwayUntil(null);
          setNotice("Opponent reconnected.");
          break;
        case "protocolError":
          setNotice(event.message);
          break;
        default:
          break;
      }
    },
    [roomOrGameId, router, updateSnapshot],
  );

  useEffect(() => {
    snapshotRef.current = snapshot;
  }, [snapshot]);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let stopStream = () => {};

    async function start() {
      if (!configuredGameServerUrl) {
        setStreamStatus("closed");
        setNotice(
          "Online play is not configured on this deployment. No local simulation has been substituted.",
        );
        return;
      }
      try {
        const { client, activeGame } = await GameServerClient.connect();
        if (cancelled) return;
        clientRef.current = client;

        const isRoomCode = /^[A-Z2-9]{6}$/.test(roomOrGameId.toUpperCase());
        if (isRoomCode) {
          stopStream = client.listen(handleEvent, setStreamStatus);
          const events = await client.command({
            type: "joinPrivateRoom",
            commandId: stableRoomCommandId(roomOrGameId.toUpperCase()),
            roomCode: roomOrGameId.toUpperCase(),
          });
          events.forEach(handleEvent);
          return;
        }

        let knownColor: Color | null = null;
        if (activeGame?.snapshot.gameId === roomOrGameId) {
          knownColor = activeGame.color;
          updateSnapshot(activeGame.snapshot, knownColor);
        } else if (activeGame && activeGame.snapshot.gameId !== roomOrGameId) {
          saveActiveGame({
            gameId: activeGame.snapshot.gameId,
            color: activeGame.color,
          });
          router.replace(`/game/${activeGame.snapshot.gameId}`);
          return;
        } else {
          const stored = loadActiveGame();
          knownColor = stored?.gameId === roomOrGameId ? stored.color : null;
          const events = await client.command({
            type: "requestStateSync",
            commandId: crypto.randomUUID(),
            gameId: roomOrGameId,
            expectedVersion: 0,
          });
          events.forEach(handleEvent);
          knownColor = colorRef.current ?? knownColor;
        }

        if (!knownColor) {
          throw new GameServerError(
            "This guest session is not a player in that game.",
            403,
            "NOT_A_PLAYER",
          );
        }
        colorRef.current = knownColor;
        setColor(knownColor);
        setOrientation(knownColor);
        stopStream = client.listen(handleEvent, setStreamStatus, roomOrGameId);

        const stored = loadActiveGame();
        try {
          if (stored?.gameId === roomOrGameId && stored.reconnectToken) {
            const recovered = await client.reconnect(
              roomOrGameId,
              stored.reconnectToken,
            );
            saveActiveGame({
              gameId: roomOrGameId,
              color: knownColor,
              reconnectToken: recovered.reconnectToken,
            });
            updateSnapshot(recovered.snapshot, knownColor);
          } else {
            const reconnectToken =
              await client.issueReconnectToken(roomOrGameId);
            saveActiveGame({
              gameId: roomOrGameId,
              color: knownColor,
              reconnectToken,
            });
          }
        } catch (error) {
          if (error instanceof GameServerError && error.status === 401) {
            const reconnectToken =
              await client.issueReconnectToken(roomOrGameId);
            saveActiveGame({
              gameId: roomOrGameId,
              color: knownColor,
              reconnectToken,
            });
          } else {
            throw error;
          }
        }
        setNotice("Connected. Moves and clocks are server-authoritative.");
      } catch (error) {
        if (!cancelled) {
          setStreamStatus("closed");
          setNotice(readableError(error));
        }
      }
    }

    void start();
    return () => {
      cancelled = true;
      stopStream();
    };
  }, [handleEvent, roomOrGameId, router, updateSnapshot]);

  const snapshotGameId = snapshot?.gameId;
  const snapshotStatus = snapshot?.status;
  useEffect(() => {
    if (!snapshotGameId || snapshotStatus !== "active" || !clientRef.current)
      return;
    const interval = window.setInterval(() => {
      const latest = snapshotRef.current;
      if (!latest) return;
      void clientRef.current
        ?.command({
          type: "requestStateSync",
          commandId: crypto.randomUUID(),
          gameId: latest.gameId,
          expectedVersion: latest.version,
        })
        .then((events) => events.forEach(handleEvent))
        .catch(() => setNotice("Restoring authoritative game state…"));
    }, 10_000);
    return () => window.clearInterval(interval);
  }, [handleEvent, snapshotGameId, snapshotStatus]);

  async function send(command: ClientCommand) {
    const client = clientRef.current;
    if (!client) return;
    setBusy(true);
    try {
      const events = await client.command(command);
      events.forEach(handleEvent);
    } catch (error) {
      setNotice(readableError(error));
    } finally {
      setBusy(false);
    }
  }

  const position = useMemo(() => {
    if (!snapshot) return null;
    try {
      return deserializePosition(snapshot.serializedPosition);
    } catch {
      return null;
    }
  }, [snapshot]);

  const history = useMemo(() => {
    if (!snapshot) return [];
    let before: Position = createInitialPosition();
    return snapshot.moves.map((item) => {
      let label = `Move ${item.sequence}`;
      try {
        label = formatMove(before, item.move, "western");
        before = applyMove(before, item.move);
      } catch {
        // Keep a sequence label if historical notation cannot be reconstructed.
      }
      return { ...item, label };
    });
  }, [snapshot]);

  const legalMoves =
    position && selected && color === snapshot?.currentTurn
      ? generateLegalMoves(position, selected)
      : [];
  const lastMove = snapshot?.moves.at(-1)?.move ?? null;
  const gameActive = snapshot?.status === "active";
  const canMove =
    !!snapshot &&
    !!position &&
    !!color &&
    gameActive &&
    snapshot.currentTurn === color &&
    streamStatus !== "closed" &&
    !busy;

  function chooseSquare(square: Square) {
    if (!position || !canMove) return;
    const piece = getPiece(position, square);
    setSelected(piece?.color === color ? square : null);
  }

  function submitMove(move: Move) {
    if (!snapshot || !canMove) return;
    setSelected(null);
    void send({
      type: "submitMove",
      commandId: crypto.randomUUID(),
      gameId: snapshot.gameId,
      expectedVersion: snapshot.version,
      move,
    });
  }

  function versioned(type: "resign" | "offerDraw" | "requestRematch") {
    if (!snapshot) return;
    void send({
      type,
      commandId: crypto.randomUUID(),
      gameId: snapshot.gameId,
      expectedVersion: snapshot.version,
    });
  }

  function respond(
    type: "respondToDraw" | "respondToRematch",
    accept: boolean,
  ) {
    if (!snapshot) return;
    void send({
      type,
      commandId: crypto.randomUUID(),
      gameId: snapshot.gameId,
      expectedVersion: snapshot.version,
      accept,
    });
  }

  if (!snapshot || !position || !color) {
    return (
      <section className="private-panel surface" aria-live="polite">
        <div>
          <p className="eyebrow">AUTHORITATIVE ONLINE GAME</p>
          <h2>
            {streamStatus === "closed"
              ? "Unable to open this game"
              : "Joining game…"}
          </h2>
          <p>{notice}</p>
        </div>
        <Link className="button button-secondary" href="/play">
          Return to play
        </Link>
      </section>
    );
  }

  const opponentColor: Color = color === "red" ? "black" : "red";
  const opponent =
    opponentColor === "red" ? snapshot.redPlayer : snapshot.blackPlayer;
  const me = color === "red" ? snapshot.redPlayer : snapshot.blackPlayer;
  const drawFromOpponent = snapshot.drawOfferedBy === opponentColor;
  const rematchFromOpponent = snapshot.rematchRequestedBy === opponentColor;
  const capturedByRed = history
    .filter((item) => item.color === "red" && item.capturedPiece)
    .map((item) => item.capturedPiece!);
  const capturedByBlack = history
    .filter((item) => item.color === "black" && item.capturedPiece)
    .map((item) => item.capturedPiece!);

  return (
    <div className="local-game">
      <div className="game-topbar">
        <div>
          <Link className="back-button" href="/play">
            ← Lobby
          </Link>
          <span className="status-chip">
            ONLINE · {snapshot.rated ? "RATED" : "CASUAL"} ·{" "}
            {streamStatus.toUpperCase()}
          </span>
        </div>
        <div className="game-toolbar">
          <button
            type="button"
            onClick={() =>
              setOrientation(orientation === "red" ? "black" : "red")
            }
            aria-label="Flip board orientation"
          >
            ↕ Flip
          </button>
          <button
            type="button"
            onClick={() =>
              setPieceStyle(
                pieceStyle === "western" ? "traditional" : "western",
              )
            }
          >
            {pieceStyle === "western" ? "帥 Chinese" : "ABC English"}
          </button>
        </div>
      </div>

      <div className="game-layout">
        <aside className="player-column">
          <OnlinePlayerCard
            color={opponentColor}
            player={opponent}
            label="Opponent"
            turn={snapshot.currentTurn === opponentColor && gameActive}
            clock={liveClock(snapshot, opponentColor, now)}
            captured={opponentColor === "red" ? capturedByRed : capturedByBlack}
          />
          <div className="game-actions">
            {drawFromOpponent ? (
              <>
                <button
                  type="button"
                  onClick={() => respond("respondToDraw", true)}
                >
                  Accept draw
                </button>
                <button
                  type="button"
                  onClick={() => respond("respondToDraw", false)}
                >
                  Decline draw
                </button>
              </>
            ) : gameActive ? (
              <button
                type="button"
                onClick={() => versioned("offerDraw")}
                disabled={busy || snapshot.drawOfferedBy !== null}
              >
                {snapshot.drawOfferedBy === color
                  ? "Draw offered"
                  : "Offer draw"}
              </button>
            ) : rematchFromOpponent ? (
              <>
                <button
                  type="button"
                  onClick={() => respond("respondToRematch", true)}
                >
                  Accept rematch
                </button>
                <button
                  type="button"
                  onClick={() => respond("respondToRematch", false)}
                >
                  Decline
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => versioned("requestRematch")}
                disabled={busy || snapshot.rematchRequestedBy === color}
              >
                {snapshot.rematchRequestedBy === color
                  ? "Rematch requested"
                  : "Request rematch"}
              </button>
            )}
            <button
              type="button"
              disabled={!gameActive || busy}
              onClick={() => {
                if (
                  window.confirm("Resign this game? This cannot be undone.")
                ) {
                  versioned("resign");
                }
              }}
            >
              Resign
            </button>
          </div>
          <OnlinePlayerCard
            color={color}
            player={me}
            label="You"
            turn={snapshot.currentTurn === color && gameActive}
            clock={liveClock(snapshot, color, now)}
            captured={color === "red" ? capturedByRed : capturedByBlack}
          />
        </aside>

        <div className="game-board-column">
          <XiangqiBoard
            position={position}
            selected={selected}
            legalMoves={legalMoves}
            lastMove={lastMove}
            styleMode={pieceStyle}
            orientation={orientation}
            onSelect={chooseSquare}
            onMove={submitMove}
            disabled={!canMove}
          />
        </div>
        <aside className="game-side-column">
          {snapshot.status === "completed" && (
            <div className="game-result game-result-side" role="status">
              <p className="eyebrow">GAME OVER</p>
              <h2>{resultText(snapshot, color)}</h2>
              <p>
                Review every saved move now, or use the rematch controls beside
                the board to play again.
              </p>
              <Link
                className="button button-secondary"
                href={`/replay/${snapshot.gameId}`}
              >
                Review this game
              </Link>
            </div>
          )}
          <div className="move-panel">
            <div className="move-panel-head">
              <span>MOVE HISTORY</span>
              <b>{snapshot.moveSequence} moves</b>
            </div>
            <ol aria-label="Move history">
              {history.length === 0 ? (
                <li className="empty-moves">
                  {color === "red"
                    ? "You have the first move."
                    : "Waiting for Red."}
                </li>
              ) : (
                history.map((item) => (
                  <li key={item.sequence}>
                    <span>{item.sequence}</span>
                    <b>{item.label}</b>
                    {item.capturedPiece && <small>capture</small>}
                  </li>
                ))
              )}
            </ol>
            <div className="practice-note">
              <b>
                {opponentAwayUntil
                  ? "Opponent reconnecting"
                  : "Server-authoritative"}
              </b>
              <p>
                {opponentAwayUntil
                  ? `Reconnect window ends in ${Math.max(0, Math.ceil((opponentAwayUntil - now) / 1_000))} seconds.`
                  : notice}
              </p>
            </div>
          </div>
        </aside>
      </div>
      <p className="sr-only" aria-live="assertive">
        {notice}
      </p>
    </div>
  );
}

function OnlinePlayerCard({
  color,
  player,
  label,
  turn,
  clock,
  captured,
}: {
  color: Color;
  player: PublicPlayer;
  label: string;
  turn: boolean;
  clock: number;
  captured: string[];
}) {
  return (
    <section
      className={`player-card ${turn ? "current" : ""}`}
      aria-label={`${label}, ${color}${turn ? ", current turn" : ""}`}
    >
      <div className={`player-token ${color}`}>
        {color === "red" ? "R" : "B"}
      </div>
      <div>
        <small>
          {label.toUpperCase()} · {color.toUpperCase()}
        </small>
        <h3>{player.displayName}</h3>
        <p>{turn ? "Thinking" : "Waiting"}</p>
      </div>
      <span className="practice-clock">{clockText(clock)}</span>
      <div className="captured-row">
        <b>Captured</b>
        <span>
          {captured.length
            ? captured.map((piece, index) => (
                <i key={`${piece}-${index}`}>{piece[0].toUpperCase()}</i>
              ))
            : "—"}
        </span>
      </div>
    </section>
  );
}
