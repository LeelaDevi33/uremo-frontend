import assert from "node:assert/strict";
import test from "node:test";
import { applicationPath, availableFor, chargeTerms, filteredOpportunities, readIntent, type Opportunity } from "../lib/opportunities";
import { linkedApplicationPosition } from "../lib/applicationLink";

const listing: Opportunity = {
  _id: "a00000000000000000000001", title: "Design review", description: "Review an accessible interface.",
  category: "design", status: "published", availability: "available", applyEnabled: true,
  workPositionId: "b00000000000000000000001", rentEnabled: true, rentPrice: 14.25,
  rentalDays: 7, buyEnabled: true, buyPrice: 85, currency: "USD",
};

test("one available opportunity exposes independently configured actions and its exact application role", () => {
  for (const intent of ["apply", "rent", "buy"] as const) assert.ok(availableFor(listing, intent));
  const target = new URL(applicationPath(listing)!, "https://example.test");
  assert.equal(target.pathname, "/apply-to-work");
  const role = { _id: listing.workPositionId!, active: true };
  assert.equal(linkedApplicationPosition([role], target.searchParams), role);
  assert.equal(applicationPath({ ...listing, workPositionId: null }), null);
  assert.equal(applicationPath({ ...listing, applyEnabled: false }), null);
  assert.equal(availableFor({ ...listing, rentEnabled: false }, "rent"), false);
  assert.equal(availableFor({ ...listing, buyEnabled: false }, "buy"), false);
});

test("a rental locks both paid actions while applications remain available; sale closes all three", () => {
  const rental: Opportunity = { ...listing, availability: "rented" };
  assert.ok(availableFor(rental, "apply"));
  assert.equal(availableFor(rental, "rent"), false);
  assert.equal(availableFor(rental, "buy"), false);
  for (const intent of ["apply", "rent", "buy"] as const) {
    assert.equal(availableFor({ ...listing, availability: "sold" }, intent), false);
    assert.equal(availableFor({ ...listing, status: "archived" }, intent), false);
  }
});

test("catalog search combines category and intent and excludes archived, draft and sold listings", () => {
  const rows: Opportunity[] = [listing, { ...listing, status: "draft" }, { ...listing, status: "archived" }, { ...listing, availability: "sold" }];
  assert.deepEqual(filteredOpportunities(rows, "all", "", ""), [listing]);
  assert.deepEqual(filteredOpportunities(rows, "rent", "design", "  ACCESSIBLE "), [listing]);
  assert.deepEqual(filteredOpportunities(rows, "apply", "data", ""), []);
  assert.deepEqual(filteredOpportunities(rows, "buy", "", "unknown"), []);
  assert.equal(readIntent("earn"), "apply");
  assert.equal(readIntent("deal"), "all");
});

test("payment sends the exact displayed price and rental term, suppressing invalid quotes", () => {
  assert.deepEqual(chargeTerms(listing, "rent"), { expectedAmount: 14.25, expectedRentalDays: 7 });
  assert.deepEqual(chargeTerms(listing, "buy"), { expectedAmount: 85 });
  assert.equal(availableFor({ ...listing, rentalDays: 0 }, "rent"), false);
  assert.equal(availableFor({ ...listing, rentPrice: NaN }, "rent"), false);
  assert.equal(availableFor({ ...listing, buyPrice: -10 }, "buy"), false);
});
