import type { Metadata } from "next";
import Link from "next/link";
import { AppPage, PageIntro } from "../components/site-chrome";
import { PronunciationButton } from "./pronunciation-button";
import { LearnLesson } from "./tutorial";

export const metadata: Metadata = {
  title: "Learn Xiangqi",
  description:
    "Learn every Xiangqi piece through nine interactive lessons and a guided first game.",
};

const glossary = [
  [
    "General",
    "King",
    "將 / 帥",
    "jiàng / shuài",
    "The royal piece. It stays inside the palace.",
  ],
  [
    "Advisor",
    "Guard",
    "士 / 仕",
    "shì",
    "A one-step diagonal palace defender.",
  ],
  [
    "Elephant",
    "Bishop",
    "象 / 相",
    "xiàng",
    "A two-point diagonal piece that cannot cross the river.",
  ],
  [
    "Horse",
    "Knight",
    "馬 / 傌",
    "mǎ",
    "Moves like a knight, but its first orthogonal step can be blocked.",
  ],
  [
    "Rook",
    "Chariot",
    "車 / 俥",
    "jū",
    "The board’s long-range straight-line piece.",
  ],
  [
    "Cannon",
    "—",
    "砲 / 炮",
    "pào",
    "Moves like a Rook, but jumps one screen when capturing.",
  ],
  [
    "Soldier",
    "Pawn",
    "卒 / 兵",
    "zú / bīng",
    "Moves forward; gains sideways movement after the river.",
  ],
];

export default function LearnPage() {
  return (
    <AppPage>
      <PageIntro
        eyebrow="LEARN BY DOING · ABOUT 8 MINUTES"
        title="A familiar strategy. A different rhythm."
        copy="Make real moves, see exactly why mistakes fail, and finish with a five-question readiness check. No account required."
        eyebrowKey="intro.learn.eyebrow"
        titleKey="intro.learn.title"
        copyKey="intro.learn.copy"
      />
      <LearnLesson />
      <section className="learn-section" aria-labelledby="glossary-title">
        <div>
          <p className="eyebrow">PLAIN-ENGLISH GLOSSARY</p>
          <h2 id="glossary-title">Meet the seven pieces</h2>
          <p>
            We use consistent Western-friendly names. Traditional characters,
            pinyin, and audio help you recognize other boards, books, and apps.
          </p>
        </div>
        <dl className="glossary-list">
          {glossary.map(
            ([name, alternate, characters, pronunciation, copy]) => (
              <div key={name}>
                <dt>
                  {name}
                  <small>
                    {alternate} · {characters}
                  </small>
                  <em>{pronunciation}</em>
                </dt>
                <dd>
                  <span>{copy}</span>
                  <PronunciationButton
                    name={name}
                    spoken={`${characters.replace(" / ", "，")}，${pronunciation}`}
                  />
                </dd>
              </div>
            ),
          )}
        </dl>
      </section>
      <section className="ready-panel">
        <p className="eyebrow">READY TO TRY?</p>
        <h2>Your first game comes with a coach.</h2>
        <p>
          Legal destinations, move explanations, coordinates, and opening
          prompts stay visible. Nothing affects a rating.
        </p>
        <Link className="button button-primary" href="/play?mode=guided">
          Start guided first game →
        </Link>
      </section>
    </AppPage>
  );
}
