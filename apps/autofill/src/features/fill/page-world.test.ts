import {
  fillControlledDateMainWorld,
  fillControlledDateInPageWorld,
} from "./page-world";
import { MESSAGE } from "@/shared/messaging";

describe("fillControlledDateMainWorld", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = "";
  });

  it("calls the form string onChange/onCommit, skipping a Dayjs handler that ignores strings (positive)", async () => {
    document.body.innerHTML = `
      <div id="setting">
        <div id="picker">
          <input id="from" data-form-autofill-target="m1" />
        </div>
      </div>
    `;
    const picker = document.getElementById("picker") as HTMLDivElement;
    const setting = document.getElementById("setting") as HTMLDivElement;
    const muiOnChange = vi.fn((next: unknown) => {
      // DatePickerSetting.handleChange: strings are unfinished and ignored.
      if (typeof next === "string" || next == null) {
        return;
      }
    });
    const formOnChange = vi.fn();
    const formOnCommit = vi.fn();

    Object.defineProperty(picker, "__reactFiber$test", {
      value: {
        memoizedProps: {
          label: "From",
          value: { isValid: () => false },
          format: "DD-MMM-YYYY",
          slotProps: {},
          onChange: muiOnChange,
        },
        return: null,
      },
      configurable: true,
    });
    Object.defineProperty(setting, "__reactFiber$test", {
      value: {
        memoizedProps: {
          label: "From",
          value: "",
          isMandatory: true,
          placeholder: "Select date",
          onChange: formOnChange,
          onCommit: formOnCommit,
        },
        return: null,
      },
      configurable: true,
    });

    const result = await fillControlledDateMainWorld(
      "m1",
      "05-Jan-2020",
      "From",
    );
    expect(result.ok).toBe(true);
    expect(formOnChange).toHaveBeenCalledWith("05-Jan-2020");
    expect(formOnCommit).toHaveBeenCalledWith("05-Jan-2020");
    expect(muiOnChange).not.toHaveBeenCalled();
  });

  it("does not call a handler whose label is a different field (negative)", async () => {
    document.body.innerHTML = `
      <div id="to-wrap">
        <input id="from" data-form-autofill-target="m1" />
      </div>
    `;
    const wrap = document.getElementById("to-wrap") as HTMLDivElement;
    const onChange = vi.fn();
    const onCommit = vi.fn();
    Object.defineProperty(wrap, "__reactFiber$test", {
      value: {
        memoizedProps: {
          label: "To",
          value: "",
          onChange,
          onCommit,
        },
        return: null,
      },
      configurable: true,
    });

    const promise = fillControlledDateMainWorld("m1", "05-Jan-2020", "From");
    await vi.runAllTimersAsync();
    const result = await promise;
    expect(result.ok).toBe(true);
    expect(onChange).not.toHaveBeenCalled();
    expect(onCommit).not.toHaveBeenCalled();
  });

  it("returns error when marker is missing (negative)", async () => {
    document.body.innerHTML = `<input id="from" />`;
    const result = await fillControlledDateMainWorld("missing", "05-Jan-2020");
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/not found/i);
  });

  it("passes a Dayjs-like value when only the MUI onChange exists (edge)", async () => {
    document.body.innerHTML = `<input id="from" data-form-autofill-target="m2" />`;
    const input = document.getElementById("from") as HTMLInputElement;
    const onChange = vi.fn();
    Object.defineProperty(input, "__reactFiber$test", {
      value: {
        memoizedProps: {
          label: "From",
          format: "DD-MMM-YYYY",
          slotProps: {},
          value: { isValid: () => true },
          onChange,
        },
        return: null,
      },
      configurable: true,
    });

    const result = await fillControlledDateMainWorld(
      "m2",
      "05-Jan-2020",
      "From",
    );
    expect(result.ok).toBe(true);
    expect(onChange).toHaveBeenCalledTimes(1);
    const arg = onChange.mock.calls[0]?.[0] as {
      isValid?: () => boolean;
      format?: () => string;
      year?: () => number;
    };
    expect(arg?.isValid?.()).toBe(true);
    expect(arg?.format?.()).toBe("05-Jan-2020");
    expect(arg?.year?.()).toBe(2020);
  });
});

describe("fillControlledDateInPageWorld", () => {
  beforeEach(() => {
    vi.stubGlobal("chrome", {
      runtime: {
        sendMessage: vi.fn(),
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.innerHTML = "";
  });

  it("marks the input and asks the background (positive)", async () => {
    document.body.innerHTML = `<input id="from" />`;
    const input = document.getElementById("from") as HTMLInputElement;
    const sendMessage = chrome.runtime.sendMessage as unknown as ReturnType<
      typeof vi.fn
    >;
    sendMessage.mockResolvedValue({ ok: true });

    const ok = await fillControlledDateInPageWorld(
      input,
      "01-Mar-2019",
      "From",
    );
    expect(ok).toBe(true);
    expect(sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: MESSAGE.FILL_CONTROLLED_DATE,
        value: "01-Mar-2019",
        label: "From",
        marker: expect.any(String),
      }),
    );
    expect(input.hasAttribute("data-form-autofill-target")).toBe(false);
  });

  it("returns false when background rejects (negative)", async () => {
    document.body.innerHTML = `<input id="from" />`;
    const input = document.getElementById("from") as HTMLInputElement;
    (
      chrome.runtime.sendMessage as unknown as ReturnType<typeof vi.fn>
    ).mockResolvedValue({ ok: false, error: "fail" });
    expect(await fillControlledDateInPageWorld(input, "01-Mar-2019")).toBe(
      false,
    );
  });

  it("returns false when chrome.runtime is unavailable (edge)", async () => {
    vi.stubGlobal("chrome", undefined);
    document.body.innerHTML = `<input id="from" />`;
    const input = document.getElementById("from") as HTMLInputElement;
    expect(await fillControlledDateInPageWorld(input, "01-Mar-2019")).toBe(
      false,
    );
  });
});
