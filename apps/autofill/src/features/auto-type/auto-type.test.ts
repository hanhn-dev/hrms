import { describe, expect, it, vi } from "vitest";
import { autoTypeField, buildTypedPrefixes, typeKeystroke } from "./auto-type";

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

describe("autoTypeField radio", () => {
  it("checks a radio instead of typing (positive)", async () => {
    document.body.innerHTML = `
      <div role="radiogroup" aria-label="Government Employee">
        <label><input id="yes" type="radio" name="gov" value="Yes" />YES</label>
        <label><input id="no" type="radio" name="gov" value="No" />NO</label>
      </div>
    `;
    const result = await autoTypeField({
      field: {
        id: "yes",
        label: "Government Employee",
        kind: "radio",
        tagName: "input",
        inputType: "radio",
        disabled: false,
        readOnly: false,
        maxLength: null,
        selectorHint: "#yes",
        valuePreview: "",
      },
      typingDelayMs: 0,
    });
    expect(result.label).toBe("Government Employee");
    const yes = document.getElementById("yes") as HTMLInputElement;
    const no = document.getElementById("no") as HTMLInputElement;
    expect(yes.checked || no.checked).toBe(true);
  });

  it("throws when the radio group is disabled (negative)", async () => {
    document.body.innerHTML = `
      <div role="radiogroup" aria-label="Locked">
        <label><input id="yes" type="radio" name="lock" value="Yes" disabled />YES</label>
      </div>
    `;
    await expect(
      autoTypeField({
        field: {
          id: "yes",
          label: "Locked",
          kind: "radio",
          tagName: "input",
          inputType: "radio",
          disabled: false,
          readOnly: false,
          maxLength: null,
          selectorHint: "#yes",
          valuePreview: "",
        },
        element: document.getElementById("yes") as HTMLInputElement,
        typingDelayMs: 0,
      }),
    ).rejects.toThrow(/not editable/);
  });

  it("checks the only remaining enabled option (edge)", async () => {
    document.body.innerHTML = `
      <div role="radiogroup" aria-label="Government Employee">
        <label><input id="yes" type="radio" name="gov" value="Yes" disabled />YES</label>
        <label><input id="no" type="radio" name="gov" value="No" />NO</label>
      </div>
    `;
    await autoTypeField({
      field: {
        id: "no",
        label: "Government Employee",
        kind: "radio",
        tagName: "input",
        inputType: "radio",
        disabled: false,
        readOnly: false,
        maxLength: null,
        selectorHint: "#no",
        valuePreview: "",
      },
      typingDelayMs: 0,
    });
    expect((document.getElementById("no") as HTMLInputElement).checked).toBe(
      true,
    );
  });
});
