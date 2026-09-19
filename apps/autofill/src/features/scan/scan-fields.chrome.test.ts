import { isPageChromeControl, scanFields } from "./scan-fields";

describe("isPageChromeControl", () => {
  it("flags header search inputs (positive)", () => {
    document.body.innerHTML = `
      <header>
        <input placeholder="Search Employees..." />
      </header>
    `;
    const input = document.querySelector("input")!;
    expect(isPageChromeControl(input)).toBe(true);
  });

  it("does not flag form fields (negative)", () => {
    document.body.innerHTML = `
      <div class="form">
        <label>Company Name<input /></label>
      </div>
    `;
    expect(isPageChromeControl(document.querySelector("input")!)).toBe(false);
  });

  it("flags Organizations aria-label outside header (edge)", () => {
    document.body.innerHTML = `<input aria-label="Organizations" />`;
    expect(isPageChromeControl(document.querySelector("input")!)).toBe(true);
  });
});

describe("scanFields chrome filtering", () => {
  it("excludes header search when scanning a page shell (positive)", () => {
    document.body.innerHTML = `
      <header><input placeholder="Search Employees..." /></header>
      <div id="section" class="space-y-4">
        <label for="c">Company Name</label><input id="c" />
        <label for="r">Roles</label><input id="r" />
      </div>
    `;
    const fields = scanFields({ root: document.body });
    expect(fields.some((f) => /search employee/i.test(f.label))).toBe(false);
    expect(fields.some((f) => f.label === "Company Name")).toBe(true);
  });
});
