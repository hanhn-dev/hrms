import { describe, expect, it } from "vitest";
import {
  formatDate,
  generateDateRange,
  generateInvalidValue,
  generateValue,
} from "./generators";

describe("generateValue", () => {
  it("generates a valid email for email fields (positive)", () => {
    const value = generateValue({
      label: "Contact Person Email Id",
      kind: "email",
    });
    expect(value).toMatch(/^user\d+@example\.com$/);
  });

  it("returns invalid email when invalid flag is set (negative)", () => {
    const value = generateValue({
      label: "Contact Person Email Id",
      kind: "email",
      invalid: true,
    });
    expect(value).toBe("not-an-email");
  });

  it("trims to maxLength and handles empty label (edge)", () => {
    const value = generateValue({
      label: "",
      kind: "text",
      maxLength: 5,
    });
    expect(value.length).toBeLessThanOrEqual(5);
  });
});

describe("generateInvalidValue", () => {
  it("returns non-numeric for salary fields (positive)", () => {
    expect(
      generateInvalidValue({ label: "Salary on Leaving", kind: "number" }),
    ).toBe("not-a-number");
  });

  it("returns empty string for unknown text (negative/edge)", () => {
    expect(generateInvalidValue({ label: "Company Name", kind: "text" })).toBe(
      "",
    );
  });
});

describe("formatDate / generateDateRange", () => {
  it("formats DD-MMM-YYYY (positive)", () => {
    expect(formatDate(new Date(2020, 0, 5))).toBe("05-Jan-2020");
  });

  it("produces To after From (positive)", () => {
    const { from, to } = generateDateRange();
    const parse = (s: string) => {
      const [d, m, y] = s.split("-");
      const months = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      return new Date(Number(y), months.indexOf(m!), Number(d));
    };
    expect(parse(to).getTime()).toBeGreaterThanOrEqual(parse(from).getTime());
  });
});
