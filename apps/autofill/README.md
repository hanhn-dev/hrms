# Form Autofill (`apps/autofill`)

Chrome Manifest V3 extension that scans form fields, fills random values, and keystroke-types into inputs so you can exercise validation UI on any web form.

## Stack

- React 19 + Vite 8 + `@crxjs/vite-plugin`
- Ant Design 6 + Tailwind CSS v4 (`autofill:` prefix)
- Feature-based layout under `src/features/`

## Develop / build

From the monorepo root:

```bash
npm install
npm run build --workspace=autofill
# or during development (CRX HMR):
npm run dev --workspace=autofill
```

Load the unpacked extension:

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. **Load unpacked** → select `apps/autofill/dist`

## Usage

1. Open a page with a form.
2. Use the blue floating **Form** button (bottom-right on the top page; drag to reposition — position is remembered across extension reloads) to open Pick & scan, Scan page, Pick & fill, or Auto-type without opening the extension popup.
3. Or click the extension → **Pick & scan** (inspector mode):
   - Popup closes; click the form section (or any field inside it).
   - Works inside iframes (picker starts in every frame that has inputs).
   - A blue highlight follows the cursor; Esc cancels.
   - Re-open the popup to see captured fields.
4. Or use **Scan page** to auto-pick the frame/document with the most fields.
5. **Pick & fill** uses the same inspector: click a section, then that area is scanned and filled immediately.
6. With fields checked in the popup, **Fill selected** fills only those fields (no new pick).
7. Context-menu fill still uses the last marked section / context target.
8. **Auto-type selected** keystroke-fills one field (validation testing).

## Features

| Feature | Path | Role |
|---------|------|------|
| `scan` | `src/features/scan` | Field discovery + kind heuristics |
| `fill` | `src/features/fill` | Instant React-safe fill |
| `auto-type` | `src/features/auto-type` | Per-character keystroke typing |
| `popup` | `src/features/popup` | Ant Design popup panels |
| `float-menu` | `src/features/float-menu` | On-page FAB + feature menu (top frame) |
| `context-menu` | `src/features/context-menu` | Menu ids / registration |

Thin adapters: `src/background/service-worker.ts`, `src/content/content-script.ts`. Shared contracts: `src/shared/`.


## Tests

```bash
npm run test --workspace=autofill
```
