"use client";

import { useMemo, useState } from "react";
import {
  applyMove,
  createInitialPosition,
  formatMove,
  type Move,
  type Position,
} from "@/packages/xiangqi-engine/src";
import { XiangqiBoard } from "../../play/xiangqi-board";

const demoMoves: Move[] = [
  { from: { column: 1, row: 7 }, to: { column: 4, row: 7 } },
  { from: { column: 1, row: 2 }, to: { column: 4, row: 2 } },
  { from: { column: 7, row: 9 }, to: { column: 6, row: 7 } },
  { from: { column: 7, row: 0 }, to: { column: 6, row: 2 } },
  { from: { column: 4, row: 6 }, to: { column: 4, row: 5 } },
  { from: { column: 4, row: 3 }, to: { column: 4, row: 4 } },
];

export function ReplayViewer() {
  const positions = useMemo(() => {
    const values: Position[] = [createInitialPosition()];
    for (const move of demoMoves)
      values.push(applyMove(values[values.length - 1], move));
    return values;
  }, []);
  const labels = useMemo(
    () =>
      demoMoves.map((move, index) =>
        formatMove(positions[index], move, "western"),
      ),
    [positions],
  );
  const [step, setStep] = useState(positions.length - 1);
  const [orientation, setOrientation] = useState<"red" | "black">("red");
  return (
    <div className="replay-layout">
      <div>
        <XiangqiBoard
          position={positions[step]}
          lastMove={step ? demoMoves[step - 1] : null}
          orientation={orientation}
          disabled
        />
        <div className="replay-controls">
          <button
            type="button"
            onClick={() => setStep(0)}
            disabled={step === 0}
            aria-label="First position"
          >
            ↤
          </button>
          <button
            type="button"
            onClick={() => setStep(Math.max(0, step - 1))}
            disabled={step === 0}
            aria-label="Previous move"
          >
            ←
          </button>
          <span>
            Position {step} of {demoMoves.length}
          </span>
          <button
            type="button"
            onClick={() => setStep(Math.min(positions.length - 1, step + 1))}
            disabled={step === positions.length - 1}
            aria-label="Next move"
          >
            →
          </button>
          <button
            type="button"
            onClick={() => setStep(positions.length - 1)}
            disabled={step === positions.length - 1}
            aria-label="Final position"
          >
            ↦
          </button>
        </div>
      </div>
      <aside className="move-panel replay-panel">
        <div className="move-panel-head">
          <span>REPLAY MOVES</span>
          <button
            type="button"
            onClick={() =>
              setOrientation(orientation === "red" ? "black" : "red")
            }
          >
            ↕ Flip board
          </button>
        </div>
        <ol>
          <li className={step === 0 ? "active" : ""}>
            <button type="button" onClick={() => setStep(0)}>
              <span>0</span>
              <b>Initial position</b>
            </button>
          </li>
          {labels.map((label, index) => (
            <li
              key={`${label}-${index}`}
              className={step === index + 1 ? "active" : ""}
            >
              <button type="button" onClick={() => setStep(index + 1)}>
                <span>{index + 1}</span>
                <b>{label}</b>
              </button>
            </li>
          ))}
        </ol>
        <div className="practice-note">
          <b>Demo replay</b>
          <p>
            Production replays use the exact position saved after each accepted
            server move.
          </p>
        </div>
      </aside>
    </div>
  );
}
