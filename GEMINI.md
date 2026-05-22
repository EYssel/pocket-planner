# Weekly Planner

A minimal Electron-based desktop application for weekly task planning and daily check-ins.

## Architecture

- **Main Process (`main.ts`, `src/*.ts`):** Handles system integration (Tray, Notifications, Store, Window).
- **Preload Script (`preload.ts`):** Secure bridge exposing the `planner` API to the renderer.
- **Renderer Process (`src/renderer/`):** Modular ESM-based front-end. `state.ts` is the single source of truth.
- **Styles (`styles.css`):** Centralized CSS for all themes and layout.

## Naming Conventions

- **System/Data Identifier:** `weekly-planner` (Production) and `weekly-planner-dev` (Development). These are used for package identifiers and application data folders in `%APPDATA%`.
- **UI Display Name:** `Weekly Planner`. Used for window titles, logos, and user-facing text.

## Development Mandates

### 1. State-First Rendering
- **Source of Truth:** `src/renderer/state.ts` contains the active `weekData`.
- **Flow:** Update state via mutation functions -> Trigger re-render (`renderDay` or `renderGrid`). 
- **Persistence:** `saveDay` persists state to disk; it must never read physical values from the DOM.

### 2. Testing & Verification
- **Renderer Logic:** Run `npm test test/renderer/state.test.ts` when modifying data mutations.
- **UI Consistency:** Run `npm test test/renderer/ui.test.ts` when modifying UI builder functions in `ui.ts`.
- **Release Notes:** To verify the "What's New" modal, run `npx.cmd ts-node scripts/test-release-notes-ui.ts` before starting the app.
- **Integrity:** Run `npm run type-check` before concluding any architectural change.

### 3. Coding Style
- **Strict Mode:** Always use `'use strict';` at the top of TS files.
- **Persistence Keys:** Weeks: `YYYY-Www` | Days: `YYYY-MM-DD`.
- **Environment:** Use PowerShell with `.cmd` wrappers (e.g., `npm.cmd`) for all CLI tools.

## Infrastructure & Storage

### Application Data
The app uses isolated data directories to prevent development from affecting production:
- **Development:** `%APPDATA%\weekly-planner-dev\` (File: `config-dev.json`)
- **Production:** `%APPDATA%\weekly-planner\` (File: `config.json`)

*Note: If running scripts via `ts-node` without an Electron environment, `electron-store` may default to its own project-named folder unless `cwd` is explicitly provided.*

### 4. Task Notes & Persistence
- **Structure:** Tasks support an optional `notes?: string` field.
- **UX:** Access via an SVG icon in the task row. 
    - **Visibility:** Icon is `transparent` by default, becomes visible on `:hover`, and stays visible (`var(--accent)`) if `notes` is non-empty.
- **Persistence Mandate:** All backend saving logic (e.g., `src/store.ts`) MUST explicitly include the `notes` field during validation. Failure to do so will result in data loss during saves, restores, or cleanup actions.
- **Summaries:** Notes must be included in the "Today's Summary" export, indented beneath the parent task.

### 5. OS Integration (Main Process Sync)
- **Flow:** Renderer (`state.ts`) calculates statistics -> `window.planner.updateOSState` -> Main Process (`ipc.ts`) -> Updates Tray (`tray.ts`) and Taskbar/Dock (`window.ts`).
- **Stats:** Always include `nextTaskText` (first incomplete task), `doneCount`, and `totalCount` for the current day.
- **Visuals:** 
    - **Tray:** Tooltip shows the next task.
    - **Taskbar (Windows):** Progress bar reflects daily completion.
    - **Dock (macOS):** Badge count shows remaining tasks for today.

### 6. Recurring Tasks
- **Model**: Templates stored in `recurringTasks`. Instances injected into daily plans via `syncRecurringTasks(weekKey)`.
- **Generation**: Triggered automatically for the current week on launch; manually triggered for future weeks via the Sync button.
- **Sync Logic**: Injects tasks from templates that aren't already present (checked via `recurringId`).
- **Persistence Mandate**: Backend saving logic (`src/store.ts`) MUST preserve `recurringId`.
- **Management**: Centralized modal for managing templates; contextual icon on tasks for quick setup.

## Workflows

| Command | Action |
| :--- | :--- |
| `npm.cmd start` | Build and run development mode |
| `npm.cmd test` | Run entire Jest test suite |
| `npm.cmd run build` | Package Windows executable |

## Future Work
- [x] Customizable notification intervals via UI.
- [x] Recurring tasks (Daily/Weekly/Specific Days).
- [ ] Weekend view toggle.
- [ ] Task priority or tagging.
- [ ] Global Keyboard Shortcut (Quick Add).
- [ ] Keyboard-centric/Vim-like navigation (j/k/h/l, x for done).
- [ ] Recurring tasks (Daily/Weekly).
- [ ] Global search across historical weeks and notes.
- [ ] Automatic archival system for old "Done" tasks.
- [ ] Issue/Ticket auto-linking (e.g., #123, PROJ-456).
- [ ] Calendar Sync (read-only export link).
- [ ] Checklists and sub-tasks within Task Notes.
