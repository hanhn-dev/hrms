import { describe, expect, it, vi } from "vitest";
import { buildTypedPrefixes, typeKeystroke } from "./auto-type";

describe("buildTypedPrefixes", () => {
  it("builds cumulative prefixes (positive)", () => {
    expect(buildTypedPrefixes("ab")).toEqual(["a", "ab"]);
  });

  it("returns empty array for empty string (edge)", () => {
    expect(buildTypedPrefixes("")).toEqual([]);
  });
});

describe("typeKeystroke", () => {
  it("types characters into an input (positive)", async () => {
    const input = document.createElement("input");
    document.body.appendChild(input);
    await typeKeystroke(input, "Hi", 0);
    expect(input.value).toBe("Hi");
  });

  it("clears previous value before typing (negative/overwrite)", async () => {
    const input = document.createElement("input");
    input.value = "old";
    document.body.appendChild(input);
    await typeKeystroke(input, "new", 0);
    expect(input.value).toBe("new");
  });

  it("respects delay via sleep (edge delay 0 completes)", async () => {
    vi.useFakeTimers();
    const input = document.createElement("input");
    document.body.appendChild(input);
    const promise = typeKeystroke(input, "a", 0);
    await promise;
    expect(input.value).toBe("a");
    vi.useRealTimers();
  });
});
