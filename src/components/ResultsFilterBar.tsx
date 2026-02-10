import { useState } from 'react';

export interface FilterState {
  minConsistency: number;
  searchText: string;
  sortBy: 'consistency' | 'name' | 'frames';
  sortDir: 'asc' | 'desc';
}

export const DEFAULT_FILTER: FilterState = {
  minConsistency: 0,
  searchText: '',
  sortBy: 'consistency',
  sortDir: 'desc',
};

interface Props {
  filter: FilterState;
  onChange: (filter: FilterState) => void;
  showFrameSort?: boolean;
}

export function ResultsFilterBar({ filter, onChange, showFrameSort = false }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="px-4 pb-2">
      <div className="flex items-center gap-2">
        <input
          type="text"
          placeholder="Filter by name..."
          value={filter.searchText}
          onChange={(e) => onChange({ ...filter, searchText: e.target.value })}
          className="flex-1 text-xs border border-gray-200 rounded px-2 py-1 outline-none focus:border-indigo-400"
        />
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-gray-500 hover:text-gray-700 shrink-0"
          title="More filters"
        >
          {expanded ? 'Less' : 'Filters'}
        </button>
      </div>
      {expanded && (
        <div className="flex items-center gap-3 mt-2 text-xs text-gray-600">
          <label className="flex items-center gap-1">
            Min score
            <input
              type="number"
              min={0}
              max={100}
              value={filter.minConsistency}
              onChange={(e) =>
                onChange({ ...filter, minConsistency: Math.max(0, Math.min(100, Number(e.target.value))) })
              }
              className="w-12 border border-gray-200 rounded px-1 py-0.5 text-xs"
            />
            %
          </label>
          <label className="flex items-center gap-1">
            Sort
            <select
              value={filter.sortBy}
              onChange={(e) => onChange({ ...filter, sortBy: e.target.value as FilterState['sortBy'] })}
              className="border border-gray-200 rounded px-1 py-0.5 text-xs"
            >
              <option value="consistency">Score</option>
              <option value="name">Name</option>
              {showFrameSort && <option value="frames">Frame count</option>}
            </select>
          </label>
          <button
            onClick={() => onChange({ ...filter, sortDir: filter.sortDir === 'asc' ? 'desc' : 'asc' })}
            className="text-xs text-gray-500 hover:text-gray-700"
            title={filter.sortDir === 'asc' ? 'Ascending' : 'Descending'}
          >
            {filter.sortDir === 'asc' ? 'Asc' : 'Desc'}
          </button>
        </div>
      )}
    </div>
  );
}
