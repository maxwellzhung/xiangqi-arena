import type { Metadata } from "next";
import { AppPage } from "../../components/site-chrome";
import { OnlineGameClient } from "./online-game-client";

export const metadata: Metadata = { title: "Active Game" };
export default async function GamePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <AppPage>
      <div className="game-page-heading">
        <p className="eyebrow">ROOM {id.toUpperCase()}</p>
        <h1>Live Xiangqi game</h1>
        <p>
          The game service validates every move, owns both clocks, and restores
          the latest version after a connection interruption.
        </p>
      </div>
      <OnlineGameClient roomOrGameId={id} />
    </AppPage>
  );
}
