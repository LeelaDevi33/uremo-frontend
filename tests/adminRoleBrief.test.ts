import assert from "node:assert/strict";
import test from "node:test";
import { briefFields, briefPayload, roleReviewNotes } from "../app/admin/work-positions/roleBrief";

test("admin review notes identify duplicate public titles, empty fields and unlinked screenings", () => {
  const base = { title: "Research review", requirements: "Read a brief", description: "Review findings" };
  const notes = roleReviewNotes([
    { ...base, _id: "1" }, { ...base, _id: "2", title: "  RESEARCH   review ", requirements: " ", hasScreening: true },
    { ...base, _id: "3", active: false }, { ...base, _id: "4", isSpecialization: false },
    { ...base, _id: "5", title: "Design", hasScreening: true, screeningIds: ["a"] },
  ]);
  assert.deepEqual([...notes.keys()], ["1", "2"]);
  assert.deepEqual(notes.get("1"), ["Another open role uses this title"]);
  assert.deepEqual(notes.get("2"), ["Another open role uses this title", "Requirements are empty", "Screening enabled without a linked assessment"]);
});

test("a legacy role retains its multiline requirements without inventing optional facts", () => {
  const original = { description: "Translation QA", requirements: "Read Bengali\nReview written English" };
  const saved = briefPayload(briefFields(original));
  assert.equal(saved.requirements, original.requirements);
  assert.equal(saved.description, original.description);
  assert.equal(saved.experienceLevel, "");
  assert.equal(saved.workMode, "");
  assert.deepEqual(saved.skills, []);
  assert.deepEqual(saved.responsibilities, []);
});

test("editing a role preserves ordered list entries and supports clearing a single field", () => {
  const fields = briefFields({
    experienceLevel: "advanced", workMode: "hybrid",
    locationEligibility: "Pune", timeCommitment: "5 hours per project",
    skills: ["Spanish, written", "Editing"], responsibilities: ["Review citations", "Check locale"],
  });
  fields.locationEligibility = "";
  fields.skills = " Editing \r\n\r\nSpanish, written";
  const saved = briefPayload(fields);
  assert.deepEqual(saved.skills, ["Editing", "Spanish, written"]);
  assert.deepEqual(saved.responsibilities, ["Review citations", "Check locale"]);
  assert.equal(saved.locationEligibility, "");
  assert.equal(saved.workMode, "hybrid");
  assert.equal(saved.timeCommitment, "5 hours per project");
  assert.throws(() => briefPayload({ ...fields, skills: "Bengali\nbengali" }), /repeated/);
  assert.throws(() => briefPayload({ ...fields, responsibilities: "a".repeat(241) }), /240/);
});
