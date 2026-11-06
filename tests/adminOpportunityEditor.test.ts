import assert from "node:assert/strict";
import test from "node:test";
import {
  editorError, listingPayload, needsMapping, selectableProject, toDraft,
  type OpportunityDetail, type ProjectChoice,
} from "../app/admin/opportunities/editor";

const project: ProjectChoice = {
  _id: "p1", title: "Landing page QA", status: "open",
  workPositionId: { _id: "s1", title: "Accessibility testing" },
};
const ready = {
  ...toDraft(), title: " Test brief ", projectId: project._id, category: "research",
  description: "Review a landing page.", deliverable: "Private handoff",
  rentEnabled: true, rentPrice: "12.45", rentalDays: "7",
  buyEnabled: true, buyPrice: "80", rightsConfirmed: true,
};

function fixture(overrides: Partial<OpportunityDetail> = {}): OpportunityDetail {
  return {
    ...listingPayload(ready, "published"), _id: "offer", revision: "rev",
    kind: "project", needsReview: false, canConvert: false, availability: "available",
    workPositionId: project.workPositionId!._id, firstPublishedAt: "2026-11-06",
    ...overrides,
  };
}

test("project terms cannot create an application or choose a different specialization", () => {
  const payload = listingPayload(ready, "published");
  assert.equal(payload.projectId, "p1");
  assert.equal(payload.applyEnabled, false);
  assert.equal("workPositionId" in payload, false);
  assert.equal("availability" in payload, false);
  assert.equal(payload.title, "Test brief");
  assert.equal(toDraft(fixture()).projectId, project._id);
});

test("offer must identify an unstaffed project in a real specialization", () => {
  for (const row of [
    { ...project, workPositionId: null }, { ...project, status: "cancelled" },
    { ...project, status: "completed" }, { ...project, status: "in_progress" },
    { ...project, assignedTo: { _id: "worker" } },
  ]) {
    assert.equal(selectableProject(row), false);
    assert.match(editorError(ready, "draft", [row]) || "", /specialization/);
  }
  assert.equal(editorError(ready, "draft", [project]), null);
  assert.ok(editorError({ ...ready, projectId: "wrong" }, "published", [project]));
});

test("rent-only, full-access-only and combined offers have distinct paid terms", () => {
  for (const [rentEnabled, buyEnabled] of [[true, false], [false, true], [true, true]]) {
    const config = { ...ready, rentEnabled, buyEnabled };
    assert.equal(editorError(config, "published", [project]), null);
    const terms = listingPayload(config, "published");
    assert.equal(terms.rentPrice, rentEnabled ? 12.45 : 0);
    assert.equal(terms.rentalDays, rentEnabled ? 7 : 0);
    assert.equal(terms.buyPrice, buyEnabled ? 80 : 0);
  }
  assert.match(editorError({ ...ready, rentEnabled: false, buyEnabled: false }, "published", [project]) || "", /Enable Rent/);
  assert.ok(editorError({ ...ready, deliverable: " " }, "published", [project]));
  assert.ok(editorError({ ...ready, rightsConfirmed: false }, "published", [project]));
  for (const price of ["", "0", "1e2", "1.234", "-1", "9999999999999999"]) {
    assert.ok(editorError({ ...ready, rentPrice: price }, "published", [project]));
    assert.ok(editorError({ ...ready, buyPrice: price }, "published", [project]));
  }
  for (const days of ["0", "366", "1.5"]) assert.ok(editorError({ ...ready, rentalDays: days }, "published", [project]));
});

test("legacy conversion requires explicit project mapping, draft review and no past receipts", () => {
  const legacy = fixture({ kind: "legacy", needsReview: true, canConvert: true, applyEnabled: true, projectId: null });
  assert.ok(needsMapping(legacy));
  assert.equal(toDraft(legacy).projectId, "");
  assert.ok(editorError(toDraft(legacy), "draft", [project], legacy));
  assert.ok(editorError(ready, "published", [project], legacy));
  assert.equal(editorError(ready, "draft", [project], legacy), null);
  assert.ok(editorError(ready, "draft", [project], { ...legacy, canConvert: false, availability: "available" }));
  assert.ok(needsMapping(fixture({applyEnabled:true})));
});

test("an offer bound by publication or exclusive purchase cannot be reassigned", () => {
  const other = { ...project, _id: "p2" };
  assert.ok(editorError({ ...ready, projectId: "p2" }, "published", [other], fixture()));
  assert.equal(editorError({ ...ready, projectId: "p2" }, "draft", [other], fixture({ firstPublishedAt: null, status: "draft" })), null);
  assert.ok(editorError(ready, "archived", [project], fixture({ availability: "sold" })));
});
