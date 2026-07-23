import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

async function render(pathname = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set(
    "test",
    `${process.pid}-${Date.now()}-${pathname}`,
  );
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request(`http://localhost${pathname}`, {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
    },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the Han vs Chu product landing page", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<title>Han vs Chu — Dynasty Chess Online<\/title>/i);
  assert.match(html, /Cross the river/);
  assert.match(html, /Claim the dynasty/);
  assert.match(html, /No account needed/);
  assert.match(html, /Create private game/);
  assert.match(html, /Learn the rules/);
  assert.match(html, /中文（简体）/);
  assert.match(html, /繁體中文/);
  assert.match(html, /English/);
  assert.match(html, /日本語/);
  assert.doesNotMatch(
    html,
    /codex-preview|Your site is taking shape|react-loading-skeleton/i,
  );
});

test("renders important public routes", async () => {
  for (const [pathname, copy] of [
    ["/play", "Choose how you want to play"],
    ["/learn", "A familiar strategy"],
    ["/leaderboard", "Han vs Chu leaderboard"],
    ["/settings", "Make the board yours"],
    ["/privacy", "Professional review required"],
    ["/terms", "Professional review required"],
  ]) {
    const response = await render(pathname);
    assert.equal(response.status, 200, pathname);
    assert.match(await response.text(), new RegExp(copy, "i"), pathname);
  }
});

test("server-renders the complete interactive learning path", async () => {
  const response = await render("/learn");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /LEARN BY DOING/);
  assert.match(html, /I know Western chess/);
  assert.match(html, /Take the 3-minute placement check/);
  assert.match(html, /Board, setup &amp; coordinates/);
  assert.match(html, /General &amp; Advisor/);
  assert.match(html, /The Elephant’s eye/);
  assert.match(html, /Cannon screens/);
  assert.match(html, /Soldiers after the river/);
  assert.match(html, /Checkmate &amp; stalemate/);
  assert.match(html, /Final check/);
  assert.match(html, /five-position practical readiness check/);
  assert.match(html, /Start guided first game/);
});

test("guided tutorial handoff opens the coached board directly", async () => {
  const response = await render("/play?mode=guided");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /GUIDED FIRST GAME/);
  assert.match(html, /Learn while you play/);
  assert.match(html, /GUIDED · VS COACH/);
  assert.match(html, /Coach bot/);
  assert.match(html, /Show a move/);
  assert.match(html, /Undo turn/);
  assert.match(html, /AI difficulty/);
  assert.match(html, /Beginner/);
  assert.match(html, /Standard/);
  assert.match(html, /Expert/);
  assert.match(html, /CHINESE PIECES/);
  assert.match(html, /General/);
  assert.doesNotMatch(html, /Choose how you want to play/);
});

test("removes starter assets and wires a bespoke social card", async () => {
  const [layout, packageJson] = await Promise.all([
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);
  await assert.rejects(
    access(
      new URL("../app/_sites-preview/SkeletonPreview.tsx", import.meta.url),
    ),
  );
  await access(new URL("../public/og.png", import.meta.url));
  assert.match(layout, /\/og\.png/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
});
