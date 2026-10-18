import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const SAFE_EDITOR = /^(?:[A-Za-z]:\\[^"&|<>^%\r\n]+|[A-Za-z0-9._-]+)$/;

export type EditorLaunch = {
  command: string;
  args: string[];
};

export type OpenEditorInput = {
  file: string;
  line: number;
  column: number;
  root: string;
  editor?: string;
};

export class InspectorPathError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InspectorPathError";
  }
}

export function editorLaunch(input: OpenEditorInput): EditorLaunch {
  const file = resolveInsideRoot(input.root, input.file);
  const command = input.editor ?? process.env.INSPECTOR_EDITOR ?? "cursor";
  if (!SAFE_EDITOR.test(command)) {
    throw new InspectorPathError("Editor command is not allowed");
  }
  return {
    command,
    args: ["--goto", `${file}:${input.line}:${input.column}`],
  };
}

const deliveries = new Map<string, Promise<void>>();

export async function openInEditor(
  input: OpenEditorInput,
  spawnEditor: (command: string, args: string[]) => Promise<void> = defaultSpawn,
): Promise<void> {
  const launch = editorLaunch(input);
  const key = `${launch.command}\0${launch.args.join("\0")}`;
  const existing = deliveries.get(key);
  if (existing != null) return existing;
  const pending = spawnEditor(launch.command, launch.args);
  deliveries.set(key, pending);
  void pending.finally(() => {
    setTimeout(() => {
      if (deliveries.get(key) === pending) deliveries.delete(key);
    }, 30_000);
  });
  return pending;
}

export function focusLaunchedEditor(input: OpenEditorInput): void {
  const launch = editorLaunch(input);
  const resolved = editorProcess(launch.command, launch.args);
  if (resolved.focusName != null) focusWindowsApp(resolved.focusName);
}

export function editorDeliveryReady(output: string): boolean {
  return output.includes("Sent env to running instance");
}

function resolveInsideRoot(root: string, file: string): string {
  if (file.includes("\0")) throw new InspectorPathError("File is outside the project");
  const rootPath = path.resolve(root);
  const resolved = path.resolve(rootPath, file);
  if (!isInside(rootPath, resolved)) throw new InspectorPathError("File is outside the project");
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
    throw new InspectorPathError("File not found");
  }
  const realRoot = fs.realpathSync(rootPath);
  const realFile = fs.realpathSync(resolved);
  if (!isInside(realRoot, realFile)) throw new InspectorPathError("File is outside the project");
  return realFile;
}

function isInside(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
}

function defaultSpawn(command: string, args: string[]): Promise<void> {
  const resolved = editorProcess(command, [...args, "--verbose"]);
  return new Promise((resolve, reject) => {
    const child = spawn(resolved.file, resolved.args, {
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
      env: resolved.env,
    });
    let output = "";
    let settled = false;
    const finish = (): void => {
      if (settled) return;
      settled = true;
      child.unref();
      resolve();
    };
    const onData = (chunk: Buffer): void => {
      output += chunk.toString("utf8");
      if (editorDeliveryReady(output)) setTimeout(finish, 50);
    };
    child.stdout?.on("data", onData);
    child.stderr?.on("data", onData);
    child.once("error", (error) => {
      if (settled) return;
      settled = true;
      reject(error);
    });
    child.once("exit", finish);
    setTimeout(finish, 4_000);
  });
}

export function editorProcess(
  command: string,
  args: string[],
  pathEnv: string = process.env.PATH ?? "",
): { file: string; args: string[]; env: NodeJS.ProcessEnv; focusName?: string } {
  const resolved = findCommand(command, pathEnv);
  const shim = windowsEditorShim(resolved);
  if (shim != null) {
    return {
      file: shim.exe,
      args: [shim.cli, ...args],
      env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" },
      focusName: shim.focusName,
    };
  }
  return { file: resolved, args, env: process.env };
}

function findCommand(command: string, pathEnv: string): string {
  if (command.includes("/") || command.includes("\\") || path.isAbsolute(command)) {
    if (!fs.existsSync(command)) throw new InspectorPathError("Editor command was not found");
    return command;
  }
  const matches = commandMatches(command, pathEnv);
  const workingShim = matches.find((match) => windowsEditorShim(match) != null);
  const found = workingShim ?? matches[0];
  if (found == null) throw new InspectorPathError("Editor command was not found");
  return found;
}

