import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { openChangeRequestFromClick } from "./change-request-id-click.ts";

describe("openChangeRequestFromClick", () => {
  it("opens that request and stops the click from reaching the row", () => {
    const opened: number[] = [];
    let stopped = false;
    openChangeRequestFromClick(
      {
        stopPropagation() {
          stopped = true;
        },
      },
      1913,
      (changeRequestId) => {
        assert.equal(stopped, true);
        opened.push(changeRequestId);
      },
    );
    assert.deepEqual(opened, [1913]);
  });

  it("does not open a request when the id is missing", () => {
    const opened: number[] = [];
    openChangeRequestFromClick(
      { stopPropagation() {} },
      0,
      (changeRequestId) => {
        opened.push(changeRequestId);
      },
    );
    assert.deepEqual(opened, []);
  });
});
