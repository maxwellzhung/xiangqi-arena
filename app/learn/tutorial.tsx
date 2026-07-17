"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  applyMove,
  createInitialPosition,
  createPosition,
  explainMove,
  generateLegalMoves,
  getPiece,
  type Move,
  type Position,
  type Square,
} from "@/packages/xiangqi-engine/src";
import { squareName, XiangqiBoard } from "../play/xiangqi-board";

type ExperienceMode = "chess" | "beginner";

type SelectChallenge = {
  id: string;
  kind: "select";
  prompt: string;
  position: Position;
  targetSquare: Square;
  success: string;
  hint: string;
};

type MoveChallenge = {
  id: string;
  kind: "move";
  prompt: string;
  position: Position;
  targetMove: Move;
  tryMove?: Move;
  success: string;
  hint: string;
};

type ChoiceChallenge = {
  id: string;
  kind: "choice";
  prompt: string;
  position: Position;
  options: ReadonlyArray<{
    value: string;
    label: string;
    correct?: boolean;
    feedback: string;
  }>;
  hint: string;
};

type LessonChallenge = SelectChallenge | MoveChallenge | ChoiceChallenge;

type BoardLesson = {
  id: string;
  tag: string;
  title: string;
  body: string;
  concept: string;
  chessBridge: string;
  beginnerBridge: string;
  validExample: string;
  invalidExample: string;
  challenges: readonly LessonChallenge[];
};

const STORAGE_KEY = "xiangqi-arena-tutorial-v3";
const METRICS_KEY = "xiangqi-arena-learning-events";

