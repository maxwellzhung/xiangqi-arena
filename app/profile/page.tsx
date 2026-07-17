import type { Metadata } from "next";
import Link from "next/link";
import { AppPage, PageIntro } from "../components/site-chrome";
import {
  chatGPTSignInPath,
  chatGPTSignOutPath,
  getChatGPTUser,
} from "../chatgpt-auth";

export const metadata: Metadata = { title: "Profile" };
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await getChatGPTUser();
  return (
    <AppPage>
      <PageIntro
        eyebrow={user ? "PLAYER PROFILE" : "GUEST PROFILE"}
        title={user ? user.displayName : "Your next game starts here"}
        copy={
          user
            ? "Your hosted identity is connected. Rated history will attach to this profile when public account providers are configured."
            : "Guest play works immediately. Sign in only when you want rated games, cross-device history, and a public ranking."
        }
      />
      <div className="profile-grid">
        <section className="surface profile-card">
          <div className="profile-avatar">
            {user?.displayName[0]?.toUpperCase() ?? "G"}
          </div>
          <div>
            <span className="status-chip">{user ? "SIGNED IN" : "GUEST"}</span>
            <h2>{user?.displayName ?? "Guest player"}</h2>
            <p>{user?.email ?? "Casual · Unranked · Stored on this browser"}</p>
          </div>
          {user ? (
            <Link
              className="button button-secondary"
              href={chatGPTSignOutPath("/")}
            >
              Sign out
            </Link>
          ) : (
            <Link
              className="button button-primary"
              href={chatGPTSignInPath("/profile")}
            >
              Sign in to save progress
            </Link>
          )}
        </section>
        <section className="surface stats-panel">
          <h2>Rated overview</h2>
          <dl>
            <div>
              <dt>Rating</dt>
              <dd>—</dd>
            </div>
            <div>
              <dt>Games</dt>
              <dd>0</dd>
            </div>
            <div>
              <dt>Win rate</dt>
              <dd>—</dd>
            </div>
          </dl>
          <p>Rated games require an authenticated player account.</p>
        </section>
      </div>
      <section className="surface empty-history">
        <span aria-hidden="true">♜</span>
        <h2>No saved games yet</h2>
        <p>
          Completed hosted games will appear here with result, color, time
          control, rating change, and replay.
        </p>
        <Link className="button button-primary" href="/play">
          Play a casual game
        </Link>
      </section>
    </AppPage>
  );
}
