# Weekly Planner

A minimal Electron-based desktop application for weekly task planning and daily check-ins.

## Architecture

- **Main Process (`main.ts`, `src/*.ts`):** Handles system integration (Tray, Notifications, Store, Window).
- **Preload Script (`preload.ts`):** Secure bridge exposing the `planner` API to the renderer.
- **Renderer Process (`src/renderer/`):** Modular ESM-based front-end. `state.ts` is the single source of truth.
- **Styles (`styles.css`):** Centralized CSS for all themes and layout.

## Development Mandates

### 1. State-First Rendering
- **Source of Truth:** `src/renderer/state.ts` contains the active `weekData`.
- **Flow:** Update state via mutation functions -> Trigger re-render (`renderDay` or `renderGrid`). 
- **Persistence:** `saveDay` persists state to disk; it must never read physical values from the DOM.

### 2. Testing & Verification
- **Renderer Logic:** Run `npm test test/renderer/state.test.ts` when modifying data mutations.
- **UI Consistency:** Run `npm test test/renderer/ui.test.ts` when modifying UI builder functions in `ui.ts`.
- **Integrity:** Run `npm run type-check` before concluding any architectural change.

### 3. Coding Style
- **Strict Mode:** Always use `'use strict';` at the top of TS files.
- **Persistence Keys:** Weeks: `YYYY-Www` | Days: `YYYY-MM-DD`.
- **Environment:** Use PowerShell with `.cmd` wrappers (e.g., `npm.cmd`) for all CLI tools.

## Workflows

| Command | Action |
| :--- | :--- |
| `npm.cmd start` | Build and run development mode |
| `npm.cmd test` | Run entire Jest test suite |
| `npm.cmd run build` | Package Windows executable |

## Future Work
- [ ] Customizable notification intervals via UI.
- [ ] Weekend view toggle.
- [ ] Task priority or tagging.
