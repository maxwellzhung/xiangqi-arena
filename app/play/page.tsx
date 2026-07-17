import type { Metadata } from "next";
import { AppPage, PageIntro } from "../components/site-chrome";
import { PlayLobby } from "./play-lobby";

export const metadata: Metadata = { title: "Play Xiangqi" };
export default async function PlayPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const { mode } = await searchParams;
  const guided = mode === "guided";
  return (
    <AppPage>
      <PageIntro
        eyebrow={guided ? "GUIDED FIRST GAME" : "PLAY AS A GUEST"}
        title={guided ? "Learn while you play" : "Choose how you want to play"}
        copy={
          guided
            ? "Use opening prompts, visible legal destinations, coordinates, and plain-language explanations for every rejected move."
            : "Start an untimed local game now. Private rooms and quick match use the same server-authoritative protocol when the standalone game service is connected."
        }
        eyebrowKey={guided ? "intro.play.guidedEyebrow" : "intro.play.eyebrow"}
        titleKey={guided ? "intro.play.guidedTitle" : "intro.play.title"}
        copyKey={guided ? "intro.play.guidedCopy" : "intro.play.copy"}
      />
      <PlayLobby initialMode={guided ? "local" : "lobby"} guided={guided} />
    </AppPage>
  );
}
