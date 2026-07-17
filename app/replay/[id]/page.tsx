import type { Metadata } from "next";
import { AppPage, PageIntro } from "../../components/site-chrome";
import { ReplayViewer } from "./replay-viewer";

export const metadata: Metadata = { title: "Game Replay" };
export default async function ReplayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <AppPage>
      <PageIntro
        eyebrow={`REPLAY · ${id.toUpperCase()}`}
        title="Review the turning points"
        copy="Step through every authoritative position, choose any move from the list, or flip the board to see the opponent’s perspective."
      />
      <ReplayViewer gameId={id} />
    </AppPage>
  );
}
