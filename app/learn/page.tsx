import type { Metadata } from "next";
import Link from "next/link";
import { AppPage, PageIntro } from "../components/site-chrome";
import { LearnLesson } from "./tutorial";

export const metadata: Metadata = {
  title: "Learn Xiangqi",
  description:
    "Learn the Xiangqi board and pieces in five approachable lessons.",
};

const glossary = [
  ["General", "King", "The royal piece. It stays inside the palace."],
  ["Advisor", "Guard", "A one-step diagonal palace defender."],
  [
    "Elephant",
    "Bishop",
    "A two-point diagonal piece that cannot cross the river.",
  ],
  [
    "Horse",
    "Knight",
    "Moves like a knight, but its first orthogonal step can be blocked.",
  ],
  ["Rook", "Chariot", "The board’s long-range straight-line piece."],
  ["Cannon", "—", "Moves like a Rook, but jumps one screen when capturing."],
  [
    "Soldier",
    "Pawn",
    "Moves forward; gains sideways movement after the river.",
  ],
];

export default function LearnPage() {
  return (
    <AppPage>
      <PageIntro
        eyebrow="LEARN IN FIVE MINUTES"
        title="A familiar strategy. A different rhythm."
        copy="Xiangqi shares the goal of checkmating a royal piece with Western chess, but the open board, river, palaces, and Cannons create a faster tactical game."
      />
      <LearnLesson />
      <section className="learn-section" aria-labelledby="glossary-title">
        <div>
          <p className="eyebrow">PLAIN-ENGLISH GLOSSARY</p>
          <h2 id="glossary-title">Meet the seven pieces</h2>
          <p>
            We use consistent Western-friendly names. Common alternative
            translations are included so you can follow other books and apps.
          </p>
        </div>
        <dl className="glossary-list">
          {glossary.map(([name, alternate, copy]) => (
            <div key={name}>
              <dt>
                {name}
                <small>{alternate}</small>
              </dt>
              <dd>{copy}</dd>
            </div>
          ))}
        </dl>
      </section>
      <section className="ready-panel">
        <p className="eyebrow">READY TO TRY?</p>
        <h2>Your first game can be casual.</h2>
        <p>Legal destinations stay visible, and nothing affects a rating.</p>
        <Link className="button button-primary" href="/play">
          Start a guided game →
        </Link>
      </section>
    </AppPage>
  );
}
