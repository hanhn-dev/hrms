import { describe, expect, it } from "vitest";
import {
  countFillableControls,
  resolvePickRoot,
  scanFromElement,
} from "./resolve-pick-root";

describe("resolvePickRoot", () => {
  it("expands from a field to the section with sibling inputs (positive)", () => {
    document.body.innerHTML = `
      <div id="page">
        <input id="noise" />
        <div id="section" class="space-y-4">
          <label>Company Name<input id="company" /></label>
          <label>Roles<input id="roles" /></label>
          <label>Address<textarea id="address"></textarea></label>
          <label>From<input id="from" /></label>
          <label>To<input id="to" /></label>
        </div>
      </div>
    `;
    const company = document.getElementById("company")!;
    const root = resolvePickRoot(company);
    expect(countFillableControls(root)).toBeGreaterThanOrEqual(5);
    expect(root.id).toBe("section");
  });

  it("does not prefer empty ancestors (negative)", () => {
    document.body.innerHTML = `
      <div id="empty-wrapper">
        <div id="formish">
          <input id="a" />
          <input id="b" />
        </div>
      </div>
    `;
    const root = resolvePickRoot(document.getElementById("a")!);
    expect(root.id).toBe("formish");
  });

  it("handles click on non-input container (edge)", () => {
    document.body.innerHTML = `
      <section id="panel">
        <h3>Past employment</h3>
        <input /><input /><textarea></textarea>
      </section>
    `;
    const heading = document.querySelector("h3")!;
    const root = resolvePickRoot(heading);
    expect(countFillableControls(root)).toBe(3);
  });

  it("picks a nested section inside a full-viewport flyout dialog (positive)", () => {
    document.body.innerHTML = `
      <div id="dialog" role="dialog" style="position:fixed;inset:0">
        <div id="panel" class="drawer">
          <header>Add Past Employment</header>
          <div id="section" class="space-y-3">
            <h4>Past employment details</h4>
            <label>Company Name<input id="company" /></label>
            <label>Roles<input id="roles" /></label>
            <label>Address<textarea id="address"></textarea></label>
            <label>Currency<input id="currency" /></label>
            <label>Department<input id="dept" /></label>
          </div>
        </div>
      </div>
    `;
    const root = resolvePickRoot(document.getElementById("company")!);
    expect(root.id).toBe("section");
    expect(root.id).not.toBe("dialog");
  });

  it("does not highlight the role=dialog overlay when hovering a nested field (negative)", () => {
    document.body.innerHTML = `
      <div id="dialog" role="dialog" class="MuiModal-root">
        <form id="whole-form">
          <div id="section" class="space-y-4">
            <input id="a" />
            <input id="b" />
          </div>
        </form>
      </div>
    `;
    const root = resolvePickRoot(document.getElementById("a")!);
    expect(root.getAttribute("role")).not.toBe("dialog");
    expect(root.id).toBe("section");
  });
});

describe("scanFromElement", () => {
  it("returns labeled fields under the picked section (positive)", () => {
    document.body.innerHTML = `
      <div id="section">
        <label for="company">Company Name</label>
        <input id="company" />
        <label for="roles">Roles</label>
        <input id="roles" />
      </div>
    `;
    const result = scanFromElement(document.getElementById("company")!);
    expect(result.fieldCount).toBe(2);
    expect(result.fields.some((f) => f.label === "Company Name")).toBe(true);
    expect(result.rootSelector).toContain("data-form-autofill-root");
  });
});
