import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { resetPasswordNote } from "./reset-password-note.ts";

describe("resetPasswordNote", () => {
  it("tells an active user they can sign in with welcome123#", () => {
    assert.match(resetPasswordNote([{ IsActive: "Y" }]), /welcome123#/);
    assert.match(resetPasswordNote([{ IsActive: "Y" }]), /accepts that password/);
  });

  it("warns when the account is inactive or missing", () => {
    assert.match(resetPasswordNote([]), /No TUsers row/);
    assert.match(resetPasswordNote([{ IsActive: "N" }]), /inactive/);
    assert.match(resetPasswordNote([{}]), /inactive/);
  });
});