const lessons: readonly BoardLesson[] = [
  {
    id: "board",
    tag: "01",
    title: "Board, setup & coordinates",
    body: "Pieces stand on 90 intersections—not inside squares. Red begins at the bottom and moves first. Files run a–i from Red’s left; ranks run 0–9 from Red’s side.",
    concept:
      "The river divides the board; crossed diagonal lines mark each 3×3 palace.",
    chessBridge:
      "Think of files and ranks as coordinates, but count intersections rather than squares.",
    beginnerBridge:
      "A coordinate such as b2 means file b, rank 2. Select a piece, then its destination.",
    validExample: "Select the center where two board lines cross.",
    invalidExample: "Do not click the middle of a square.",
    challenges: [
      {
        id: "find-cannon",
        kind: "select",
        prompt: "Find and select Red’s Cannon (C) on b2.",
        position: createInitialPosition(),
        targetSquare: { column: 1, row: 7 },
        success: "Correct. b2 is a Red Cannon standing on an intersection.",
        hint: "Follow file b upward from Red’s left edge to rank 2.",
      },
    ],
  },
  {
    id: "palace",
    tag: "02",
    title: "General & Advisor",
    body: "The General moves one step horizontally or vertically and must stay in the palace. Advisors defend it by moving one step diagonally, also without leaving the palace.",
    concept: "The palace is a hard boundary for both pieces.",
    chessBridge:
      "The General resembles a restricted king; the Advisor has no direct Western-chess equivalent.",
    beginnerBridge:
      "Keep the General safe. Losing it ends the game, so its Advisors stay close.",
    validExample: "A d0–e1 stays on a palace diagonal.",
    invalidExample: "A d0–c1 leaves the palace.",
    challenges: [
      {
        id: "advisor-palace",
        kind: "move",
        prompt:
          "Try d0 → c1, then keep the Advisor in the palace with d0 → e1.",
        position: createPosition([
          { color: "black", type: "general", column: 4, row: 0 },
          { color: "red", type: "rook", column: 4, row: 4 },
          { color: "red", type: "advisor", column: 3, row: 9 },
          { color: "red", type: "general", column: 4, row: 9 },
        ]),
        tryMove: {
          from: { column: 3, row: 9 },
          to: { column: 2, row: 8 },
        },
        targetMove: {
          from: { column: 3, row: 9 },
          to: { column: 4, row: 8 },
        },
        success:
          "Correct. The Advisor moved one diagonal step and stayed inside the palace.",
        hint: "The only valid diagonal destination is the palace center, e1.",
      },
    ],
  },
  {
    id: "elephant",
    tag: "03",
    title: "The Elephant’s eye",
    body: "An Elephant moves exactly two points diagonally. It cannot cross the river, and any piece on the diagonal midpoint—the elephant’s eye—blocks it.",
    concept:
      "Check both the river and the middle point before moving an Elephant.",
    chessBridge:
      "Unlike a bishop, the Elephant has a fixed two-point move and cannot travel across the whole diagonal.",
    beginnerBridge:
      "Trace the two-step diagonal: the first intersection must be empty, and the destination must remain on your side.",
    validExample: "E c0–a2 works because b1 is clear.",
    invalidExample: "E c0–e2 is blocked by the Soldier on d1.",
    challenges: [
      {
        id: "elephant-eye",
        kind: "move",
        prompt: "Try c0 → e2 to reveal the block, then play c0 → a2.",
        position: createPosition([
          { color: "black", type: "general", column: 4, row: 0 },
          { color: "red", type: "soldier", column: 3, row: 8 },
          { color: "red", type: "elephant", column: 2, row: 9 },
          { color: "red", type: "general", column: 3, row: 9 },
        ]),
        tryMove: {
          from: { column: 2, row: 9 },
          to: { column: 4, row: 7 },
        },
        targetMove: {
          from: { column: 2, row: 9 },
          to: { column: 0, row: 7 },
        },
        success:
          "Correct. The route through b1 is clear and the Elephant remains behind the river.",
        hint: "Look toward Red’s left edge: the route c0–b1–a2 is open.",
      },
    ],
  },
  {
    id: "horse",
    tag: "04",
    title: "The Horse’s leg",
    body: "A Horse moves one point straight, then one diagonally outward. A piece beside it can block that first straight step.",
    concept:
      "Check the adjacent ‘leg’ intersection before planning the L-shape.",
    chessBridge:
      "Unlike a knight, the Horse cannot jump over a blocked first step.",
    beginnerBridge:
      "Read the move in two parts: one straight step, then one diagonal step away.",
    validExample: "H e4–g5 works because f4 is clear.",
    invalidExample: "H e4–f6 fails because the Soldier on e5 blocks the leg.",
    challenges: [
      {
        id: "horse-leg",
        kind: "move",
        prompt: "Try e4 → f6, then find the legal move e4 → g5.",
        position: createPosition([
          { color: "black", type: "general", column: 4, row: 0 },
          { color: "red", type: "soldier", column: 4, row: 4 },
          { color: "red", type: "horse", column: 4, row: 5 },
          { color: "red", type: "general", column: 3, row: 9 },
        ]),
        tryMove: {
          from: { column: 4, row: 5 },
          to: { column: 5, row: 3 },
        },
        targetMove: {
          from: { column: 4, row: 5 },
          to: { column: 6, row: 4 },
        },
        success: "Correct. The Horse’s first straight step toward f4 is clear.",
        hint: "Move toward Red’s right: e4 → f4 → g5.",
      },
    ],
  },
  {
    id: "rook",
    tag: "05",
    title: "Rook lines",
    body: "A Rook moves any distance horizontally or vertically, but it cannot jump over another piece. Open files make Rooks especially powerful.",
    concept: "Scan every intersection between the Rook and its destination.",
    chessBridge:
      "This is the closest direct transfer from Western chess: the Rook moves the same way.",
    beginnerBridge:
      "A Rook travels in a straight line. Stop before the first friendly piece or on the first enemy piece.",
    validExample: "R a0–a1 stops before the Soldier.",
    invalidExample: "R a0–a3 tries to jump over the Soldier on a2.",
    challenges: [
      {
        id: "rook-line",
        kind: "move",
        prompt: "Try a0 → a3, then stop on the open intersection a1.",
        position: createPosition([
          { color: "black", type: "general", column: 4, row: 0 },
          { color: "red", type: "soldier", column: 0, row: 7 },
          { color: "red", type: "rook", column: 0, row: 9 },
          { color: "red", type: "general", column: 3, row: 9 },
        ]),
        tryMove: {
          from: { column: 0, row: 9 },
          to: { column: 0, row: 6 },
        },
        targetMove: {
          from: { column: 0, row: 9 },
          to: { column: 0, row: 8 },
        },
        success:
          "Correct. The Rook travelled in a straight line without crossing another piece.",
        hint: "The Soldier on a2 is a wall. Stop one intersection before it, on a1.",
      },
    ],
  },
  {
    id: "cannon",
    tag: "06",
    title: "Cannon screens",
    body: "A Cannon moves like a Rook when it is not capturing. To capture, it leaps over exactly one intervening piece—the screen—and lands on the first enemy beyond it.",
    concept: "Any piece can be the screen, friendly or enemy.",
    chessBridge:
      "No Western-chess piece changes its movement rule specifically for captures like this.",
    beginnerBridge:
      "For a normal move, the path must be clear. For a capture, count exactly one piece in between.",
    validExample: "C b2×b8 jumps the single Soldier on b5.",
    invalidExample: "A Cannon capture with zero or two screens is illegal.",
    challenges: [
      {
        id: "cannon-screen",
        kind: "move",
        prompt: "Select C on b2 and capture the Black Rook on b8.",
        position: createPosition([
          { color: "black", type: "general", column: 4, row: 0 },
          { color: "black", type: "rook", column: 1, row: 1 },
          { color: "red", type: "soldier", column: 1, row: 4 },
          { color: "red", type: "cannon", column: 1, row: 7 },
          { color: "red", type: "general", column: 3, row: 9 },
        ]),
        targetMove: {
          from: { column: 1, row: 7 },
          to: { column: 1, row: 1 },
        },
        success: "Correct. The Soldier on b5 was the Cannon’s single screen.",
        hint: "Follow file b upward. There is exactly one piece between C on b2 and the Rook on b8.",
      },
    ],
  },
  {
    id: "soldier",
    tag: "07",
    title: "Soldiers after the river",
    body: "A Soldier moves one step forward. After crossing the river, it may also move one step sideways—but it can never move backward.",
    concept:
      "Crossing the river adds sideways movement; it never adds retreat.",
    chessBridge:
      "Soldiers do not capture diagonally, do not move two steps, and do not promote.",
    beginnerBridge:
      "Before the river: forward only. After the river: forward or sideways. Never backward.",
    validExample: "S e5–f5 is legal after crossing the river.",
    invalidExample: "S e5–e4 moves backward toward Red’s side.",
    challenges: [
      {
        id: "soldier-river",
        kind: "move",
        prompt: "Try the backward move e5 → e4, then move sideways e5 → f5.",
        position: createPosition([
          { color: "black", type: "general", column: 4, row: 0 },
          { color: "red", type: "soldier", column: 4, row: 4 },
          { color: "red", type: "general", column: 3, row: 9 },
        ]),
        tryMove: {
          from: { column: 4, row: 4 },
          to: { column: 4, row: 5 },
        },
        targetMove: {
          from: { column: 4, row: 4 },
          to: { column: 5, row: 4 },
        },
        success:
          "Correct. This Soldier has crossed the river, so one sideways step is legal.",
        hint: "The river unlocked sideways movement. Choose f5, not a lower rank.",
      },
    ],
  },
  {
    id: "flying-generals",
    tag: "08",
    title: "Flying Generals",
    body: "The two Generals may never face each other on an open file. A piece between them acts as a screen; moving it away can expose your General to check.",
    concept: "Keep at least one piece between Generals sharing a file.",
    chessBridge:
      "Treat the opposing General as a long-range attacker whenever both Generals share an open file.",
    beginnerBridge:
      "Draw a straight line between the Generals. If nothing blocks it, the position is illegal.",
    validExample: "R e5–e4 keeps the Rook on the e-file.",
    invalidExample: "R e5–d5 opens the file and exposes both Generals.",
    challenges: [
      {
        id: "flying-generals",
        kind: "move",
        prompt: "Try e5 → d5 to reveal the rule, then play e5 → e4.",
        position: createPosition([
          { color: "black", type: "general", column: 4, row: 0 },
          { color: "red", type: "rook", column: 4, row: 4 },
          { color: "red", type: "general", column: 4, row: 9 },
        ]),
        tryMove: {
          from: { column: 4, row: 4 },
          to: { column: 3, row: 4 },
        },
        targetMove: {
          from: { column: 4, row: 4 },
          to: { column: 4, row: 5 },
        },
        success: "Correct. The Rook still separates the two Generals.",
        hint: "Keep the Rook on file e; move it one rank toward Red instead of sideways.",
      },
    ],
  },
  {
    id: "endings",
    tag: "09",
    title: "Checkmate & stalemate",
    body: "Check means the General is under attack. Checkmate means no legal reply escapes that attack. In Xiangqi, stalemate also loses: having no legal move is never a draw.",
    concept:
      "No legal move means defeat, whether or not the General is currently in check.",
    chessBridge:
      "The crucial difference is stalemate: it is a loss in Xiangqi, not a draw.",
    beginnerBridge:
      "First ask ‘Is the General attacked?’ Then ask ‘Does the player have any legal move?’",
    validExample:
      "Zero moves while in check is checkmate; zero moves without check is stalemate.",
    invalidExample: "Do not record a Xiangqi stalemate as a draw.",
    challenges: [
      {
        id: "checkmate-verdict",
        kind: "choice",
        prompt:
          "Black is under attack and has no legal reply. Choose the verdict.",
        position: createPosition(
          [
            { color: "black", type: "general", column: 4, row: 0 },
            { color: "red", type: "rook", column: 3, row: 1 },
            { color: "red", type: "soldier", column: 4, row: 1 },
            { color: "red", type: "rook", column: 5, row: 1 },
            { color: "red", type: "cannon", column: 4, row: 2 },
            { color: "red", type: "general", column: 3, row: 9 },
          ],
          "black",
        ),
        options: [
          {
            value: "checkmate",
            label: "Black is checkmated and loses",
            correct: true,
            feedback: "Correct. Black is in check and has no legal reply.",
          },
          {
            value: "stalemate",
            label: "Black is stalemated",
            feedback:
              "Not quite. The General is currently under attack, so this is checkmate.",
          },
          {
            value: "draw",
            label: "The game is drawn",
            feedback: "No. A player with no legal move loses in Xiangqi.",
          },
        ],
        hint: "The Cannon attacks through the Soldier on e8, and every escape is covered.",
      },
      {
        id: "stalemate-verdict",
        kind: "choice",
        prompt:
          "Black is not in check but has no legal move. Choose the verdict.",
        position: createPosition(
          [
            { color: "black", type: "general", column: 4, row: 0 },
            { color: "red", type: "rook", column: 3, row: 1 },
            { color: "red", type: "rook", column: 5, row: 1 },
            { color: "red", type: "general", column: 3, row: 9 },
          ],
          "black",
        ),
        options: [
          {
            value: "checkmate",
            label: "Black is checkmated",
            feedback:
              "Not quite. Black has no legal move, but the General is not in check.",
          },
          {
            value: "stalemate",
            label: "Black is stalemated and loses",
            correct: true,
            feedback:
              "Correct. In Xiangqi, stalemate is a win for the opponent.",
          },
          {
            value: "draw",
            label: "The game is drawn",
            feedback:
              "That is the Western-chess rule. Xiangqi awards the win to Red.",
          },
        ],
        hint: "The General is safe for the moment, but every possible destination is covered.",
      },
    ],
  },
];

