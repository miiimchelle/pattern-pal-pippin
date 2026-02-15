export interface FilterState {
  minConsistency: number
  searchText: string
  sortBy: 'consistency' | 'name' | 'frames'
  sortDir: 'asc' | 'desc'
}

export const DEFAULT_FILTER: FilterState = {
  minConsistency: 0,
  searchText: '',
  sortBy: 'consistency',
  sortDir: 'desc',
}
