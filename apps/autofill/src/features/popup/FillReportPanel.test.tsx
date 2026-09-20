import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import { FillReportPanel } from "./FillReportPanel";
import type { FillReport } from "@/shared/messaging";

describe("FillReportPanel", () => {
  let root: Root | undefined;
  let container: HTMLDivElement | undefined;

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    container?.remove();
    root = undefined;
    container = undefined;
  });

  function mount(report: FillReport | null): void {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => {
      root!.render(<FillReportPanel report={report} />);
    });
  }

  it("shows empty hint when no report (edge)", () => {
    mount(null);
    expect(container!.textContent).toMatch(/Fill a form to see which fields/i);
  });

  it("lists filled and failed entries (positive)", () => {
    const report: FillReport = {
      filledCount: 1,
      skippedCount: 1,
      failedCount: 1,
      at: Date.now(),
      personaId: "random-valid",
      scenarioId: "bank-india",
      entries: [
        {
          fieldId: "1",
          label: "Email",
          kind: "email",
          status: "filled",
          valuePreview: "a@b.com",
        },
        {
          fieldId: "2",
          label: "Monthly CTC",
          kind: "number",
          status: "skipped",
          reason: "Computed / Monthly CTC",
        },
        {
          fieldId: "3",
          label: "From",
          kind: "date",
          status: "failed",
          reason: "DatePicker did not accept value",
        },
      ],
    };
    mount(report);
    expect(container!.textContent).toMatch(/Filled 1/);
    expect(container!.textContent).toContain("Email");
    expect(container!.textContent).toMatch(/DatePicker did not accept value/);
  });

  it("renders empty entry list without crashing (negative)", () => {
    mount({
      filledCount: 0,
      skippedCount: 0,
      failedCount: 0,
      at: Date.now(),
      entries: [],
    });
    expect(container!.querySelector("ul")).toBeTruthy();
  });
});