const assessmentQuestions = [
  {
    prompt: "How many screens must a Cannon jump to capture?",
    options: ["None", "Exactly one", "Any number"],
    answer: "Exactly one",
  },
  {
    prompt:
      "What can stop a Horse from reaching an otherwise correct L-shaped destination?",
    options: [
      "A blocked first straight step",
      "The river",
      "Leaving the palace",
    ],
    answer: "A blocked first straight step",
  },
  {
    prompt: "Which piece can never cross the river?",
    options: ["Rook", "Cannon", "Elephant"],
    answer: "Elephant",
  },
  {
    prompt: "What happens when a player has no legal move but is not in check?",
    options: ["The player loses", "The game is drawn", "The turn is skipped"],
    answer: "The player loses",
  },
  {
    prompt: "Can the two Generals face each other on an open file?",
    options: ["Yes, at any distance", "Only across the river", "No"],
    answer: "No",
  },
] as const;

function trackLearningEvent(
  event: string,
  detail: Record<string, string | number | boolean> = {},
) {
  if (typeof window === "undefined") return;
  try {
    const existing = JSON.parse(localStorage.getItem(METRICS_KEY) ?? "[]");
    const events = Array.isArray(existing) ? existing : [];
    events.push({ event, detail, at: new Date().toISOString() });
    localStorage.setItem(METRICS_KEY, JSON.stringify(events.slice(-100)));
    window.dispatchEvent(
      new CustomEvent("xiangqi:learning", { detail: { event, ...detail } }),
    );
  } catch {
    // Learning remains fully usable when browser storage is unavailable.
  }
}

