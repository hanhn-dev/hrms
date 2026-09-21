import {
  autoTypeField,
  autoTypeFields,
  buildTypedPrefixes,
  typeKeystroke,
} from "./auto-type";
import { scanFields } from "@/features/scan";

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

describe("autoTypeFields", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("types two text inputs in order (positive)", async () => {
    document.body.innerHTML = `
      <form>
        <label for="first">First Name</label>
        <input id="first" type="text" />
        <label for="last">Last Name</label>
        <input id="last" type="text" />
      </form>
    `;
    const result = await autoTypeFields({ typingDelayMs: 0 });
    expect(result.typedCount).toBe(2);
    expect(result.failedCount).toBe(0);
    expect(
      (document.getElementById("first") as HTMLInputElement).value.length,
    ).toBeGreaterThan(0);
    expect(
      (document.getElementById("last") as HTMLInputElement).value.length,
    ).toBeGreaterThan(0);
    const filled = result.entries.filter((e) => e.status === "filled");
    expect(filled.map((e) => e.label)).toEqual(["First Name", "Last Name"]);
  });

  it("skips disabled and select without aborting the rest (negative)", async () => {
    document.body.innerHTML = `
      <form>
        <label for="locked">Locked</label>
        <input id="locked" type="text" disabled />
        <label for="role">Role</label>
        <select id="role"><option>A</option></select>
        <label for="ok">Company Name</label>
        <input id="ok" type="text" />
      </form>
    `;
    const result = await autoTypeFields({ typingDelayMs: 0 });
    expect(result.typedCount).toBe(1);
    expect(result.skippedCount).toBeGreaterThanOrEqual(2);
    expect(
      (document.getElementById("ok") as HTMLInputElement).value.length,
    ).toBeGreaterThan(0);
    expect(
      result.entries.some(
        (e) =>
          e.status === "skipped" && /Disabled|Select/i.test(e.reason ?? ""),
      ),
    ).toBe(true);
  });

  it("returns zero typed for empty page (edge)", async () => {
    document.body.innerHTML = "";
    const result = await autoTypeFields({ typingDelayMs: 0 });
    expect(result.typedCount).toBe(0);
    expect(result.failedCount).toBe(0);
    expect(result.entries).toEqual([]);
  });

  it("types only the requested field id (edge single selection)", async () => {
    document.body.innerHTML = `
      <form>
        <label for="a">Alpha</label>
        <input id="a" type="text" />
        <label for="b">Beta</label>
        <input id="b" type="text" />
      </form>
    `;
    const fields = scanFields({ root: document });
    const beta = fields.find((f) => f.label === "Beta");
    expect(beta).toBeTruthy();

    const result = await autoTypeFields({
      typingDelayMs: 0,
      fieldIds: [beta!.id],
    });
    expect(result.typedCount).toBe(1);
    expect((document.getElementById("a") as HTMLInputElement).value).toBe("");
    expect(
      (document.getElementById("b") as HTMLInputElement).value.length,
    ).toBeGreaterThan(0);
  });

  it("skips already-filled fields when overwrite is off (edge)", async () => {
    document.body.innerHTML = `
      <form>
        <label for="kept">Kept</label>
        <input id="kept" type="text" value="existing" />
        <label for="empty">Empty</label>
        <input id="empty" type="text" />
      </form>
    `;
    const result = await autoTypeFields({
      typingDelayMs: 0,
      overwriteExistingValues: false,
    });
    expect(result.typedCount).toBe(1);
    expect((document.getElementById("kept") as HTMLInputElement).value).toBe(
      "existing",
    );
    expect(
      (document.getElementById("empty") as HTMLInputElement).value.length,
    ).toBeGreaterThan(0);
    expect(
      result.entries.some(
        (e) => e.status === "skipped" && e.reason === "Already filled",
      ),
    ).toBe(true);
  });
});
