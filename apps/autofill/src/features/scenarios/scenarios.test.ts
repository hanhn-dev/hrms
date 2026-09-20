import {
  getScenario,
  isScenarioId,
  resolveScenarioValue,
  SCENARIO_IFSC_FIXTURE,
  SCENARIOS,
} from "./scenarios";

describe("scenarios", () => {
  it("includes bank, employment, and contact packs (positive)", () => {
    expect(SCENARIOS.map((s) => s.id)).toEqual([
      "none",
      "bank-india",
      "employment-dates",
      "contact",
    ]);
    expect(isScenarioId("bank-india")).toBe(true);
  });

  it("rejects unknown scenario ids (negative)", () => {
    expect(isScenarioId("payroll")).toBe(false);
    expect(getScenario(undefined).id).toBe("none");
  });

  it("bank-india uses IFSC fixture (positive)", () => {
    const value = resolveScenarioValue({
      label: "IFSC Code",
      kind: "select",
      scenarioId: "bank-india",
      personaId: "random-valid",
    });
    expect(value).toBe(SCENARIO_IFSC_FIXTURE);
  });

  it("contact scenario forces valid email over invalid-contact persona (negative)", () => {
    const value = resolveScenarioValue({
      label: "Email",
      kind: "email",
      scenarioId: "contact",
      personaId: "invalid-contact",
    });
    expect(value).toContain("@");
    expect(value).not.toBe("not-an-email");
  });

  it("returns coherent From/To from shared dateRange (edge)", () => {
    const dateRange = { from: "01-Jan-2020", to: "15-Jun-2022" };
    expect(
      resolveScenarioValue({
        label: "From",
        kind: "date",
        scenarioId: "employment-dates",
        dateRange,
      }),
    ).toBe("01-Jan-2020");
    expect(
      resolveScenarioValue({
        label: "To",
        kind: "date",
        scenarioId: "employment-dates",
        dateRange,
      }),
    ).toBe("15-Jun-2022");
  });
});