export function LearnLesson() {
  const [index, setIndex] = useState(0);
  const [experience, setExperience] = useState<ExperienceMode>("chess");
  const [completed, setCompleted] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [assessmentPassed, setAssessmentPassed] = useState(false);
  const [bestScore, setBestScore] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const tabs = useRef<Array<HTMLButtonElement | null>>([]);
  const showingAssessment = index === lessons.length;
  const lesson = showingAssessment ? null : lessons[index];
  const allLessonsComplete = completed.size === lessons.length;
  const totalSteps = lessons.length + 1;
  const progress = completed.size + (assessmentPassed ? 1 : 0);

  useEffect(() => {
    let saved:
      | {
          index?: number;
          experience?: ExperienceMode;
          completed?: string[];
          assessmentPassed?: boolean;
          bestScore?: number;
        }
      | undefined;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        saved = JSON.parse(raw) as typeof saved;
      }
    } catch {
      // Start fresh if stored progress is unavailable or malformed.
    }
    const frame = requestAnimationFrame(() => {
      if (saved) {
        const validIds = new Set(lessons.map((item) => item.id));
        setCompleted(
          new Set((saved.completed ?? []).filter((id) => validIds.has(id))),
        );
        setExperience(saved.experience === "beginner" ? "beginner" : "chess");
        setAssessmentPassed(Boolean(saved.assessmentPassed));
        setBestScore(Math.max(0, Math.min(100, saved.bestScore ?? 0)));
        setIndex(Math.max(0, Math.min(lessons.length, saved.index ?? 0)));
      }
      setHydrated(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        index,
        experience,
        completed: [...completed],
        assessmentPassed,
        bestScore,
      }),
    );
  }, [assessmentPassed, bestScore, completed, experience, hydrated, index]);

  function goTo(nextIndex: number, focus = true) {
    const safeIndex = Math.max(0, Math.min(lessons.length, nextIndex));
    setIndex(safeIndex);
    requestAnimationFrame(() => {
      const tab = tabs.current[safeIndex];
      if (focus) tab?.focus();
      tab?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    });
  }

  function completeLesson(lessonId: string) {
    setCompleted((current) => {
      if (current.has(lessonId)) return current;
      trackLearningEvent("lesson_completed", {
        lesson: lessonId,
        experience,
      });
      return new Set([...current, lessonId]);
    });
  }

  function chooseExperience(mode: ExperienceMode) {
    setExperience(mode);
    trackLearningEvent("learning_path_selected", { mode });
  }

  function handleAssessment(score: number) {
    setBestScore((current) => Math.max(current, score));
    if (score >= 80) {
      setAssessmentPassed(true);
      trackLearningEvent("assessment_passed", { score, experience });
    } else {
      trackLearningEvent("assessment_retry", { score, experience });
    }
  }

  const panelLabelledBy = showingAssessment
    ? "lesson-tab-assessment"
    : `lesson-tab-${lesson?.id}`;

  return (
    <>
      <section className="learning-path" aria-labelledby="learning-path-title">
        <div>
          <p className="eyebrow">CHOOSE YOUR ROUTE</p>
          <h2 id="learning-path-title">Start from what you already know.</h2>
          <p>
            The exercises stay the same; explanations adapt to your experience.
          </p>
        </div>
        <div
          className="learning-path-options"
          role="group"
          aria-label="Learning path"
        >
          <button
            type="button"
            aria-pressed={experience === "chess"}
            onClick={() => chooseExperience("chess")}
          >
            <span aria-hidden="true">♞</span>
            <b>I know Western chess</b>
            <small>
              Focus on the rules that transfer—and the ones that do not.
            </small>
          </button>
          <button
            type="button"
            aria-pressed={experience === "beginner"}
            onClick={() => chooseExperience("beginner")}
          >
            <span aria-hidden="true">◎</span>
            <b>I’m new to strategy games</b>
            <small>Use plain-language movement and safety guidance.</small>
          </button>
        </div>
      </section>

      <section className="tutorial" aria-labelledby="lesson-title">
        <div
          className="tutorial-progress"
          role="progressbar"
          aria-label="Tutorial progress"
          aria-valuemin={0}
          aria-valuemax={totalSteps}
          aria-valuenow={progress}
        >
          <span style={{ width: `${(progress / totalSteps) * 100}%` }} />
          <small>
            {progress} of {totalSteps} complete
          </small>
        </div>
        <div
          className="tutorial-nav"
          role="tablist"
          aria-label="Tutorial lessons"
        >
          {[...lessons, null].map((item, itemIndex) => {
            const assessment = item === null;
            const itemId = assessment ? "assessment" : item.id;
            const itemTitle = assessment ? "Final check" : item.title;
            const itemTag = assessment ? "✓" : item.tag;
            const done = assessment ? assessmentPassed : completed.has(item.id);
            return (
              <button
                key={itemId}
                ref={(node) => {
                  tabs.current[itemIndex] = node;
                }}
                id={`lesson-tab-${itemId}`}
                role="tab"
                aria-controls="lesson-panel"
                aria-selected={itemIndex === index}
                tabIndex={itemIndex === index ? 0 : -1}
                onClick={() => goTo(itemIndex, false)}
                onKeyDown={(event) => {
                  if (event.key === "ArrowDown" || event.key === "ArrowRight") {
                    event.preventDefault();
                    goTo((itemIndex + 1) % totalSteps);
                  }
                  if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
                    event.preventDefault();
                    goTo((itemIndex - 1 + totalSteps) % totalSteps);
                  }
                  if (event.key === "Home") {
                    event.preventDefault();
                    goTo(0);
                  }
                  if (event.key === "End") {
                    event.preventDefault();
                    goTo(totalSteps - 1);
                  }
                }}
              >
                <span>{done ? "✓" : itemTag}</span>
                {itemTitle}
              </button>
            );
          })}
        </div>

        <div
          className="tutorial-copy"
          id="lesson-panel"
          role="tabpanel"
          aria-labelledby={panelLabelledBy}
        >
          {lesson ? (
            <>
              <p className="eyebrow">
                LESSON {lesson.tag} OF {lessons.length}
              </p>
              <h2 id="lesson-title">{lesson.title}</h2>
              <p>{lesson.body}</p>
              <div className="experience-note">
                <b>
                  {experience === "chess"
                    ? "WESTERN-CHESS BRIDGE"
                    : "PLAIN-LANGUAGE TIP"}
                </b>
                <span>
                  {experience === "chess"
                    ? lesson.chessBridge
                    : lesson.beginnerBridge}
                </span>
              </div>
              <div className="lesson-hint">
                <span aria-hidden="true">◎</span>
                {lesson.concept}
              </div>
              <div
                className="rule-examples"
                aria-label="Legal and illegal examples"
              >
                <p>
                  <b>✓ Legal</b>
                  {lesson.validExample}
                </p>
                <p>
                  <b>× Not legal</b>
                  {lesson.invalidExample}
                </p>
              </div>
              <div className="lesson-controls">
                <button
                  className="button button-secondary"
                  type="button"
                  disabled={index === 0}
                  onClick={() => goTo(index - 1, false)}
                >
                  ← Back
                </button>
                <button
                  className="button button-primary"
                  type="button"
                  disabled={!completed.has(lesson.id)}
                  onClick={() => goTo(index + 1, false)}
                >
                  {index === lessons.length - 1 ? "Final check →" : "Next →"}
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="eyebrow">FINAL CHECK</p>
              <h2 id="lesson-title">Prove you’re ready.</h2>
              <p>
                Answer five quick questions. Four correct answers unlock the
                guided first game.
              </p>
              <div className="lesson-hint">
                <span aria-hidden="true">◎</span>
                Your best score stays on this device, so you can leave and
                return.
              </div>
              <div className="lesson-controls">
                <button
                  className="button button-secondary"
                  type="button"
                  onClick={() => goTo(lessons.length - 1, false)}
                >
                  ← Review endings
                </button>
              </div>
            </>
          )}
        </div>

        {lesson ? (
          <LessonChallengeRunner
            key={lesson.id}
            lesson={lesson}
            complete={completed.has(lesson.id)}
            onComplete={() => completeLesson(lesson.id)}
          />
        ) : (
          <Assessment
            locked={!allLessonsComplete}
            passed={assessmentPassed}
            bestScore={bestScore}
            onScore={handleAssessment}
            onReview={() => goTo(0, false)}
          />
        )}
      </section>
    </>
  );
}

