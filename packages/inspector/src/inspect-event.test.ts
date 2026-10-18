// @vitest-environment jsdom
import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { followEditor } from "./editor-link.ts";
import { takeInspectEvent } from "./inspect-event.ts";

describe("takeInspectEvent", () => {
  it("opens the source and keeps the element's own click from running", () => {
    const button = taggedButton();
    let activated = false;
    button.addEventListener("click", () => {
      activated = true;
    });
    const onWindow = (event: Event): void => {
      if (!(event instanceof MouseEvent)) return;
      const source = takeInspectEvent(event, true);
      assert.deepEqual(source, { file: "apps/backstage/app/page.tsx", line: 4, column: 2 });
    };
    window.addEventListener("click", onWindow, true);

    button.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 }));

    window.removeEventListener("click", onWindow, true);
    assert.equal(activated, false);
  });

  it("leaves the element alone when inspect mode is off", () => {
    const button = taggedButton();
    let activated = false;
    button.addEventListener("click", () => {
      activated = true;
    });
    const onWindow = (event: Event): void => {
      if (!(event instanceof MouseEvent)) return;
      assert.equal(takeInspectEvent(event, false), null);
    };
    window.addEventListener("click", onWindow, true);

    button.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 }));

    window.removeEventListener("click", onWindow, true);
    assert.equal(activated, true);
  });

  it("opens the source once when handing the browser to Cursor", () => {
    const button = taggedButton();
    let opened = 0;
    const onWindow = (event: Event): void => {
      if (!(event instanceof MouseEvent)) return;
      const source = takeInspectEvent(event, true);
      if (source == null) return;
      opened += 1;
      followEditor("D:/hrms/apps/backstage/app/page.tsx", source.line, source.column);
    };
    window.addEventListener("click", onWindow, true);

    button.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 }));

    window.removeEventListener("click", onWindow, true);
    assert.equal(opened, 1);
  });

  it("does not cancel pointerdown, so the following click can open the file", () => {
    const button = taggedButton();
    const seen: string[] = [];
    const onWindow = (event: Event): void => {
      if (!(event instanceof MouseEvent)) return;
      seen.push(event.type);
      takeInspectEvent(event, true);
    };
    window.addEventListener("pointerdown", onWindow, true);
    window.addEventListener("click", onWindow, true);

    const pointerDown = new MouseEvent("pointerdown", { bubbles: true, cancelable: true, button: 0 });
    button.dispatchEvent(pointerDown);
    const click = new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 });
    button.dispatchEvent(click);

    window.removeEventListener("pointerdown", onWindow, true);
    window.removeEventListener("click", onWindow, true);
    assert.equal(pointerDown.defaultPrevented, false);
    assert.equal(click.defaultPrevented, true);
    assert.deepEqual(seen, ["pointerdown", "click"]);
  });

  it("does not intercept the inspect control", () => {
    document.body.replaceChildren();
    const chrome = document.createElement("button");
    chrome.setAttribute("data-inspector-chrome", "");
    document.body.append(chrome);
    const onWindow = (event: Event): void => {
      if (!(event instanceof MouseEvent)) return;
      assert.equal(takeInspectEvent(event, true), null);
      assert.equal(event.defaultPrevented, false);
    };
    window.addEventListener("click", onWindow, true);

    chrome.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 }));

    window.removeEventListener("click", onWindow, true);
  });
});

function taggedButton(): HTMLButtonElement {
  document.body.replaceChildren();
  const button = document.createElement("button");
  button.setAttribute("data-insp-path", "apps/backstage/app/page.tsx");
  button.setAttribute("data-insp-line", "4");
  button.setAttribute("data-insp-column", "2");
  document.body.append(button);
  return button;
}
