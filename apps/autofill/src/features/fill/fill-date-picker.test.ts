import {
  fillDatePicker,
  findOpenPickerButton,
  parseDisplayDate,
} from "./fill-date-picker";

describe("parseDisplayDate", () => {
  it("parses DD-MMM-YYYY (positive)", () => {
    expect(parseDisplayDate("05-Jan-2020")).toEqual({
      day: 5,
      monthIndex: 0,
      monthShort: "Jan",
      year: 2020,
    });
  });

  it("rejects malformed strings (negative)", () => {
    expect(parseDisplayDate("2020-01-05")).toBeNull();
    expect(parseDisplayDate("99-Xxx-9999")).toBeNull();
  });

  it("trims whitespace and normalizes month casing (edge)", () => {
    expect(parseDisplayDate(" 15-mar-2018 ")).toEqual({
      day: 15,
      monthIndex: 2,
      monthShort: "Mar",
      year: 2018,
    });
  });
});

describe("findOpenPickerButton", () => {
  it("finds Choose date adornment (positive)", () => {
    document.body.innerHTML = `
      <div class="MuiFormControl-root">
        <input id="from" role="combobox" />
        <button type="button" aria-label="Choose date">📅</button>
      </div>
    `;
    const input = document.getElementById("from") as HTMLInputElement;
    expect(findOpenPickerButton(input)?.getAttribute("aria-label")).toBe(
      "Choose date",
    );
  });

  it("returns null when no adornment exists (negative)", () => {
    document.body.innerHTML = `<input id="plain" type="text" />`;
    const input = document.getElementById("plain") as HTMLInputElement;
    expect(findOpenPickerButton(input)).toBeNull();
  });

  it("falls back to InputAdornment button without aria-label (edge)", () => {
    document.body.innerHTML = `
      <div class="MuiFormControl-root">
        <input id="from" role="combobox" />
        <div class="MuiInputAdornment-root">
          <button type="button" class="MuiIconButton-root">icon</button>
        </div>
      </div>
    `;
    const input = document.getElementById("from") as HTMLInputElement;
    expect(findOpenPickerButton(input)).toBeTruthy();
  });
});