function commandMatches(command: string, pathEnv: string): string[] {
  const extensions = process.platform === "win32" ? [".cmd", ".exe", ".bat", ""] : [""];
  const matches: string[] = [];
  for (const directory of pathEnv.split(path.delimiter)) {
    if (directory === "") continue;
    for (const extension of extensions) {
      const candidate = path.join(directory, `${command}${extension}`);
      if (fs.existsSync(candidate)) matches.push(candidate);
    }
  }
  return matches;
}

function windowsEditorShim(commandPath: string): { exe: string; cli: string; focusName: string } | null {
  if (process.platform !== "win32") return null;
  if (!commandPath.toLowerCase().endsWith(".cmd") && !commandPath.toLowerCase().endsWith(".bat")) return null;
  const directory = path.dirname(commandPath);
  const cli = path.resolve(directory, "..", "out", "cli.js");
  const root = path.resolve(directory, "..", "..", "..");
  if (!fs.existsSync(cli)) return null;
  for (const name of ["Cursor.exe", "Code.exe"]) {
    const exe = path.join(root, name);
    if (fs.existsSync(exe)) return { exe, cli, focusName: name.slice(0, -4) };
  }
  return null;
}

export function warmEditorFocus(): void {
  if (process.platform !== "win32") return;
  try {
    const child = spawn(focusExePath(), ["InspectorFocusWarmup"], { stdio: "ignore", windowsHide: true });
    child.unref();
  } catch {
    // A missing compiler leaves inspect able to open the file without raising the window.
  }
}

function focusWindowsApp(processName: string): void {
  if (process.platform !== "win32" || !/^[A-Za-z0-9]+$/.test(processName)) return;
  let exe: string;
  try {
    exe = focusExePath();
  } catch {
    return;
  }
  const child = spawn(exe, [processName], { stdio: "ignore", windowsHide: true });
  child.unref();
}

function focusExePath(): string {
  const dir = path.join(os.tmpdir(), "hrms-inspector-focus");
  fs.mkdirSync(dir, { recursive: true });
  const sourcePath = path.join(dir, "focus.cs");
  const exePath = path.join(dir, "focus.exe");
  const source = focusProgramSource();
  if (fs.existsSync(exePath) && fs.existsSync(sourcePath) && fs.readFileSync(sourcePath, "utf8") === source) return exePath;
  fs.writeFileSync(sourcePath, source);
  const compiler = path.join(process.env.WINDIR ?? "C:\\Windows", "Microsoft.NET", "Framework64", "v4.0.30319", "csc.exe");
  const result = spawnSync(compiler, ["/nologo", "/optimize+", "/target:winexe", `/out:${exePath}`, sourcePath], {
    windowsHide: true,
  });
  if (result.status !== 0) {
    throw new Error(result.stderr?.toString() || "Could not compile the focus helper");
  }
  return exePath;
}

export function focusProgramSource(): string {
  return `
using System;
using System.Diagnostics;
using System.Runtime.InteropServices;

internal static class InspectorFocus {
  [DllImport("user32.dll")] private static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] private static extern bool SetForegroundWindow(IntPtr hWnd);
  [DllImport("user32.dll")] private static extern bool BringWindowToTop(IntPtr hWnd);
  [DllImport("user32.dll")] private static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
  [DllImport("user32.dll")] private static extern bool IsIconic(IntPtr hWnd);
  [DllImport("user32.dll")] private static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint pid);
  [DllImport("user32.dll")] private static extern bool AttachThreadInput(uint idAttach, uint idAttachTo, bool fAttach);

  private static int Main(string[] args) {
    if (args.Length == 0) return 0;
    Process match = null;
    foreach (Process process in Process.GetProcessesByName(args[0])) {
      if (process.MainWindowHandle != IntPtr.Zero) { match = process; break; }
    }
    if (match == null) return 0;
    IntPtr hwnd = match.MainWindowHandle;
    if (IsIconic(hwnd)) ShowWindow(hwnd, 9);
    IntPtr foreground = GetForegroundWindow();
    uint pid;
    uint foregroundThread = GetWindowThreadProcessId(foreground, out pid);
    uint targetThread = GetWindowThreadProcessId(hwnd, out pid);
    AttachThreadInput(foregroundThread, targetThread, true);
    BringWindowToTop(hwnd);
    if (!SetForegroundWindow(hwnd)) ShowWindow(hwnd, 5);
    AttachThreadInput(foregroundThread, targetThread, false);
    return 0;
  }
}
`.trim();
}
