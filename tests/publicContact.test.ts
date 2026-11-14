import assert from "node:assert/strict";
import test from "node:test";
import { getSiteOrigin } from "../lib/siteOrigin";
import { publicSupportEmail } from "../lib/supportEmail";

test("crawler URLs default to the stable project alias and honor an explicit site origin", () => {
  for (const unset of [undefined, "", "  "]) {
    assert.equal(getSiteOrigin(unset), "https://uremo-frontend.vercel.app");
  }
  assert.equal(getSiteOrigin("  https://public.example.org/// "), "https://public.example.org");
});

test("the previous support inbox requires explicit publication", () => {
  const legacy = "  Support@UREMO.online ";
  assert.equal(publicSupportEmail(legacy), "");
  assert.equal(publicSupportEmail(legacy, false), "");
  assert.equal(publicSupportEmail(legacy, true), legacy.trim());
});

test("custom existing inboxes remain visible until an admin hides them", () => {
  const address = " help+member@example.org ";
  assert.equal(publicSupportEmail(address), address.trim());
  assert.equal(publicSupportEmail(address, false), "");
  assert.equal(publicSupportEmail(address, true), address.trim());
});

test("blank, malformed and overlength inboxes cannot become public links", () => {
  for (const value of [null, false, "", "help", "a@b", "a@b.com?cc=c@d.com", "someone @example.com",
    "a".repeat(109) + "@example.com"]) {
    assert.equal(publicSupportEmail(value, true), "");
  }
});
