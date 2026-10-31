/**
 * Smoke suite for Riftbound Companion.
 *
 * Usage: npm run smoke
 * Spins up `next start` on a test port, runs browser checks against the
 * production build, prints PASS/FAIL per check, and exits non-zero if
 * any check fails. Requires `npm run build` to have succeeded first.
 */
import { spawn } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { chromium } from "playwright-core";

// Resolve a Chromium binary: explicit env override first, then the
// Playwright-managed revision, then any cached headless-shell revision
// (the managed download can fail on flaky networks, and an older cached
// shell is fine for these smoke checks).
function resolveChromiumPath() {
  if (process.env.SMOKE_CHROMIUM_PATH && existsSync(process.env.SMOKE_CHROMIUM_PATH)) {
    return process.env.SMOKE_CHROMIUM_PATH;
  }
  const cache = path.join(homedir(), ".cache", "ms-playwright");
  if (!existsSync(cache)) return undefined;
  const shells = readdirSync(cache)
    .filter((d) => d.startsWith("chromium_headless_shell-"))
    .sort()
    .reverse();
  for (const dir of shells) {
    const p = path.join(cache, dir, "chrome-linux", "headless_shell");
    if (existsSync(p)) return p;
  }
  return undefined;
}

const PORT = process.env.SMOKE_PORT || "3100";
const BASE = `http://localhost:${PORT}`;
const results = [];

function check(name, ok, detail = "") {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

async function waitForServer(proc, timeoutMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${BASE}/`);
      if (res.ok) return true;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  console.log(proc ? "" : "");
  return false;
}

const server = spawn("npx", ["next", "start", "-p", PORT], {
  cwd: new URL("..", import.meta.url).pathname,
  stdio: "pipe",
});
server.stdout.on("data", () => {});
server.stderr.on("data", () => {});

let browser;
try {
  const up = await waitForServer(server);
  check("production server starts", up);
  if (!up) throw new Error("server did not start");

  const executablePath = resolveChromiumPath();
  browser = await chromium.launch(
    executablePath ? { executablePath } : {},
  );
  const page = await browser.newPage();

  // 1. Home loads.
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  const hero = await page.textContent("h1");
  check("home loads", (hero ?? "").includes("Collect. Build. Compete."), hero ?? "");

  // 2. Card search returns results.
  await page.goto(`${BASE}/cards`, { waitUntil: "networkidle" });
  await page.fill('input[aria-label="Search cards"]', "a");
  await page.waitForTimeout(500);
  const status = await page.textContent('[role="status"]');
  const match = /([\d,]+) card/.exec(status ?? "");
  const count = match ? parseInt(match[1].replace(/,/g, ""), 10) : 0;
  check("card search returns results", count > 0, status ?? "");

  // 3. Add-to-collection works.
  const firstAdd = page.getByRole("button", { name: "+ Add", exact: true }).first();
  if (await firstAdd.count()) {
    await firstAdd.click();
    // The tile shows "Owned: 1" once the click registers in React state.
    const ownedShown = await page
      .getByText("Owned: 1", { exact: false })
      .first()
      .isVisible()
      .catch(() => false);
    await page.goto(`${BASE}/collection`, { waitUntil: "networkidle" });
    // The collection page hydrates from localStorage on the client, so
    // wait for the hydrated count instead of reading pre-hydration SSR.
    const hydrated = await page
      .waitForFunction(
        () => document.body.textContent?.includes("Copies owned: 1"),
        { timeout: 15000 },
      )
      .then(() => true)
      .catch(() => false);
    const body = await page.textContent("body");
    check(
      "add-to-collection persists",
      hydrated,
      `owned-shown=${ownedShown} hydrated=${hydrated} region=${JSON.stringify((body ?? "").slice((body ?? "").indexOf("Copies owned"), (body ?? "").indexOf("Copies owned") + 30))}`,
    );
  } else {
    check("add-to-collection persists", false, "no + Add button found");
  }

  // 4. Deck create / add / remove / autosave.
  await page.goto(`${BASE}/decks/new`, { waitUntil: "networkidle" });
  await page.fill('input[placeholder="Untitled deck"]', "Smoke Deck");
  await page.getByRole("button", { name: "Create deck" }).click();
  await page.waitForURL(/\/decks\/deck-/, { timeout: 10000 });
  const deckUrl = page.url();
  await page.fill('input[aria-label="Search card pool"]', "a");
  await page.waitForTimeout(500);
  const poolAdd = page.getByRole("button", { name: "+ Add", exact: true }).first();
  const poolCount = await poolAdd.count();
  if (poolCount) {
    await poolAdd.click();
    await page.waitForTimeout(500);
    const listText = await page.textContent("body");
    const added = /\d+×/.test(listText ?? "");
    check("deck add works", added, "deck list after add");
    // Remove it again.
    const removeBtn = page.getByRole("button", { name: /Remove one/ }).first();
    if (await removeBtn.count()) {
      await removeBtn.click();
      await page.waitForTimeout(300);
    }
    // Reload: autosave/localStorage must keep the deck itself.
    await page.reload({ waitUntil: "networkidle" });
    const afterReload = await page.textContent("h1");
    check("deck autosave persists across reload", (afterReload ?? "").includes("Smoke Deck"), deckUrl);
  } else {
    check("deck add works", false, "no pool + Add button found");
    check("deck autosave persists across reload", false, "deck add step failed");
  }

  // 5. Match log + win rate.
  await page.goto(`${BASE}/matches`, { waitUntil: "networkidle" });
  const deckOptions = await page.locator("select").first().locator("option").count();
  if (deckOptions > 1) {
    await page.locator("select").first().selectOption({ index: 1 });
    await page.fill('input[placeholder="e.g. Jinx"]', "Smoke Opponent");
    await page.getByRole("button", { name: "Log match" }).click();
    await page.waitForTimeout(500);
    const mBody = await page.textContent("body");
    check(
      "match log + win rate displays",
      (mBody ?? "").includes("1W – 0L"),
      "overall line after logging 1-0",
    );
  } else {
    check("match log + win rate displays", false, "no deck available to log against");
  }
} catch (err) {
  console.error("Smoke error:", err.message);
} finally {
  if (browser) await browser.close().catch(() => {});
  server.kill("SIGTERM");
}

const failed = results.filter((r) => !r.ok);
console.log(
  `\n${results.length - failed.length}/${results.length} checks passed`,
);
process.exit(failed.length ? 1 : 0);
