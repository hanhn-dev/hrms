import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { loginFailure } from "./login-failure.ts";

describe("loginFailure", () => {
  it("explains a cancelled or unassigned sign-in", () => {
    const failure = loginFailure("AccessDenied");
    assert.equal(failure.title, "Sign-in was cancelled");
    assert.match(failure.body, /not assigned to Backstage/);
    assert.equal(failure.reference, "AccessDenied");
  });

  it("explains a missing Microsoft connection", () => {
    assert.equal(
      loginFailure("Configuration").title,
      "Backstage sign-in is unavailable",
    );
  });

  it("groups unfinished OAuth callbacks", () => {
    assert.equal(loginFailure("OAuthCallback").title, "Sign-in did not finish");
    assert.equal(loginFailure("Callback").title, "Sign-in did not finish");
  });

  it("uses a generic message for an unknown error", () => {
    const failure = loginFailure("");
    assert.equal(failure.title, "Sign-in failed");
    assert.equal(failure.reference, "");
  });
});
