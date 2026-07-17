"use client";

import { useState } from "react";

const lessons = [
  {
    title: "The board",
    tag: "01",
    body: "Pieces stand on the 90 intersections—not inside squares. The river splits the armies, while each General stays in a 3×3 palace.",
    hint: "The crossed lines mark each palace.",
    marks: ["0-0", "4-0", "8-0", "0-9", "4-9", "8-9"],
  },
  {
    title: "Flying Generals",
    tag: "02",
    body: "The two Generals may never face each other on an open file. If nothing stands between them, one can capture the other across the board.",
    hint: "Keep at least one piece between the Generals.",
    marks: ["4-0", "4-9"],
  },
  {
    title: "Cannon captures",
    tag: "03",
    body: "A Cannon moves like a Rook when not capturing. To capture, it must leap over exactly one piece—the screen—then land on an enemy.",
    hint: "One screen: capture. Zero or two: illegal.",
    marks: ["1-2", "1-5", "1-7"],
  },
  {
    title: "The Horse’s leg",
    tag: "04",
    body: "A Horse moves one point straight, then one diagonally outward. A piece beside it can block that first straight step.",
    hint: "Unlike a Western knight, the Horse cannot always jump.",
    marks: ["4-5", "4-4", "5-3"],
  },
  {
    title: "Stalemate loses",
    tag: "05",
    body: "If you have no legal move, you lose—even when your General is not in check. Active defense matters from the opening onward.",
    hint: "No legal move is a win for the opponent.",
    marks: ["4-0"],
  },
] as const;

export function LearnLesson() {
  const [index, setIndex] = useState(0);
  const lesson = lessons[index];
  return (
    <section className="tutorial" aria-labelledby="lesson-title">
      <div
        className="tutorial-nav"
        role="tablist"
        aria-label="Tutorial lessons"
      >
        {lessons.map((item, itemIndex) => (
          <button
            key={item.tag}
            role="tab"
            aria-selected={itemIndex === index}
            onClick={() => setIndex(itemIndex)}
          >
            <span>{item.tag}</span>
            {item.title}
          </button>
        ))}
      </div>
      <div className="tutorial-copy" aria-live="polite">
        <p className="eyebrow">LESSON {lesson.tag} OF 05</p>
        <h2 id="lesson-title">{lesson.title}</h2>
        <p>{lesson.body}</p>
        <div className="lesson-hint">
          <span aria-hidden="true">◎</span>
          {lesson.hint}
        </div>
        <div className="lesson-controls">
          <button
            className="button button-secondary"
            type="button"
            disabled={index === 0}
            onClick={() => setIndex(index - 1)}
          >
            ← Back
          </button>
          <button
            className="button button-primary"
            type="button"
            disabled={index === lessons.length - 1}
            onClick={() => setIndex(index + 1)}
          >
            Next →
          </button>
        </div>
      </div>
      <div className="lesson-board" aria-label={`Diagram: ${lesson.title}`}>
        <span className="lesson-river">RIVER</span>
        <i className="palace palace-top" />
        <i className="palace palace-bottom" />
        {lesson.marks.map((mark, markIndex) => {
          const [column, row] = mark.split("-").map(Number);
          return (
            <span
              key={mark}
              className={`lesson-mark mark-${markIndex}`}
              style={{
                left: `${(column / 8) * 100}%`,
                top: `${(row / 9) * 100}%`,
              }}
            >
              {lesson.tag === "03"
                ? ["C", "●", "R"][markIndex]
                : lesson.tag === "02"
                  ? "G"
                  : "•"}
            </span>
          );
        })}
      </div>
    </section>
  );
}
