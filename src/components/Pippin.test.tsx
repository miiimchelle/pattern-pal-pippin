import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Pippin } from './Pippin';
import {
  VERY_HAPPY_LINES,
  ANGRY_WITCH_LINES,
  LOADING_LINES,
  ERROR_LINES,
  IDLE_LINES,
  CHECKING_LINES,
  EXCITED_LINES,
  PROUD_LINES,
  IDEA_LINES,
  SUCCESS_LINES,
  AT_NIGHT_LINES,
} from './pippinCopy';

/** Get the speech bubble text from the rendered Pippin */
function getSpeechText(container: HTMLElement): string {
  // The speech bubble is the second child div (after the sprite)
  const bubble = container.querySelector('.relative');
  // Text content minus the tail div's text (which is empty anyway)
  return bubble?.textContent?.trim() ?? '';
}

describe('Pippin', () => {
  it('renders without crashing in idle state', () => {
    const { container } = render(<Pippin status="idle" overallConsistency={null} />);
    expect(container.querySelector('div')).toBeTruthy();
  });

  it('shows a VeryHappy line when consistency >= 85', () => {
    const { container } = render(<Pippin status="success" overallConsistency={90} />);
    expect(VERY_HAPPY_LINES).toContain(getSpeechText(container));
  });

  it('shows an AngryWitch line when consistency < 40', () => {
    const { container } = render(<Pippin status="success" overallConsistency={20} />);
    expect(ANGRY_WITCH_LINES).toContain(getSpeechText(container));
  });

  it('shows a loading line when status is loading', () => {
    const { container } = render(<Pippin status="loading" overallConsistency={null} />);
    expect(LOADING_LINES).toContain(getSpeechText(container));
  });

  it('shows a checking line when status is checking', () => {
    const { container } = render(<Pippin status="checking" overallConsistency={null} />);
    expect(CHECKING_LINES).toContain(getSpeechText(container));
  });

  it('shows an error line when status is error', () => {
    const { container } = render(<Pippin status="error" overallConsistency={null} />);
    expect(ERROR_LINES).toContain(getSpeechText(container));
  });

  it('shows an Excited line when consistency 70-84', () => {
    const { container } = render(<Pippin status="success" overallConsistency={75} />);
    expect(EXCITED_LINES).toContain(getSpeechText(container));
  });

  it('shows a Proud line when consistency 55-69', () => {
    const { container } = render(<Pippin status="success" overallConsistency={60} />);
    expect(PROUD_LINES).toContain(getSpeechText(container));
  });

  it('shows an Idea line when consistency 40-54', () => {
    const { container } = render(<Pippin status="success" overallConsistency={45} />);
    expect(IDEA_LINES).toContain(getSpeechText(container));
  });

  it('shows a generic success line for team-scan (null consistency)', () => {
    const { container } = render(<Pippin status="success" overallConsistency={null} />);
    expect(SUCCESS_LINES).toContain(getSpeechText(container));
  });

  it('shows idle line when status is idle and no result', () => {
    const { container } = render(<Pippin status="idle" overallConsistency={null} />);
    const text = getSpeechText(container);
    // Could be idle or at-night depending on time
    const validLines = [...IDLE_LINES, ...AT_NIGHT_LINES];
    expect(validLines).toContain(text);
  });
});
