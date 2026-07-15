import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function worker() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  return (await import(workerUrl.href)).default;
}

function env() {
  return {
    ASSETS: {
      fetch: async () => new Response("Not found", { status: 404 }),
    },
  };
}

const context = {
  waitUntil() {},
  passThroughOnException() {},
};

test("server-renders the LoopVoca learning experience", async () => {
  const app = await worker();
  const response = await app.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    env(),
    context,
  );

  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>LoopVoca \| AI Vocabulary Memory Evaluation<\/title>/i);
  assert.match(html, /LOOPVOCA/);
  assert.match(html, /외웠는지가 아니라/);
  assert.match(html, /오늘의 맞춤 루프/);
  assert.match(html, /GPT-5\.6/);
  assert.match(html, />EN</);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|react-loading-skeleton/i);
});

test("evaluates recall locally when no API key is configured", async () => {
  const app = await worker();
  const response = await app.fetch(
    new Request("http://localhost/api/evaluate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        target: "Can I borrow your pencil?",
        answer: "can i borrow your pencil",
        meaning: "네 연필을 빌려도 될까?",
      }),
    }),
    env(),
    context,
  );

  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.correct, true);
  assert.equal(data.source, "local-fallback");
  assert.equal(data.feedbackEn.length > 0, true);
});

test("keeps account creation optional for anonymous learners", async () => {
  const app = await worker();
  const response = await app.fetch(
    new Request("http://localhost/api/account"),
    env(),
    context,
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { authenticated: false });

  const [page, accountRoute, progressRoute] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/account/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/progress/route.ts", import.meta.url), "utf8"),
  ]);
  assert.match(page, /\/signin-with-chatgpt\?return_to=/);
  assert.match(page, /가입 없이 계속 체험/);
  assert.match(accountRoute, /getChatGPTUser/);
  assert.match(progressRoute, /resolveLearnerId/);
});

test("ships a complete 30-word learning dataset", async () => {
  const source = await readFile(new URL("../data/words.ts", import.meta.url), "utf8");
  const entries = source.match(/\n    id: "/g) ?? [];
  assert.equal(entries.length, 30);
  assert.match(source, /shuffledDailyWords/);
  assert.match(source, /meaningKo/);
  assert.match(source, /definitionEn/);
});

test("ships finished metadata and a project-bound social card", async () => {
  const [layout, packageJson] = await Promise.all([
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(layout, /og\.png/);
  assert.match(layout, /summary_large_image/);
  assert.doesNotMatch(layout, /Starter Project|codex-preview|_sites-preview/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  await access(new URL("public/og.png", root));
  await assert.rejects(access(new URL("app/_sites-preview/SkeletonPreview.tsx", root)));
});
