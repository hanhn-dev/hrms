import { defineManifest } from "@crxjs/vite-plugin";
import { ALLOWED_HOST_MATCH_PATTERNS } from "./src/shared/allowed-hosts";
import { getChromeCommandsManifest } from "./src/features/shortcuts";

const allowedHosts = [...ALLOWED_HOST_MATCH_PATTERNS];

export default defineManifest({
  manifest_version: 3,
  name: "Form Autofill",
  description:
    "Scan form fields, fill random values, and keystroke-type to exercise validation UI.",
  version: "1.0.0",
  icons: {
    "16": "public/icons/icon-16.png",
    "32": "public/icons/icon-32.png",
    "48": "public/icons/icon-48.png",
    "128": "public/icons/icon-128.png",
  },
  action: {
    default_popup: "index.html",
    default_title: "Form Autofill",
    default_icon: {
      "16": "public/icons/icon-16.png",
      "32": "public/icons/icon-32.png",
      "48": "public/icons/icon-48.png",
      "128": "public/icons/icon-128.png",
    },
  },
  background: {
    service_worker: "src/background/service-worker.ts",
    type: "module",
  },
  permissions: ["contextMenus", "storage", "activeTab", "scripting"],
  host_permissions: allowedHosts,
  content_scripts: [
    {
      matches: allowedHosts,
      js: ["src/content/content-script.ts"],
      run_at: "document_idle",
      all_frames: true,
    },
  ],
  commands: getChromeCommandsManifest(),
});
