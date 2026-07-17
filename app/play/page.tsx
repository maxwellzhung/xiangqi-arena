import type { Metadata } from "next";
import { AppPage, PageIntro } from "../components/site-chrome";
import { PlayLobby } from "./play-lobby";

export const metadata: Metadata = { title: "Play Xiangqi" };
export default function PlayPage() {
  return (
    <AppPage>
      <PageIntro
        eyebrow="PLAY AS A GUEST"
        title="Choose how you want to play"
        copy="Start an untimed local game now. Private rooms and quick match use the same server-authoritative protocol when the standalone game service is connected."
      />
      <PlayLobby />
    </AppPage>
  );
}
