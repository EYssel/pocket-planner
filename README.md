# Weekly Planner

A minimal desktop app for planning your week with daily morning notifications.

## Setup

**Prerequisites:** Node.js 18+

```bash
npm install
npm start
```

## How it works

- **Monday 08:00** — notification prompts you to plan your week
- **Tue–Fri 08:00** — notification prompts a morning check-in
- Clicking a notification opens the app in the relevant mode
- The app minimises to the **system tray** (bottom-right on Windows, menu bar on Mac) — it keeps running so notifications can fire

> ⚠️ Notifications only fire while the app is running. It stays alive in the tray until you quit from the tray menu.

## Usage

- **Add task** — click `+ Add task` or press Enter inside a task field
- **Complete task** — click the checkbox
- **Delete task** — hover a task, click `×`
- **Save** — click Save or press `Cmd/Ctrl+S`
- **Clear done** — removes all completed tasks

## Data

Plans are stored locally in your OS app-data folder via `electron-store`. No cloud, no account.
