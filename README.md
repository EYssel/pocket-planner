# Pocket Planner

A minimal desktop app for planning your week with daily morning notifications.

## Setup

**Prerequisites:** Node.js 20+

```bash
npm install
npm start
```

## How it works

- **Configurable Notifications** — Choose your preferred interval (30m, 1h, 2h, 4h) in Settings ⚙️.
- **Respects Your Workday** — Notifications only fire during your configured **Work Start** and **Work End** hours.
- **Smart Messaging** — Notifications change dynamically based on the time of day, progress on your tasks, and special focus for Monday planning.
- **Deep Linking** — Clicking a notification opens the app directly to the relevant view.
- **System Tray** — The app stays active in the system tray (bottom-right on Windows, menu bar on Mac) to ensure notifications fire reliably.

> ⚠️ Notifications only fire while the app is running in the background/tray. Quit from the tray menu to stop them completely.

## Features & Usage

- **Add task** — click `+ task` or press Enter inside a task field.
- **Complete task** — click the checkbox.
- **Task Notes** — hover a task and click the 📄 icon to add detailed notes or links. Tasks with notes stay highlighted.
- **Any-Day Summary** — hover over any day header and click 📋 to generate a summary for that specific day (and the previous workday).
- **Global Summary** — click the 📋 icon in the main header for a quick "Today" vs "Yesterday" breakdown.
- **Contextual Actions** — buttons for **Notes** and **Delete** stay hidden until you hover a task row, keeping the UI clean.
- **Recycle Bin** — deleted tasks go to the bin first. Restore them if you change your mind!
- **Weekly Cleanup** — start a new week by reviewing and carrying forward incomplete tasks from the previous week.
- **What's New** — robust markdown-rendered release notes keep you informed of updates.
- **Themes** — 26 built-in themes (Dark, Light, Nord, Dracula, and more) accessible via Settings ⚙️.
- **Save** — auto-saves on focus-out, or press `Cmd/Ctrl+S` manually.

## Data

Plans are stored locally in your OS app-data folder via `electron-store`. No cloud, no account.

## Author

- **Estian Yssel**
