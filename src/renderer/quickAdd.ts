'use strict';

import { WeekData } from './types';

let activeDayIndex = 0;
let weekData: WeekData | null = null;

export async function initQuickAdd(): Promise<void> {
  document.body.classList.add('quick-add-mode');
  
  const container = document.getElementById('quick-add-container');
  if (container) {
    container.style.display = 'flex';
  }

  const input = document.getElementById('quick-add-input') as HTMLInputElement;
  if (input) {
    input.focus();
  }

  try {
    weekData = await window.planner.getWeek('');
    if (weekData && weekData.days) {
      // Find today's index in days (default to 0 if not found)
      const todayIndex = weekData.days.findIndex(day => day.isToday);
      activeDayIndex = todayIndex !== -1 ? todayIndex : 0;

      renderDayChips();
      setupQuickAddEvents();
    }
  } catch (err) {
    console.error('Failed to initialize Quick Add:', err);
  }
}

function renderDayChips(): void {
  const selector = document.getElementById('quick-add-day-selector');
  if (!selector || !weekData || !weekData.days) return;

  selector.innerHTML = '';

  weekData.days.forEach((day, index) => {
    const chip = document.createElement('div');
    chip.className = 'quick-add-chip';
    if (index === activeDayIndex) {
      chip.classList.add('active');
    }

    // Format chip label: "Mon 25" or "Weekend 29-30"
    const isWeekend = day.key.endsWith('-WE');
    const label = isWeekend ? `${day.dayName} ${day.date}` : `${day.dayName} ${day.date}`;
    chip.textContent = label;

    chip.addEventListener('click', () => {
      activeDayIndex = index;
      updateActiveChip();
      const input = document.getElementById('quick-add-input') as HTMLInputElement;
      if (input) input.focus();
    });

    selector.appendChild(chip);
  });
}

function updateActiveChip(): void {
  const selector = document.getElementById('quick-add-day-selector');
  if (!selector) return;

  const chips = selector.querySelectorAll('.quick-add-chip');
  chips.forEach((chip, index) => {
    if (index === activeDayIndex) {
      chip.classList.add('active');
    } else {
      chip.classList.remove('active');
    }
  });
}

function setupQuickAddEvents(): void {
  const input = document.getElementById('quick-add-input') as HTMLInputElement;
  if (!input) return;

  window.addEventListener('keydown', async (e: KeyboardEvent) => {
    // 1. Esc: close window
    if (e.key === 'Escape') {
      e.preventDefault();
      await window.planner.closeQuickAdd();
      return;
    }

    // 2. Enter or Ctrl+Enter: save
    if (e.key === 'Enter') {
      e.preventDefault();
      const text = input.value.trim();
      if (!text) return;

      const isCtrlEnter = e.ctrlKey || e.metaKey;
      await saveTask(text);

      if (isCtrlEnter) {
        input.value = '';
        input.focus();
      } else {
        await window.planner.closeQuickAdd();
      }
      return;
    }

    // 3. Alt+1-7: Day selection
    if (e.altKey && e.key >= '1' && e.key <= '7') {
      e.preventDefault();
      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= 5) {
        activeDayIndex = num - 1;
      } else if (num === 6 || num === 7) {
        activeDayIndex = 5; // Weekend chip
      }
      updateActiveChip();
      return;
    }

    // 4. Ctrl+Left / Ctrl+Right: Cycle day selection
    if ((e.ctrlKey || e.metaKey) && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
      e.preventDefault();
      if (e.key === 'ArrowLeft') {
        activeDayIndex = (activeDayIndex - 1 + 6) % 6;
      } else {
        activeDayIndex = (activeDayIndex + 1) % 6;
      }
      updateActiveChip();
      return;
    }
  });
}

async function saveTask(text: string): Promise<void> {
  if (!weekData || !weekData.days) return;

  try {
    // Fetch latest plans from store to prevent overwriting other new additions
    const latestWeek = await window.planner.getWeek(weekData.key);
    const targetDay = latestWeek.days[activeDayIndex];
    if (!targetDay) return;

    const dayKey = targetDay.key;
    const currentPlans = targetDay.plans || [];

    const newTask = {
      text: text,
      done: false,
    };

    const updatedPlans = [...currentPlans, newTask];
    await window.planner.savePlans(dayKey, updatedPlans);
    
    // Also update our local cached weekData plans
    targetDay.plans = updatedPlans;
    if (weekData.days[activeDayIndex]) {
      weekData.days[activeDayIndex].plans = updatedPlans;
    }
  } catch (err) {
    console.error('Failed to save Quick Add task:', err);
  }
}