function sameSquare(first: Square, second: Square) {
  return first.column === second.column && first.row === second.row;
}

function sameMove(first: Move, second: Move) {
  return sameSquare(first.from, second.from) && sameSquare(first.to, second.to);
}

function LessonChallengeRunner({
  lesson,
  complete,
  onComplete,
}: {
  lesson: BoardLesson;
  complete: boolean;
  onComplete: () => void;
}) {
  const [practising, setPractising] = useState(!complete);
  const [stepIndex, setStepIndex] = useState(0);
  const [stepSolved, setStepSolved] = useState(false);
  const challenge = lesson.challenges[stepIndex];

  if (complete && !practising) {
    return (
      <div className="lesson-challenge lesson-complete-card" role="status">
        <span aria-hidden="true">✓</span>
        <div>
          <b>Lesson complete</b>
          <p>
            You solved {lesson.challenges.length} practical{" "}
            {lesson.challenges.length === 1 ? "exercise" : "exercises"}.
          </p>
        </div>
        <button
          className="button button-secondary"
          type="button"
          onClick={() => {
            setStepIndex(0);
            setStepSolved(false);
            setPractising(true);
          }}
        >
          Practice again
        </button>
      </div>
    );
  }

  function solveStep() {
    setStepSolved(true);
    trackLearningEvent("exercise_completed", {
      lesson: lesson.id,
      exercise: challenge.id,
    });
    if (stepIndex === lesson.challenges.length - 1) onComplete();
  }

  function continueLesson() {
    if (stepIndex < lesson.challenges.length - 1) {
      setStepIndex(stepIndex + 1);
      setStepSolved(false);
    } else {
      setPractising(false);
    }
  }

  return (
    <div className="lesson-challenge">
      <div className="challenge-head">
        <span>{stepSolved ? "✓ SOLVED" : "YOUR TURN"}</span>
        <p>
          {lesson.challenges.length > 1 && (
            <small>
              Exercise {stepIndex + 1} of {lesson.challenges.length}
            </small>
          )}
          {challenge.prompt}
        </p>
      </div>
      <ChallengeStep
        key={challenge.id}
        challenge={challenge}
        solved={stepSolved}
        onSolved={solveStep}
      />
      {stepSolved && (
        <button
          className="button button-primary challenge-next"
          type="button"
          onClick={continueLesson}
        >
          {stepIndex < lesson.challenges.length - 1
            ? "Next exercise →"
            : "Finish lesson →"}
        </button>
      )}
    </div>
  );
}

