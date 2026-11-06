// Run against a running local frontend with Playwright available to Node.
// UREMO_UI_TEST_ORIGIN=http://localhost:3137 node --test tests/withdrawals.browser.mjs
// UREMO_CHROMIUM_PATH can select an existing Chromium installation.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const base = process.env.UREMO_UI_TEST_ORIGIN;
test("withdrawal page uses the wallet contract and retries only the confirmed request", { skip: !base }, async t => {
  const origin = new URL(base);
  assert.ok(origin.protocol === "http:" && ["localhost", "127.0.0.1"].includes(origin.hostname));
  const { chromium } = createRequire(import.meta.url)("playwright");
  const browser = await chromium.launch({ executablePath: process.env.UREMO_CHROMIUM_PATH || undefined, headless: true });
  t.after(() => browser.close());
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  let signedIn = false, failHistory = false, failBalance = false, mode = "success";
  let available = 35.5, pending = 5;
  const requests = [], unexpected = [];
  const records = [{ _id: "fixture-old", amount: 12.25, status: "paid", createdAt: "2026-01-01T12:00:00Z", adminNote: "Payout recorded." }];
  await context.route("**/*", async route => {
    const url = new URL(route.request().url()), path = url.pathname;
    if (!path.startsWith("/api/")) return url.origin === origin.origin ? route.continue() : route.abort();
    const respond = (json, status = 200) => route.fulfill({ status, headers: {
      "content-type": "application/json", "access-control-allow-origin": origin.origin,
      "access-control-allow-credentials": "true", "access-control-allow-methods": "GET,POST,OPTIONS",
      "access-control-allow-headers": "authorization,content-type",
    }, body: JSON.stringify(json) });
    if (route.request().method() === "OPTIONS") return respond({});
    if (path === "/api/payment-methods" || path === "/api/wallet/withdraw" && !signedIn) unexpected.push(path);
    if (path === "/api/wallet/balance") return failBalance ? respond({ error: "Unavailable" }, 503) :
      respond({ balance: 80, spendable: 80 - pending, withdrawable: available, pendingWithdrawals: pending });
    if (path === "/api/wallet/withdrawals") return failHistory ? respond({ error: "Unavailable" }, 503) : respond({ withdrawals: records });
    if (path !== "/api/wallet/withdraw") return respond({});
    const { amount, requestId } = route.request().postDataJSON();
    assert.deepEqual(Object.keys(route.request().postDataJSON()).sort(), ["amount", "requestId"]);
    requests.push({ amount, requestId });
    if (mode === "declined") return respond({ error: "Insufficient withdrawable balance" }, 400);
    let receipt = records.find(row => row._id === requestId);
    if (!receipt) {
      receipt = { _id: requestId, amount, status: "pending", createdAt: new Date().toISOString() };
      records.unshift(receipt); available -= amount; pending += amount;
    }
    if (mode === "lost-response") { mode = "success"; return route.abort(); }
    return respond({ success: true, withdrawal: receipt, withdrawable: available, pendingWithdrawals: pending });
  });
  const page = await context.newPage();
  page.setDefaultTimeout(60_000);
  const path = origin.origin + "/finance/withdrawals";
  await page.goto(path, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.waitForURL(url => url.pathname === "/login" && url.searchParams.get("next") === "/finance/withdrawals", { timeout: 120_000 });
  assert.equal(requests.length, 0);
  signedIn = true;
  await context.addInitScript(() => {
    localStorage.setItem("token", "synthetic-withdrawal-fixture");
    localStorage.setItem("user", JSON.stringify({ email: "local@example.test", role: "user" }));
  });
  await page.goto(path, { waitUntil: "domcontentloaded" });
  const amount = page.getByLabel("Amount (USD)", { exact: true });
  const review = page.getByRole("button", { name: "Review withdrawal", exact: true });
  const confirm = page.getByRole("button", { name: "Confirm withdrawal", exact: true });
  const history = page.getByRole("region", { name: "Withdrawal history" });
  await history.getByText("Paid", { exact: true }).waitFor();
  await history.getByText("Review note: Payout recorded.").waitFor();
  assert.ok(await page.getByRole("region", { name: "Wallet balances" }).getByText("$35.50").isVisible());
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  for (const invalid of ["9.99", "10.005", "36"]) {
    await amount.fill(invalid); await review.click(); await page.getByRole("region", { name: "Request a withdrawal" }).getByRole("alert").waitFor();
    assert.equal(await confirm.count(), 0);
  }
  await amount.fill("25.50"); await review.click(); await confirm.waitFor();
  await page.getByRole("button", { name: "Edit amount" }).click();
  assert.equal(requests.length, 0);
  await review.click(); mode = "lost-response";
  await confirm.evaluate(button => { button.click(); button.click(); });
  await page.getByRole("button", { name: "Retry same request" }).waitFor();
  assert.equal(requests.length, 1);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Retry same request" }).click();
  await page.getByText("Withdrawal request recorded for", { exact: false }).waitFor();
  assert.deepEqual(requests[0], requests[1]);
  assert.equal(requests[0].amount, 25.5);
  assert.equal(records.length, 2);
  assert.equal(available, 10);
  mode = "declined"; await amount.fill("10"); await review.click(); await confirm.click();
  await page.getByText("Insufficient withdrawable balance", { exact: true }).waitFor();
  assert.notEqual(requests[1].requestId, requests[2].requestId);
  failHistory = true; failBalance = true;
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Retry balances" }).waitFor();
  assert.equal(await review.isDisabled(), true);
  await history.getByText("Withdrawal history could not be loaded.").waitFor();
  assert.equal(await history.getByText("You have no withdrawal requests.").count(), 0);
  failBalance = false; failHistory = false;
  await page.getByRole("button", { name: "Retry balances" }).click();
  await history.getByText("Pending review", { exact: true }).waitFor();
  assert.deepEqual(unexpected, []);
});
