import {
  endTypeHighlight,
  isTypeHighlightActive,
  startTypeHighlight,
  TYPE_HIGHLIGHT_ID,
} from "./type-session";

describe("type-session highlight", () => {
  afterEach(() => {
    endTypeHighlight();
    document.body.innerHTML = "";
  });

  it("paints an overlay over a form element (positive)", () => {
    const form = document.createElement("form");
    document.body.appendChild(form);
    startTypeHighlight(form);
    const overlay = document.getElementById(TYPE_HIGHLIGHT_ID);
    expect(overlay).toBeTruthy();
    expect(isTypeHighlightActive()).toBe(true);
    expect(overlay?.style.border).toMatch(/1677ff|rgb\(22,\s*119,\s*255\)/);
  });

  it("removes the overlay on end (negative)", () => {
    const form = document.createElement("form");
    document.body.appendChild(form);
    startTypeHighlight(form);
    endTypeHighlight();
    expect(document.getElementById(TYPE_HIGHLIGHT_ID)).toBeNull();
    expect(isTypeHighlightActive()).toBe(false);
  });

  it("replaces a previous overlay instead of stacking (edge)", () => {
    const first = document.createElement("form");
    const second = document.createElement("form");
    document.body.append(first, second);
    startTypeHighlight(first);
    startTypeHighlight(second);
    expect(
      document.querySelectorAll(`#${TYPE_HIGHLIGHT_ID}`),
    ).toHaveLength(1);
  });

  it("does not paint document or body (edge)", () => {
    startTypeHighlight(document);
    expect(isTypeHighlightActive()).toBe(false);
    startTypeHighlight(document.body);
    expect(isTypeHighlightActive()).toBe(false);
  });

  it("ignores a stale session id after a newer start (edge)", () => {
    const form = document.createElement("form");
    document.body.appendChild(form);
    const firstId = startTypeHighlight(form);
    startTypeHighlight(form);
    endTypeHighlight(firstId);
    expect(isTypeHighlightActive()).toBe(true);
    endTypeHighlight();
    expect(isTypeHighlightActive()).toBe(false);
  });
});
