import { spawn } from "node:child_process";

const DIALOG_SCRIPT = `
Add-Type -AssemblyName System.Windows.Forms
$dialog = New-Object System.Windows.Forms.FolderBrowserDialog
$dialog.Description = $env:BROWSE_TITLE
$dialog.UseDescriptionForTitle = $true
$dialog.ShowNewFolderButton = $false
if ($env:BROWSE_INITIAL -and (Test-Path -LiteralPath $env:BROWSE_INITIAL -PathType Container)) {
  $dialog.SelectedPath = $env:BROWSE_INITIAL
}
if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
  [Console]::Out.WriteLine($dialog.SelectedPath)
}
`.trim();

let pending = false;

export function parseSelectedFolder(stdout: string): string | null {
  const selected = stdout.replace(/^\uFEFF/, "").trim();
  if (!selected || selected.includes("\n") || selected.includes("\0")) return null;
  return selected;
}

export function browseForFolder(title: string, initialPath?: string): Promise<string | null> {
  if (process.platform !== "win32") {
    return Promise.reject(new Error("Folder browsing is available on Windows."));
  }
  if (pending) {
    return Promise.reject(new Error("A folder dialog is already open."));
  }
  pending = true;
  return openFolderDialog(title, initialPath).finally(() => {
    pending = false;
  });
}

function openFolderDialog(title: string, initialPath?: string): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const child = spawn("powershell.exe", ["-STA", "-NoProfile", "-Command", DIALOG_SCRIPT], {
      env: {
        ...process.env,
        BROWSE_TITLE: title,
        BROWSE_INITIAL: initialPath ?? "",
      },
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });
    child.on("error", () => {
      reject(new Error("The folder dialog could not open."));
    });
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderr.trim() || "The folder dialog could not open."));
        return;
      }
      resolve(parseSelectedFolder(stdout));
    });
  });
}
