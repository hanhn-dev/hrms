import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { forbiddenMessage } from "./forbidden-copy.ts";

describe("forbiddenMessage", () => {
  it("names the area, the person, and the role they need", () => {
    const message = forbiddenMessage("employers", {
      name: "Ada Lovelace",
      email: "ada@contoso.com",
    });
    assert.equal(message.title, "You don't have access to Console.");
    assert.match(message.body, /Ada Lovelace \(ada@contoso.com\)/);
    assert.match(message.body, /Backstage\.Employers/);
  });

  it("uses a generic title when the area is missing", () => {
    const message = forbiddenMessage(undefined, { name: "Ada" });
    assert.equal(message.title, "You don't have access to that page.");
    assert.match(message.body, /signed in as Ada/);
  });
});
