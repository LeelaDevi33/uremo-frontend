import assert from "node:assert/strict";
import test from "node:test";
import { workerIdentity } from "../app/admin/workforce/[workerId]/workerIdentity";

test("the canonical account name from User is visible on the application", () => {
  const user = { _id: "one", name: "Mara van Holt", email: "mara@example.test" };
  const identity = workerIdentity(user, { ...user, firstName: "Mara", lastName: "van Holt" });
  assert.deepEqual([identity.firstName, identity.lastName, identity._id], ["Mara", "van Holt", "one"]);
});

test("legacy accounts, normalized-only responses and mononyms remain valid", () => {
  assert.equal(workerIdentity({ _id: "one", firstName: "Mara", lastName: "Lee" }).lastName, "Lee");
  assert.equal(workerIdentity(null, { _id: "one", name: "Mara" }).firstName, "Mara");
});

test("missing accounts remain locked and conflicting account IDs cannot supply identity", () => {
  assert.equal(workerIdentity(null, { _id: null, name: "Unknown Worker" })._id, "");
  const incomplete = workerIdentity({ _id: "one" }, { _id: "two", email: "other@example.test", firstName: "Other" });
  assert.equal(incomplete.email, "");
  assert.equal(incomplete.firstName, "");
});
