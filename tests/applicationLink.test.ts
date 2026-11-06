import assert from "node:assert/strict";
import test from "node:test";
import { applicationHref, linkedApplicationPosition } from "../lib/applicationLink";

const serviceId = "a00000000000000000000001";
const otherService = "a00000000000000000000002";
const role = { _id: "b00000000000000000000001", serviceId, active: true };
const otherRole = { _id: "b00000000000000000000002", serviceId: otherService, active: true };
const roles = [role, otherRole];

test("marketplace and detail links round-trip with or without a populated role", () => {
  for (const positionId of [role._id, undefined]) {
    const url = new URL(applicationHref(serviceId, positionId), "https://example.test");
    assert.equal(url.pathname, "/apply-to-work");
    assert.equal(url.searchParams.get("serviceId"), serviceId);
    assert.equal(url.searchParams.get("positionId"), positionId ?? null);
    assert.equal(linkedApplicationPosition(roles, url.searchParams), role);
  }
});

test("legacy position, job and service links resolve to the same active role", () => {
  for (const query of [
    { positionId: role._id },
    { jobId: role._id },
    { serviceId: serviceId.toUpperCase() },
    { serviceId, positionId: role._id, jobId: role._id },
  ]) {
    assert.equal(linkedApplicationPosition(roles, new URLSearchParams(Object.entries(query))), role);
  }
  const populated = { ...role, serviceId: { _id: serviceId } };
  assert.equal(linkedApplicationPosition([populated], new URLSearchParams({ serviceId })), populated);
});

test("conflicting, malformed, inactive, unmapped and ambiguous links block selection", () => {
  for (const query of [
    `positionId=${role._id}&jobId=${otherRole._id}`,
    `serviceId=${serviceId}&positionId=${otherRole._id}`,
    `serviceId=${serviceId}&serviceId=${otherService}`,
    "jobId=", "serviceId=unknown", "positionId=ffffffffffffffffffffffff",
  ]) {
    assert.equal(linkedApplicationPosition(roles, new URLSearchParams(query)), null);
  }
  const query = new URLSearchParams({ serviceId });
  assert.equal(linkedApplicationPosition([{ ...role, active: false }, otherRole], query), null);
  assert.equal(linkedApplicationPosition([role, { ...otherRole, serviceId }], query), null);
  assert.equal(linkedApplicationPosition([], query), null);
});

test("plain browsing and category filtering keep explicit role selection available", () => {
  assert.equal(linkedApplicationPosition(roles, new URLSearchParams()), undefined);
  assert.equal(linkedApplicationPosition(roles, new URLSearchParams({ category: "writing" })), undefined);
});