function ChallengeStep({
  challenge,
  solved,
  onSolved,
}: {
  challenge: LessonChallenge;
  solved: boolean;
  onSolved: () => void;
}) {
  const [position, setPosition] = useState(challenge.position);
  const [selected, setSelected] = useState<Square | null>(null);
  const [lastMove, setLastMove] = useState<Move | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [sawInvalidExample, setSawInvalidExample] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const legalMoves = selected ? generateLegalMoves(position, selected) : [];

  function miss(message: string) {
    setAttempts((current) => current + 1);
    setFeedback(message);
    trackLearningEvent("exercise_miss", {
      exercise: challenge.id,
      attempt: attempts + 1,
    });
  }

  function selectSquare(square: Square) {
    const piece = getPiece(position, square);
    if (challenge.kind === "select") {
      if (sameSquare(square, challenge.targetSquare)) {
        setSelected(square);
        setFeedback(challenge.success);
        onSolved();
      } else {
        miss(
          piece
            ? `That is the ${piece.color} ${piece.type} on ${squareName(square)}.`
            : `${squareName(square)} is an empty intersection.`,
        );
      }
      return;
    }
    if (challenge.kind !== "move") return;
    if (piece?.color === position.turn) {
      setSelected(square);
      setFeedback(
        `${piece.type[0].toUpperCase()}${piece.type.slice(1)} ${squareName(square)} selected. ${generateLegalMoves(position, square).length} legal destinations.`,
      );
    } else {
      miss(
        piece
          ? `It is ${position.turn === "red" ? "Red" : "Black"}’s turn; that is a ${piece.color} piece.`
          : `${squareName(square)} is empty. Select the named piece first.`,
      );
    }
  }

  function rejectMove(from: Square | null, to: Square) {
    if (!from || challenge.kind !== "move") return;
    const candidate = { from, to };
    const explanation = explainMove(position, candidate);
    miss(explanation.message);
    if (challenge.tryMove && sameMove(candidate, challenge.tryMove)) {
      setSawInvalidExample(true);
    }
  }

  function playMove(move: Move) {
    if (challenge.kind !== "move") return;
    if (!sameMove(move, challenge.targetMove)) {
      miss(
        `That move is legal, but this exercise asks for ${squareName(challenge.targetMove.from)} → ${squareName(challenge.targetMove.to)}.`,
      );
      return;
    }
    if (challenge.tryMove && !sawInvalidExample) {
      miss(
        `First try the crossed-out example ${squareName(challenge.tryMove.from)} → ${squareName(challenge.tryMove.to)} so you can see why it fails.`,
      );
      return;
    }
    setPosition(applyMove(position, move));
    setLastMove(move);
    setSelected(null);
    setFeedback(challenge.success);
    onSolved();
  }

  function chooseOption(value: string) {
    if (challenge.kind !== "choice" || solved) return;
    const option = challenge.options.find((item) => item.value === value);
    if (!option) return;
    setFeedback(option.feedback);
    if (option.correct) onSolved();
    else miss(option.feedback);
  }

  const hintedSquares = showHint
    ? challenge.kind === "select"
      ? [challenge.targetSquare]
      : challenge.kind === "move"
        ? [challenge.targetMove.from, challenge.targetMove.to]
        : []
    : [];

  return (
    <>
      <XiangqiBoard
        position={position}
        selected={selected}
        legalMoves={legalMoves}
        lastMove={lastMove}
        hintSquares={hintedSquares}
        onSelect={selectSquare}
        onMove={playMove}
        onReject={rejectMove}
        disabled={solved || challenge.kind === "choice"}
      />
      {challenge.kind === "choice" && (
        <div className="lesson-quiz" aria-label="Choose the position verdict">
          {challenge.options.map((option) => (
            <button
              key={option.value}
              type="button"
              disabled={solved}
              onClick={() => chooseOption(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
      <div className="challenge-response">
        <p
          className={`challenge-feedback${solved ? " success" : ""}`}
          role="status"
          aria-live="polite"
        >
          {feedback ??
            (challenge.kind === "choice"
              ? "Inspect the board, then choose one verdict."
              : "Select a piece to begin. Green marks are legal destinations.")}
        </p>
        {!solved && attempts > 0 && (
          <button
            className="show-hint-button"
            type="button"
            aria-pressed={showHint}
            onClick={() => {
              setShowHint(true);
              setFeedback(challenge.hint);
              trackLearningEvent("hint_used", { exercise: challenge.id });
            }}
          >
            {showHint ? "Hint shown" : "Show me"}
          </button>
        )}
      </div>
    </>
  );
}

function Assessment({
  locked,
  passed,
  bestScore,
  onScore,
  onReview,
}: {
  locked: boolean;
  passed: boolean;
  bestScore: number;
  onScore: (score: number) => void;
  onReview: () => void;
}) {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [result, setResult] = useState<number | null>(null);

  if (locked) {
    return (
      <div className="assessment assessment-locked">
        <span aria-hidden="true">◷</span>
        <h3>Complete all nine lessons first.</h3>
        <p>
          The final check unlocks when every practical exercise has a checkmark.
        </p>
        <button
          className="button button-primary"
          type="button"
          onClick={onReview}
        >
          Continue learning
        </button>
      </div>
    );
  }

  if (passed) {
    return (
      <div className="assessment assessment-passed" role="status">
        <span aria-hidden="true">✓</span>
        <p className="eyebrow">COURSE COMPLETE</p>
        <h3>You’re ready for the board.</h3>
        <p>
          Your best score is <b>{bestScore}%</b>. The first game keeps
          explanations and legal destinations visible.
        </p>
        <Link className="button button-primary" href="/play?mode=guided">
          Start guided first game →
        </Link>
        <button className="text-button" type="button" onClick={onReview}>
          Review any lesson
        </button>
      </div>
    );
  }

  function submitAssessment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (Object.keys(answers).length !== assessmentQuestions.length) return;
    const correct = assessmentQuestions.reduce(
      (total, question, questionIndex) =>
        total + (answers[questionIndex] === question.answer ? 1 : 0),
      0,
    );
    const score = Math.round((correct / assessmentQuestions.length) * 100);
    setResult(score);
    onScore(score);
  }

  return (
    <form className="assessment" onSubmit={submitAssessment}>
      {assessmentQuestions.map((question, questionIndex) => (
        <fieldset key={question.prompt}>
          <legend>
            <span>{questionIndex + 1}</span>
            {question.prompt}
          </legend>
          {question.options.map((option) => {
            const checked = answers[questionIndex] === option;
            const showMark = result !== null && checked;
            const correct = option === question.answer;
            return (
              <label
                key={option}
                className={showMark ? (correct ? "correct" : "incorrect") : ""}
              >
                <input
                  type="radio"
                  name={`assessment-${questionIndex}`}
                  value={option}
                  checked={checked}
                  disabled={result !== null}
                  onChange={() =>
                    setAnswers((current) => ({
                      ...current,
                      [questionIndex]: option,
                    }))
                  }
                />
                <span>{option}</span>
                {showMark && (
                  <b>{correct ? "Correct" : `Answer: ${question.answer}`}</b>
                )}
              </label>
            );
          })}
        </fieldset>
      ))}
      {result !== null && result < 80 && (
        <div className="assessment-result" role="alert">
          <b>{result}% · Review and try again</b>
          <p>
            Four correct answers are required. The right answer is shown beside
            each miss.
          </p>
        </div>
      )}
      {result === null ? (
        <button
          className="button button-primary"
          type="submit"
          disabled={Object.keys(answers).length !== assessmentQuestions.length}
        >
          Check my answers
        </button>
      ) : (
        <button
          className="button button-primary"
          type="button"
          onClick={() => {
            setAnswers({});
            setResult(null);
          }}
        >
          Try all five again
        </button>
      )}
    </form>
  );
}