describe("fillDatePicker", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = "";
  });

  it("selects year → month → day in the calendar (positive)", async () => {
    document.body.innerHTML = `
      <div class="MuiFormControl-root">
        <input id="from" role="combobox" />
        <button type="button" aria-label="Choose date" id="open">open</button>
      </div>
    `;

    const input = document.getElementById("from") as HTMLInputElement;
    const open = document.getElementById("open") as HTMLButtonElement;
    open.addEventListener("click", () => {
      const popper = document.createElement("div");
      popper.className = "MuiPickersPopper-root";
      popper.innerHTML = `
        <button type="button" class="MuiPickersYear-yearButton">2019</button>
        <button type="button" class="MuiPickersYear-yearButton">2020</button>
      `;
      document.body.appendChild(popper);

      popper.querySelectorAll(".MuiPickersYear-yearButton").forEach((btn) => {
        btn.addEventListener("click", () => {
          popper.innerHTML = `
            <button type="button" class="MuiPickersMonth-monthButton">Jan</button>
            <button type="button" class="MuiPickersMonth-monthButton">Feb</button>
          `;
          popper
            .querySelectorAll(".MuiPickersMonth-monthButton")
            .forEach((monthBtn) => {
              monthBtn.addEventListener("click", () => {
                popper.innerHTML = `
                  <button type="button" class="MuiPickersDay-root">4</button>
                  <button type="button" class="MuiPickersDay-root" aria-label="Jan 5, 2020">5</button>
                  <button type="button">OK</button>
                `;
                popper
                  .querySelector('[aria-label="Jan 5, 2020"]')
                  ?.addEventListener("click", () => {
                    input.value = "05-Jan-2020";
                    popper.remove();
                  });
              });
            });
        });
      });
    });

    const promise = fillDatePicker(input, "05-Jan-2020");
    await vi.runAllTimersAsync();
    await promise;

    expect(input.value).toBe("05-Jan-2020");
  });

  it("does not write a DOM-only value when a readOnly picker cannot open (negative)", async () => {
    document.body.innerHTML = `<input id="plain" type="text" role="combobox" readonly />`;
    const input = document.getElementById("plain") as HTMLInputElement;

    const promise = fillDatePicker(input, "12-Mar-2018");
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.ok).toBe(false);
    expect(input.value).toBe("");
  });

  it("fills a native type=date input (positive)", async () => {
    document.body.innerHTML = `<input id="start" type="date" />`;
    const input = document.getElementById("start") as HTMLInputElement;
    const promise = fillDatePicker(input, "05-Jan-2020");
    await vi.runAllTimersAsync();
    const result = await promise;
    expect(result.ok).toBe(true);
    expect(result.tactic).toBe("native-date");
    expect(input.value).toBe("2020-01-05");
  });

  it("types a display date into a writable non-combobox input (positive)", async () => {
    document.body.innerHTML = `<input id="start" type="text" />`;
    const input = document.getElementById("start") as HTMLInputElement;
    const promise = fillDatePicker(input, "12-Mar-2018");
    await vi.runAllTimersAsync();
    const result = await promise;
    expect(result.ok).toBe(true);
    expect(result.tactic).toBe("type-blur");
    expect(input.value).toBe("12-Mar-2018");
  });

  it("clicks a generic gridcell calendar (positive)", async () => {
    document.body.innerHTML = `
      <div>
        <input id="start" role="combobox" readonly />
        <button type="button" aria-label="Open calendar" id="open">open</button>
      </div>
    `;
    const input = document.getElementById("start") as HTMLInputElement;
    document.getElementById("open")!.addEventListener("click", () => {
      const grid = document.createElement("div");
      grid.setAttribute("role", "grid");
      grid.innerHTML = `
        <div role="gridcell">4</div>
        <div role="gridcell">5</div>
      `;
      document.body.appendChild(grid);
      grid.querySelectorAll('[role="gridcell"]').forEach((node) => {
        node.addEventListener("click", () => {
          input.value = `0${(node.textContent || "").trim()}-Jan-2020`;
        });
      });
    });
    const promise = fillDatePicker(input, "05-Jan-2020");
    await vi.runAllTimersAsync();
    await promise;
    expect(input.value).toBe("05-Jan-2020");
  });

  it("clicks an Ant Design picker cell (positive)", async () => {
    document.body.innerHTML = `
      <div class="ant-picker">
        <input id="start" role="combobox" readonly />
        <span class="ant-picker-suffix" id="open">📅</span>
      </div>
    `;
    const input = document.getElementById("start") as HTMLInputElement;
    document.getElementById("open")!.addEventListener("click", () => {
      const dropdown = document.createElement("div");
      dropdown.className = "ant-picker-dropdown";
      dropdown.innerHTML = `
        <div class="ant-picker-cell" title="2020-01-05">5</div>
        <div class="ant-picker-cell" title="2020-01-06">6</div>
      `;
      document.body.appendChild(dropdown);
      dropdown.querySelectorAll(".ant-picker-cell").forEach((node) => {
        node.addEventListener("click", () => {
          input.value = "05-Jan-2020";
        });
      });
    });
    const promise = fillDatePicker(input, "05-Jan-2020");
    await vi.runAllTimersAsync();
    await promise;
    expect(input.value).toBe("05-Jan-2020");
  });

  it("does not fill when the date string is unparseable (edge)", async () => {
    document.body.innerHTML = `
      <div class="MuiFormControl-root">
        <input id="from" role="combobox" />
        <button type="button" aria-label="Choose date">open</button>
      </div>
    `;
    const input = document.getElementById("from") as HTMLInputElement;

    const promise = fillDatePicker(input, "not-a-date");
    await vi.runAllTimersAsync();
    await promise;

    expect(input.value).toBe("");
  });
});
