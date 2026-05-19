'use strict';

import Store from 'electron-store';
import { migrateWeekendMerge } from './2026-05-05-weekendMerge';

/**
 * Orchestrates all data migrations for the application.
 */
export function runMigrations(store: Store<any>): void {
  console.log('Running data migrations...');

  migrateWeekendMerge(store);

  // Add future migrations here
}
