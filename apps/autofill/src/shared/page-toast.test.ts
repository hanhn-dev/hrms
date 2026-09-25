import {
  formatFillOutcome,
  showPageToast,
  toastAutoTypeResult,
  toastFillResult,
} from "./page-toast";

describe("toastAutoTypeResult", () => {
  afterEach(() => {
    document.getElementById("form-autofill-toast")?.remove();
  });

  it("reports a cancel as info, including zero typed (positive)", () => {
    toastAutoTypeResult({
      typedCount: 0,
      skippedCount: 3,
      failedCount: 0,
      cancelled: true,
    });
    const toast = document.getElementById("form-autofill-toast");
    expect(toast?.textContent).toBe(
      "Autofill: typing cancelled (typed 0 field(s))",
    );
    expect(toast?.style.background).toBe("rgb(23, 92, 211)");
  });

  it("still treats zero typed without cancel as an error (negative)", () => {
    toastAutoTypeResult({
      typedCount: 0,
      skippedCount: 2,
      failedCount: 0,
    });
    const toast = document.getElementById("form-autofill-toast");
    expect(toast?.textContent).toMatch(/no fields typed/i);
    expect(toast?.style.background).toBe("rgb(180, 35, 24)");
  });

  it("keeps the success copy when typing finished (edge)", () => {
    toastAutoTypeResult({
      typedCount: 2,
      skippedCount: 0,
      failedCount: 0,
    });
    expect(document.getElementById("form-autofill-toast")?.textContent).toBe(
      "Autofill: typed 2 field(s)",
    );
  });
});

describe("formatFillOutcome", () => {
  it("names skipped fields and reasons (positive)", () => {
    expect(
      formatFillOutcome({
        filledCount: 11,
        skippedCount: 2,
        failedCount: 0,
        entries: [
          {
            fieldId: "1",
            label: "First Name",
            kind: "text",
            status: "filled",
          },
          {
            fieldId: "2",
            label: "Wedding Date",
            kind: "date",
            status: "skipped",
            reason: "Disabled",
          },
          {
            fieldId: "3",
            label: "Language Write",
            kind: "select",
            status: "skipped",
            reason: "Disabled",
          },
        ],
      }),
    ).toBe(
      "filled 11, skipped 2: Wedding Date (Disabled), Language Write (Disabled)",
    );
  });

  it("keeps a count-only skip when entries are missing (negative)", () => {
    expect(
      formatFillOutcome({
        filledCount: 4,
        skippedCount: 9,
        failedCount: 0,
      }),
    ).toBe("filled 4, skipped 9");
  });

  it("names failed fields (edge)", () => {
    expect(
      formatFillOutcome({
        filledCount: 1,
        skippedCount: 0,
        failedCount: 1,
        entries: [
          {
            fieldId: "1",
            label: "Gender",
            kind: "select",
            status: "failed",
            reason: "No listbox option",
          },
        ],
      }),
    ).toBe("filled 1, failed 1: Gender (No listbox option)");
  });
});

describe("toastFillResult", () => {
  afterEach(() => {
    document.getElementById("form-autofill-toast")?.remove();
  });

  it("lists skipped field names on the page toast (positive)", () => {
    toastFillResult({
      filledCount: 11,
      skippedCount: 1,
      failedCount: 0,
      entries: [
        {
          fieldId: "1",
          label: "State of Birth",
          kind: "select",
          status: "skipped",
          reason: "Disabled",
        },
      ],
    });
    expect(document.getElementById("form-autofill-toast")?.textContent).toBe(
      "Autofill: filled 11, skipped 1: State of Birth (Disabled)",
    );
  });
});

describe("showPageToast", () => {
  afterEach(() => {
    document.getElementById("form-autofill-toast")?.remove();
  });

  it("replaces an existing toast (edge)", () => {
    showPageToast("first", "info");
    showPageToast("second", "success");
    expect(document.querySelectorAll("#form-autofill-toast")).toHaveLength(1);
    expect(document.getElementById("form-autofill-toast")?.textContent).toBe(
      "second",
    );
  });
});
