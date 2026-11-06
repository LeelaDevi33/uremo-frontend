import assert from "node:assert/strict";
import test from "node:test";
import { availableFor, chargeTerms, isProjectOffer, legacyCatalogPath, matchesCatalogSearch, roleApplicationPath, type Opportunity } from "../lib/opportunities";
import { linkedApplicationPosition } from "../lib/applicationLink";
import { authReturnPath } from "../lib/authReturnPath";

const role = { _id: "b00000000000000000000001", title: "Design", category: "design", active: true };
const offer: Opportunity = {
  _id: "a00000000000000000000001", projectId: "c00000000000000000000001", title: "Design review",
  description: "Review an accessible interface.", category: "design", status: "published", availability: "available",
  kind: "project", needsReview: false, applyEnabled: false, workPositionId: role._id, workPositionTitle: role.title,
  rentEnabled: true, rentPrice: 14.25, rentalDays: 7, buyEnabled: true, buyPrice: 85, currency: "USD",
};
test("only an active specialization links to the free role application", () => {
  const target = new URL(roleApplicationPath(role)!, "https://example.test");
  assert.equal(linkedApplicationPosition([role], target.searchParams), role);
  assert.equal(roleApplicationPath({ ...role, active: false }), null);
  for (const key of ["opportunityId", "projectId"]) {
    target.searchParams.set(key, offer._id);
    assert.equal(linkedApplicationPosition([role], target.searchParams), null);
    target.searchParams.delete(key);
  }
});
test("legacy or mixed listings cannot be discovered or checked out", () => {
  for (const patch of [{ kind: undefined }, { kind: "legacy" as const }, { applyEnabled: true }, { needsReview: true }, { projectId: null }, { workPositionId: null }]) {
    const old = { ...offer, ...patch };
    assert.equal(isProjectOffer(old), false);
    assert.equal(availableFor(old, "rent"), false);
    assert.equal(availableFor(old, "buy"), false);
  }
});
test("only offered paid modes with valid published terms and available inventory are actionable", () => {
  assert(availableFor(offer, "rent")); assert(availableFor(offer, "buy"));
  for (const availability of ["sold", "rented"] as const) {
    assert(!availableFor({ ...offer, availability }, "buy")); assert(!availableFor({ ...offer, availability }, "rent"));
  }
  assert(!availableFor({ ...offer, rentEnabled: false }, "rent")); assert(!availableFor({ ...offer, buyEnabled: false }, "buy"));
  assert(!availableFor({ ...offer, status: "draft" }, "buy")); assert(!availableFor({ ...offer, rentPrice: NaN }, "rent"));
  assert.deepEqual(chargeTerms({ ...offer, revision: "r3" }, "rent"), { expectedAmount: 14.25, expectedRentalDays: 7, expectedRevision: "r3" });
});
test("legacy discovery links, search and signed-in returns resolve to the appropriate workflow", () => {
  assert.equal(legacyCatalogPath("apply"), "/open-roles"); assert.equal(legacyCatalogPath("earn"), "/open-roles");
  assert.equal(legacyCatalogPath("rent"), "/projects/rent"); assert.equal(legacyCatalogPath("buy"), "/projects/full-access");
  assert(matchesCatalogSearch(["Project brief", "Design", "Accessibility"], "accessi DESIGN")); assert(!matchesCatalogSearch(["Design"], "Math"));
  const path = "/opportunities/" + offer._id + "?mode=buy";
  assert.equal(authReturnPath(path), path); assert.equal(authReturnPath("//outside.test"), null);
});
