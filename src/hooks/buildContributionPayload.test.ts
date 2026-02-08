import { describe, it, expect } from 'vitest';
import { buildContributionPayload, type PatternGroup } from './usePluginMessages';

function makeGroup(overrides: Partial<PatternGroup> = {}): PatternGroup {
  return {
    fingerprint: '375x812_2files',
    frames: [
      {
        id: '1',
        name: 'Frame A',
        width: 375,
        height: 812,
        childCount: 3,
        maxDepth: 2,
        componentIds: [],
        componentNames: [],
        aspectRatio: 0.46,
        layoutMode: 'NONE',
        cornerRadius: 0,
        hasAutoLayout: false,
        fillCount: 1,
        childTypeDistribution: {},
      },
    ],
    consistency: 80,
    componentUsage: [],
    nameMatches: [],
    libraryMatches: [],
    ...overrides,
  };
}

describe('buildContributionPayload', () => {
  it('returns correct shape for empty results', () => {
    const payload = buildContributionPayload([], 'team-1');
    expect(payload.teamId).toBe('team-1');
    expect(payload.patternCount).toBe(0);
    expect(payload.patterns).toEqual([]);
    expect(payload.componentUsageSummary).toEqual({});
    expect(payload.timestamp).toBeTruthy();
  });

  it('summarises pattern count and frame counts', () => {
    const groups = [
      makeGroup({ fingerprint: 'a', frames: [makeGroup().frames[0], makeGroup().frames[0]] }),
      makeGroup({ fingerprint: 'b' }),
    ];
    const payload = buildContributionPayload(groups, 'team-2');
    expect(payload.patternCount).toBe(2);
    expect(payload.patterns[0].frameCount).toBe(2);
    expect(payload.patterns[1].frameCount).toBe(1);
  });

  it('carries consistency and fingerprint through', () => {
    const group = makeGroup({ fingerprint: 'fp-x', consistency: 42 });
    const payload = buildContributionPayload([group], 'team-3');
    expect(payload.patterns[0].fingerprint).toBe('fp-x');
    expect(payload.patterns[0].consistency).toBe(42);
  });

  it('aggregates component usage across patterns', () => {
    const comp = (name: string) => ({
      id: '1',
      name,
      description: '',
      fileKey: 'k',
      fileName: 'f',
      fileUrl: 'u',
    });

    const groups = [
      makeGroup({ componentUsage: [comp('Button'), comp('Input')] }),
      makeGroup({ componentUsage: [comp('Button'), comp('Card')] }),
    ];
    const payload = buildContributionPayload(groups, 'team-4');
    expect(payload.componentUsageSummary).toEqual({ Button: 2, Input: 1, Card: 1 });
  });

  it('counts library matches per pattern', () => {
    const group = makeGroup({
      libraryMatches: [
        { componentId: 'c1', componentName: 'A', similarity: 90, fileKey: 'k', fileUrl: 'u' },
        { componentId: 'c2', componentName: 'B', similarity: 80, fileKey: 'k', fileUrl: 'u' },
      ],
    });
    const payload = buildContributionPayload([group], 'team-5');
    expect(payload.patterns[0].libraryMatchCount).toBe(2);
  });

  it('lists component names per pattern', () => {
    const comp = (name: string) => ({
      id: '1',
      name,
      description: '',
      fileKey: 'k',
      fileName: 'f',
      fileUrl: 'u',
    });
    const group = makeGroup({ componentUsage: [comp('Avatar'), comp('Badge')] });
    const payload = buildContributionPayload([group], 'team-6');
    expect(payload.patterns[0].componentNames).toEqual(['Avatar', 'Badge']);
  });
});
