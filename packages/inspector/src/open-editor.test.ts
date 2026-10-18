import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "vitest";
import { handleInspectorRequest } from "./handle-request.ts";
import { editorDeliveryReady, editorLaunch, editorProcess, focusProgramSource, openInEditor } from "./open-editor.ts";

const root = fs.mkdtempSync(path.join(os.tmpdir(), "inspector-"));
const nested = path.join(root, "apps", "backstage", "app");
fs.mkdirSync(nested, { recursive: true });
const page = path.join(nested, "page.tsx");
fs.writeFileSync(page, "export const page = true;\n");

describe("editorLaunch", () => {
  it("builds a cursor goto command for a file inside the project", () => {
    const launch = editorLaunch({
      file: "apps/backstage/app/page.tsx",
      line: 2,
      column: 3,
      root,
      editor: "cursor",
    });
    assert.equal(launch.command, "cursor");
    assert.deepEqual(launch.args, ["--goto", `${fs.realpathSync(page)}:2:3`]);
  });

  it("rejects paths that leave the project", () => {
    assert.throws(
      () => editorLaunch({ file: "../secrets.txt", line: 1, column: 1, root, editor: "cursor" }),
      /outside the project/,
    );
    assert.throws(
      () => editorLaunch({ file: "apps/backstage/missing.tsx", line: 1, column: 1, root, editor: "cursor" }),
      /File not found/,
    );
  });

  it("rejects an editor command that could be a shell snippet", () => {
    assert.throws(
      () => editorLaunch({ file: "apps/backstage/app/page.tsx", line: 1, column: 1, root, editor: "cursor & calc" }),
      /not allowed/,
    );
  });
});

describe("editorProcess", () => {
  it("skips a broken cursor shim and uses the install that has Cursor.exe", () => {
    if (process.platform !== "win32") return;
    const install = fs.mkdtempSync(path.join(os.tmpdir(), "inspector-editor-"));
    const brokenBin = path.join(install, "broken", "resources", "app", "bin");
    const workingRoot = path.join(install, "working");
    const workingBin = path.join(workingRoot, "resources", "app", "bin");
    const cli = path.join(workingRoot, "resources", "app", "out", "cli.js");
    fs.mkdirSync(brokenBin, { recursive: true });
    fs.mkdirSync(path.dirname(cli), { recursive: true });
    fs.mkdirSync(workingBin, { recursive: true });
    fs.writeFileSync(path.join(brokenBin, "cursor.cmd"), "@echo off\n");
    fs.writeFileSync(path.join(workingBin, "cursor.cmd"), "@echo off\n");
    fs.writeFileSync(cli, "");
    fs.writeFileSync(path.join(workingRoot, "Cursor.exe"), "");

    const resolved = editorProcess("cursor", ["--goto", "page.tsx:1:1"], `${brokenBin}${path.delimiter}${workingBin}`);

    assert.equal(resolved.file, path.join(workingRoot, "Cursor.exe"));
    assert.deepEqual(resolved.args, [cli, "--goto", "page.tsx:1:1"]);
    assert.equal(resolved.env.ELECTRON_RUN_AS_NODE, "1");
    assert.equal(resolved.focusName, "Cursor");
  });

  it("brings the editor window forward by joining the foreground input queue", () => {
    const source = focusProgramSource();
    assert.match(source, /SetForegroundWindow/);
    assert.match(source, /AttachThreadInput/);
    assert.match(source, /IsIconic/);
    assert.match(source, /ShowWindow\(hwnd, 5\)/);
    assert.equal(source.includes("SwitchToThisWindow"), false);
    assert.equal(source.includes("keybd_event"), false);
  });

  it("treats the editor log as ready once the file has been delivered", () => {
    assert.equal(editorDeliveryReady("Sending env to running instance..."), false);
    assert.equal(editorDeliveryReady("Sent env to running instance. Terminating..."), true);
  });
});

describe("openInEditor", () => {
  it("passes the launch to the spawn function", async () => {
    const calls: Array<{ command: string; args: string[] }> = [];
    await openInEditor(
      { file: "apps/backstage/app/page.tsx", line: 1, column: 1, root, editor: "code" },
      async (command, args) => {
        calls.push({ command, args });
      },
    );
    assert.equal(calls.length, 1);
    assert.equal(calls[0]?.command, "code");
    assert.equal(calls[0]?.args[0], "--goto");
    assert.equal(calls[0]?.args[1]?.endsWith(":1:1"), true);
  });
});

describe("handleInspectorRequest", () => {
  it("returns 404 outside development", async () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    try {
      const response = await handleInspectorRequest(request({ file: "apps/backstage/app/page.tsx", line: 1, column: 1 }), {
        root,
      });
      assert.equal(response.status, 404);
    } finally {
      process.env.NODE_ENV = previous;
    }
  });

  it("opens the editor for a valid development request", async () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";
    const calls: string[] = [];
    try {
      const response = await handleInspectorRequest(request({ file: "apps/backstage/app/page.tsx", line: 4, column: 2 }), {
        root,
        editor: "cursor",
        spawnEditor: async (command) => {
          calls.push(command);
        },
      });
      assert.equal(response.status, 204);
      assert.deepEqual(calls, ["cursor"]);
    } finally {
      process.env.NODE_ENV = previous;
    }
  });

  it("returns 400 for an invalid body", async () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";
    try {
      const response = await handleInspectorRequest(request({ file: "", line: 0, column: 1 }), { root });
      assert.equal(response.status, 400);
    } finally {
      process.env.NODE_ENV = previous;
    }
  });
});

function request(body: unknown): Request {
  return new Request("http://localhost/api/inspector", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}
