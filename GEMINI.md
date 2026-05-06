# Weekly Planner

A minimal Electron-based desktop application for weekly task planning and daily check-ins.

## Project Architecture

The application follows a standard Electron multi-process architecture with a clear separation between the main process (system level), the preload script (secure bridge), and the renderer process (UI).

### Core Components

-   **Main Process (`main.js`):** Entry point. Manages application lifecycle, window creation, tray icon, notifications, and IPC registration.
-   **Renderer Process (`renderer.js`, `index.html`):** The front-end. A Vanilla JS application that handles UI rendering, user interactions, and communicates with the main process via the `planner` API.
-   **Preload Script (`preload.js`):** Acts as a secure bridge between Main and Renderer. Exposes a limited `planner` API to the renderer while keeping `nodeIntegration` disabled.
-   **Source Directory (`src/`):** Contains modularized backend logic:
    -   `window.js`: Window management (single instance lock, creation, persistence).
    -   `ipc.js`: Defines IPC handlers for data retrieval and storage.
    -   `store.js`: Data persistence using `electron-store`.
    -   `tray.js`: System tray integration.
    -   `notifications.js`: Reminder logic using `node-cron` for periodic check-ins.
    -   `weekUtils.js`: ISO 8601 week calculations and date formatting.

## Conventions

### Coding Style
-   **Strict Mode:** Always use `'use strict';` at the top of JavaScript files.
-   **Modules:** Uses CommonJS (`require`/`module.exports`) for backend modules.
-   **Async/Await:** Prefer `async/await` for handling IPC calls and asynchronous operations.
-   **Naming:** 
    -   CamelCase for variables and functions.
    -   Surgical updates: When modifying files, maintain existing formatting and style.

### State & Data
-   **Keys:** 
    -   Weeks are keyed by `YYYY-Www` (e.g., `2026-W17`).
    -   Days are keyed by `YYYY-MM-DD` (e.g., `2026-04-23`).
-   **Persistence:** 
    -   Data is stored locally using `electron-store` under the `days` and `settings` keys.
    -   **DOM Synchronization:** Task persistence follows a container-based strategy. `getPlansFromDOM(dayKey)` scans the specific containers (`#tasks-${dayKey}`, `#done-tasks-${dayKey}`) to ensure physical DOM position determines the saved state.
    -   **Metadata:** Task elements maintain a `data-day-key` attribute which is synchronized during drag-and-drop operations to maintain consistency between the DOM and the state.

### UI/UX
-   **Styling:** Custom CSS in `index.html` using a dark-themed, monospace-leaning aesthetic.
-   **Responsiveness:** Grid-based layout with 6 columns (Monday–Friday + combined Saturday/Sunday).

## Workflows

### Command Environment (Windows/PowerShell)
The agent executes shell commands using PowerShell. To avoid execution policy errors (e.g., with `.ps1` files), always use the `.cmd` wrapper for Node.js tools (e.g., `npm.cmd`, `npx.cmd`) instead of the bare command.

### Running the App
```bash
npm.cmd start
```

### Building the App
```bash
npm.cmd run build
```

### Testing
```bash
npm.cmd test
npm.cmd run test:e2e
```

Builds a Windows executable using `electron-builder`.

## Planned Features / Future Work
-   [ ] Customizable notification intervals via UI.
-   [ ] Weekend view toggle.
-   [ ] Task priority or tagging.
