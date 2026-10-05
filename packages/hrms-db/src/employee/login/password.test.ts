import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEFAULT_RESET_PASSWORD, encodeHrmsPassword } from "./password.ts";

describe("encodeHrmsPassword", () => {
  it("matches EncryptionDecryption plus ConvertStrToBase64 for welcome123#", () => {
    assert.equal(DEFAULT_RESET_PASSWORD, "welcome123#");
    assert.equal(
      encodeHrmsPassword(DEFAULT_RESET_PASSWORD),
      "UzluVXl5ZEdYdWtWck9yZ1o2YnBqSFEwNFduMzg5c29rZE9SRTNPbWdXWT0=",
    );
  });

  it("rejects an empty password", () => {
    assert.throws(() => encodeHrmsPassword(""), /Password/);
  });
});
