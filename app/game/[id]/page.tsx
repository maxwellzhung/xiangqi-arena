import type { Metadata } from "next";
import { AppPage } from "../../components/site-chrome";
import { LocalGame } from "../../play/local-game";

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
        <h1>Practice board</h1>
        <p>
          This hosted preview runs the complete rules engine locally. Connect
          the realtime service for a shared private room.
        </p>
      </div>
      <LocalGame />
    </AppPage>
  );
}
