import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ResultsFilterBar, DEFAULT_FILTER, type FilterState } from './ResultsFilterBar';

describe('ResultsFilterBar', () => {
  it('renders search input', () => {
    const onChange = vi.fn();
    render(<ResultsFilterBar filter={DEFAULT_FILTER} onChange={onChange} />);
    expect(screen.getByPlaceholderText('Filter by name...')).toBeInTheDocument();
  });

  it('calls onChange on text input', () => {
    const onChange = vi.fn();
    render(<ResultsFilterBar filter={DEFAULT_FILTER} onChange={onChange} />);
    fireEvent.change(screen.getByPlaceholderText('Filter by name...'), { target: { value: 'login' } });
    expect(onChange).toHaveBeenCalledWith({ ...DEFAULT_FILTER, searchText: 'login' });
  });

  it('shows expanded filters when Filters button clicked', () => {
    const onChange = vi.fn();
    render(<ResultsFilterBar filter={DEFAULT_FILTER} onChange={onChange} />);
    fireEvent.click(screen.getByText('Filters'));
    expect(screen.getByText(/Min score/)).toBeInTheDocument();
    expect(screen.getByText(/Sort/)).toBeInTheDocument();
  });

  it('toggles sort direction', () => {
    const onChange = vi.fn();
    render(<ResultsFilterBar filter={DEFAULT_FILTER} onChange={onChange} />);
    fireEvent.click(screen.getByText('Filters'));
    fireEvent.click(screen.getByText('Desc'));
    expect(onChange).toHaveBeenCalledWith({ ...DEFAULT_FILTER, sortDir: 'asc' });
  });

  it('shows frame count sort option when showFrameSort is true', () => {
    const onChange = vi.fn();
    render(<ResultsFilterBar filter={DEFAULT_FILTER} onChange={onChange} showFrameSort />);
    fireEvent.click(screen.getByText('Filters'));
    const select = screen.getByDisplayValue('Score');
    const options = select.querySelectorAll('option');
    expect(options).toHaveLength(3);
    expect(options[2].textContent).toBe('Frame count');
  });

  it('hides frame count sort option by default', () => {
    const onChange = vi.fn();
    render(<ResultsFilterBar filter={DEFAULT_FILTER} onChange={onChange} />);
    fireEvent.click(screen.getByText('Filters'));
    const select = screen.getByDisplayValue('Score');
    const options = select.querySelectorAll('option');
    expect(options).toHaveLength(2);
  });

  it('updates min consistency', () => {
    const onChange = vi.fn();
    render(<ResultsFilterBar filter={DEFAULT_FILTER} onChange={onChange} />);
    fireEvent.click(screen.getByText('Filters'));
    const input = screen.getByDisplayValue('0');
    fireEvent.change(input, { target: { value: '50' } });
    expect(onChange).toHaveBeenCalledWith({ ...DEFAULT_FILTER, minConsistency: 50 });
  });

  it('changes button text when expanded', () => {
    const onChange = vi.fn();
    render(<ResultsFilterBar filter={DEFAULT_FILTER} onChange={onChange} />);
    fireEvent.click(screen.getByText('Filters'));
    expect(screen.getByText('Less')).toBeInTheDocument();
  });
});
