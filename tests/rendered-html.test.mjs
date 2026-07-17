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

test("server-renders the Xiangqi Arena product landing page", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(
    html,
    /<title>Xiangqi Arena — Play &amp; Learn Chinese Chess<\/title>/i,
  );
  assert.match(html, /The fastest way/);
  assert.match(html, /into.*Xiangqi/);
  assert.match(html, /No account needed/);
  assert.match(html, /Create private game/);
  assert.match(html, /Learn the rules/);
  assert.doesNotMatch(
    html,
    /codex-preview|Your site is taking shape|react-loading-skeleton/i,
  );
});

test("renders important public routes", async () => {
  for (const [pathname, copy] of [
    ["/play", "Choose how you want to play"],
    ["/learn", "A familiar strategy"],
    ["/leaderboard", "Arena leaderboard"],
    ["/settings", "Make the board yours"],
    ["/privacy", "Professional review required"],
    ["/terms", "Professional review required"],
  ]) {
    const response = await render(pathname);
    assert.equal(response.status, 200, pathname);
    assert.match(await response.text(), new RegExp(copy, "i"), pathname);
  }
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
