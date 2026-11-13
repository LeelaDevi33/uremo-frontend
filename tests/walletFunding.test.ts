import assert from "node:assert/strict";
import test from "node:test";
import { paypalApprovalUrl } from "../lib/walletFunding";
import { authReturnPath } from "../lib/authReturnPath";

test("funding checkout uses the configured PayPal environment and preserves the signed-in return", () => {
  const url = "https://www.paypal.com/checkoutnow?token=example";
  const sandbox = "https://www.sandbox.paypal.com/checkoutnow?token=example";
  assert.equal(paypalApprovalUrl(url, "live"), url);
  assert.equal(paypalApprovalUrl(sandbox, "sandbox"), sandbox);
  for (const raw of [sandbox, "http://paypal.com/", "https://paypal.com.attacker.invalid/", "https://foo@paypal.com/", "https://paypal.com:8888/", "javascript:alert(1)"]) {
    assert.throws(() => paypalApprovalUrl(raw, "live"));
  }
  assert.throws(() => paypalApprovalUrl(url, "sandbox"));
  const returnPath = "/wallet?paypal=success&token=example";
  assert.equal(authReturnPath(returnPath), returnPath);
  assert.equal(authReturnPath("//unknown.invalid/wallet"), null);
});
