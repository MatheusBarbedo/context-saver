import { gitFilters } from './git.js';
import { testFilters } from './tests.js';
import { lintFilters } from './lint.js';
import { installFilters } from './install.js';
import { listingFilters } from './listing.js';
import { dockerFilters } from './docker.js';
import { httpFilters } from './http.js';
import { searchFilters } from './search.js';
import { bundlerFilters } from './bundler.js';

export const ALL_FILTERS = [
  ...installFilters,
  ...testFilters,
  ...lintFilters,
  ...gitFilters,
  ...listingFilters,
  ...dockerFilters,
  ...httpFilters,
  ...searchFilters,
  ...bundlerFilters,
];

export function findFilter(command) {
  return ALL_FILTERS.find((f) => f.test(command)) || null;
}
