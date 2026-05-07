'use strict';

import { Task, Day, WeekData as BaseWeekData } from '../types';

export type Plan = Task;

export interface StaleTask extends Plan {
  dayKey: string;
  originalIndex: number;
}

export type DayData = Day;
export type WeekData = BaseWeekData;
