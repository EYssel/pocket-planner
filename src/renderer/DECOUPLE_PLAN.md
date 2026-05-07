# Decouple State from DOM (State-First Rendering)

## Objective
Establish `weekData` as the single source of truth. UI updates should flow from state changes, and persistence should save the state object rather than reading from the DOM.

## Key Files & Context
- `src/renderer/state.ts`: Will hold the state and the primary `saveDay` logic.
- `src/renderer/ui.ts`: Will be modified to focus on rendering data from the state.
- `src/renderer/events.ts`: Will be updated to modify state before triggering re-renders.

## Implementation Steps
1.  **Refactor `saveDay`**: Update `saveDay` in `state.ts` to accept the plans directly from state instead of calling `getPlansFromDOM`.
2.  **State Mutation Functions**: Add helper functions in `state.ts` to update specific days/tasks:
    - `addTask(dayKey)`
    - `updateTask(dayKey, index, text)`
    - `toggleTask(dayKey, index)`
    - `deleteTask(dayKey, index)`
    - `moveTask(sourceDayKey, sourceIndex, targetDayKey, targetIndex, isDone)`
3.  **Update UI Handlers**:
    - In `events.ts`, change the click handlers to call the new state mutation functions.
    - After state mutation, call a targeted render function (e.g., `renderDay(dayKey)`) or `renderGrid()`.
4.  **Remove `getPlansFromDOM`**: Delete `getPlansFromDOM` from `ui.ts` once all logic is moved to state-first.
5.  **Refactor Drag & Drop**: Update `dragDrop.ts` to update the state object when a drop occurs.

## Verification & Testing
1.  Verify that typing in a task saves correctly (via state).
2.  Verify that toggling "done" updates the state and moves the item in the UI.
3.  Verify that drag and drop correctly moves the task in the state object and persists.
4.  Ensure no regressions in multi-day operations.
