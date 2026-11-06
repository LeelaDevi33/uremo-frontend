import assert from "node:assert/strict";
import test from "node:test";
import {
  editorError,
  listingPayload,
  toDraft,
  type OpportunityDetail,
} from "../app/admin/opportunities/editor";

const role = { _id: "role-1", title: "Project worker", active: true };
const complete = {
  ...toDraft(),
  title: " Project ",
  description: "Public terms",
  category: "research",
  applyEnabled: true,
  workPositionId: role._id,
  rentEnabled: true,
  rentalDays: "7",
  rentPrice: "12.45",
  buyEnabled: true,
  buyPrice: "90",
  deliverable: "Private instructions",
  rightsConfirmed: true,
};

test("empty draft saves without public access and cannot publish", () => {
  const draft = toDraft();
  assert.equal(editorError(draft, "draft", []), null);
  assert.match(editorError(draft, "published", []) ?? "", /title/);
  assert.equal(listingPayload(draft, "draft").workPositionId, null);
});

test("publishing requires authorization, valid access modes and an active linked role", () => {
  assert.equal(editorError(complete, "published", [role]), null);
  assert.match(
    editorError({ ...complete, rightsConfirmed: false }, "published", [role]) ??
      "",
    /authority/,
  );
  assert.match(
    editorError(
      {
        ...complete,
        applyEnabled: false,
        rentEnabled: false,
        buyEnabled: false,
      },
      "published",
      [],
    ) ?? "",
    /at least one/,
  );
  assert.match(
    editorError(complete, "published", [{ ...role, active: false }]) ?? "",
    /active work role/,
  );
  assert.match(
    editorError({ ...complete, deliverable: "  " }, "published", [role]) ?? "",
    /handoff/,
  );
});

test("USD rental and buyout amounts and duration must be unambiguous", () => {
  for (const price of [
    "0",
    "-1",
    "1e2",
    "12.345",
    "Infinity",
    "",
    "9999999999999999",
  ]) {
    assert.ok(
      editorError({ ...complete, rentPrice: price }, "published", [role]),
    );
    assert.ok(
      editorError({ ...complete, buyPrice: price }, "published", [role]),
    );
  }
  for (const days of ["0", "366", "1.5", "", "-3"]) {
    assert.ok(
      editorError({ ...complete, rentalDays: days }, "published", [role]),
    );
  }
  for (const rentalDays of ["1", "365"])
    assert.equal(
      editorError({ ...complete, rentalDays }, "published", [role]),
      null,
    );
  const payload = listingPayload(complete, "published");
  assert.deepEqual(
    [
      payload.title,
      payload.rentPrice,
      payload.rentalDays,
      payload.buyPrice,
      payload.currency,
    ],
    ["Project", 12.45, 7, 90, "USD"],
  );
  assert.equal(payload.deliverable, "Private instructions");
  assert.equal("availability" in payload, false);
});

test("published role identity and closed ownership survive later edits", () => {
  const previous: OpportunityDetail = {
    ...listingPayload(complete, "archived"),
    currency: "USD",
    _id: "listing",
    revision: "2026-11-06T00:00:00.000Z",
    availability: "available",
    firstPublishedAt: "2026-11-06",
  };
  const draft = toDraft(previous);
  assert.equal(draft.rentPrice, "12.45");
  assert.match(
    editorError(
      { ...draft, workPositionId: "other" },
      "published",
      [role],
      previous,
    ) ?? "",
    /fixed/,
  );
  assert.match(
    editorError(draft, "draft", [role], {
      ...previous,
      availability: "sold",
    }) ?? "",
    /closed/,
  );
});
