import assert from "node:assert/strict";
import {
  getVerificationBadgeKey,
  getVerificationBadgeKind,
} from "../src/utils/profileVerification.js";

assert.equal(getVerificationBadgeKind({ type: "person", verified: true }), null);
assert.equal(getVerificationBadgeKind({ type: "school", verified: true, status: "active" }), "school");
assert.equal(getVerificationBadgeKind({ type: "club", verified: true, status: "active" }), "organization");
assert.equal(getVerificationBadgeKind({ type: "organization", verified: false, status: "active" }), null);
assert.equal(getVerificationBadgeKind({ type: "organization", verified: false, status: "pending_claim" }), "pending");
assert.equal(getVerificationBadgeKey({ type: "school", verified: true, status: "active" }), "profiles.verification.school");

console.log("official verification badge rules ok");
