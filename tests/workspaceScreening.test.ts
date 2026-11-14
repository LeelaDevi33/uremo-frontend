import { strict as assert } from "node:assert";
import { test } from "node:test";
import { hasActiveScreening, screeningOutcome, screeningProgress, type ScreeningAttempt } from "../lib/workspaceScreening";

test("manual review controls qualification even if a preliminary score passed", () => {
  const attempt = { screeningId: "manual", completedAt: "2026-11-13", passed: true };
  assert.equal(screeningOutcome({ ...attempt, submissionStatus: "pending_review" }), "Awaiting review");
  assert.equal(screeningOutcome({ ...attempt, submissionStatus: "rejected" }), "Failed");
  assert.equal(screeningOutcome({ ...attempt, passed: false, submissionStatus: "approved" }), "Passed");
  assert.equal(screeningOutcome(attempt), "Passed");
  assert.equal(screeningOutcome({ ...attempt, passed: null }), "Awaiting review");
});

test("worker actions respect role scope, review, inactive assessments and admin resets", () => {
  const attempt = (id: string, passed?: boolean, submissionStatus?: string): ScreeningAttempt =>
    ({ screeningId: id, completedAt: "2026-11-13", passed, submissionStatus });
  const app = {
    requiredScreenings: [{ _id: "passed" }, { _id: "waiting" }, { _id: "retired", active: false }, { _id: "next" }],
    screeningsCompleted: [attempt("other-role", true), attempt("passed", true), attempt("waiting", true, "pending_review")],
    workerStatus: "training_viewed",
  };
  assert.equal(screeningProgress(app).next?._id, "next");
  assert.equal(hasActiveScreening(app), true);
  const historical = { ...app, roleArchived: true };
  assert.equal(hasActiveScreening(historical), false);
  assert.equal(screeningProgress(historical).next, undefined);
  assert.equal(screeningProgress(historical).passed.has("passed"), true);
  for (const workerStatus of ["failed", "suspended", "test_submitted", "applied"]) {
    assert.equal(screeningProgress({ ...app, workerStatus }).next, undefined);
  }
  assert.equal(screeningProgress({ ...app, screening: { _id: "legacy" }, requiredScreenings: [], workerStatus: "screening_available" }).next?._id, "legacy");
});
