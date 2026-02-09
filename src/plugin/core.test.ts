import { describe, it, expect } from 'vitest'
import {
  rgbToHex,
  fuzzyMatch,
  extractFileKey,
  isButtonComponentName,
  computeStructuralSimilarity,
  computeSimilarity,
  findLibraryMatches,
  clusterFrames,
  getApiNodeDepth,
  buildApiFingerprint,
  extractComponentNodes,
  extractFrameFingerprints,
  type StructuralShape,
  type FrameFingerprint,
  type LibraryComponentFingerprint,
  type ApiNode,
} from './core'

// ==================== TEST HELPERS ====================

function makeShape(overrides: Partial<StructuralShape> = {}): StructuralShape {
  return {
    width: 200,
    height: 300,
    childCount: 5,
    maxDepth: 3,
    aspectRatio: 0.67,
    layoutMode: 'VERTICAL',
    cornerRadius: 8,
    fillCount: 1,
    childTypeDistribution: { TEXT: 2, FRAME: 3 },
    componentIds: ['c1', 'c2'],
    ...overrides,
  }
}

function makeFrame(overrides: Partial<FrameFingerprint> = {}): FrameFingerprint {
  return {
    id: 'frame-1',
    name: 'Card',
    width: 200,
    height: 300,
    childCount: 5,
    maxDepth: 3,
    componentIds: ['c1', 'c2'],
    componentNames: ['Button', 'Icon'],
    aspectRatio: 0.67,
    layoutMode: 'VERTICAL',
    cornerRadius: 8,
    hasAutoLayout: true,
    fillCount: 1,
    childTypeDistribution: { TEXT: 2, FRAME: 3 },
    ...overrides,
  }
}

function makeLibFp(overrides: Partial<LibraryComponentFingerprint> = {}): LibraryComponentFingerprint {
  return {
    id: 'lib-1',
    name: 'LibCard',
    description: '',
    fileKey: 'fk1',
    fileName: 'Design System',
    fileUrl: 'https://figma.com/file/fk1',
    width: 200,
    height: 300,
    childCount: 5,
    maxDepth: 3,
    aspectRatio: 0.67,
    layoutMode: 'VERTICAL',
    cornerRadius: 8,
    fillCount: 1,
    childTypeDistribution: { TEXT: 2, FRAME: 3 },
    ...overrides,
  }
}

// ==================== rgbToHex ====================

describe('rgbToHex', () => {
  it('converts pure red', () => {
    expect(rgbToHex(1, 0, 0)).toBe('#ff0000')
  })

  it('converts pure white', () => {
    expect(rgbToHex(1, 1, 1)).toBe('#ffffff')
  })

  it('converts pure black', () => {
    expect(rgbToHex(0, 0, 0)).toBe('#000000')
  })

  it('converts mid-gray', () => {
    expect(rgbToHex(0.5, 0.5, 0.5)).toBe('#808080')
  })
})

// ==================== fuzzyMatch ====================

describe('fuzzyMatch', () => {
  it('returns 1 for identical strings', () => {
    expect(fuzzyMatch('Button', 'Button')).toBe(1)
  })

  it('returns 1 for case-insensitive identical', () => {
    expect(fuzzyMatch('Button', 'button')).toBe(1)
  })

  it('returns 1 ignoring special characters', () => {
    expect(fuzzyMatch('my-button', 'my button')).toBe(1)
  })

  it('returns 0.8 when one string contains the other', () => {
    expect(fuzzyMatch('PrimaryButton', 'primary')).toBe(0.8)
  })

  it('returns 0.8 for substring containment', () => {
    expect(fuzzyMatch('btn', 'submit-btn-large')).toBe(0.8)
  })

  it('returns 0 when both have only short words', () => {
    expect(fuzzyMatch('ab', 'cd')).toBe(0)
  })

  it('returns partial score for word overlap', () => {
    const score = fuzzyMatch('card header title', 'card footer title')
    expect(score).toBeGreaterThan(0)
    expect(score).toBeLessThan(1)
  })

  it('returns 0 for completely different strings with long words', () => {
    expect(fuzzyMatch('navigation', 'elephant')).toBe(0)
  })
})

// ==================== extractFileKey ====================

describe('extractFileKey', () => {
  it('extracts key from /file/ URL', () => {
    expect(extractFileKey('https://www.figma.com/file/abc123/My-Design')).toBe('abc123')
  })

  it('extracts key from /design/ URL', () => {
    expect(extractFileKey('https://www.figma.com/design/xyz789/My-Design')).toBe('xyz789')
  })

  it('returns null for non-Figma URL', () => {
    expect(extractFileKey('https://example.com/file/abc')).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(extractFileKey('')).toBeNull()
  })
})

// ==================== isButtonComponentName ====================

describe('isButtonComponentName', () => {
  it('detects "button"', () => {
    expect(isButtonComponentName('Primary Button')).toBe(true)
  })

  it('detects "btn"', () => {
    expect(isButtonComponentName('submit-btn')).toBe(true)
  })

  it('detects exact "cta"', () => {
    expect(isButtonComponentName('cta')).toBe(true)
  })

  it('detects "/cta" path', () => {
    expect(isButtonComponentName('actions/cta')).toBe(true)
  })

  it('rejects unrelated names', () => {
    expect(isButtonComponentName('Card')).toBe(false)
  })

  it('rejects partial cta match without slash', () => {
    expect(isButtonComponentName('octagon')).toBe(false)
  })
})

// ==================== computeStructuralSimilarity ====================

describe('computeStructuralSimilarity', () => {
  it('returns 100 for identical shapes', () => {
    const shape = makeShape()
    expect(computeStructuralSimilarity(shape, shape)).toBe(100)
  })

  it('returns 80 for identical shapes without component IDs (component weight scores 0)', () => {
    const shape = makeShape({ componentIds: [] })
    // With no componentIds, the Jaccard similarity contributes 0 to score
    // but still adds weight 3 to totalWeight, capping the max at ~80%
    expect(computeStructuralSimilarity(shape, shape)).toBe(80)
  })

  it('returns high score for similar shapes', () => {
    const a = makeShape()
    const b = makeShape({ width: 210, height: 310 })
    expect(computeStructuralSimilarity(a, b)).toBeGreaterThanOrEqual(90)
  })

  it('returns lower score when layout mode differs', () => {
    const a = makeShape({ layoutMode: 'VERTICAL' })
    const b = makeShape({ layoutMode: 'HORIZONTAL' })
    const same = computeStructuralSimilarity(a, a)
    const diff = computeStructuralSimilarity(a, b)
    expect(diff).toBeLessThan(same)
  })

  it('returns lower score when component IDs differ completely', () => {
    const a = makeShape({ componentIds: ['c1', 'c2'] })
    const b = makeShape({ componentIds: ['c3', 'c4'] })
    const same = computeStructuralSimilarity(a, a)
    const diff = computeStructuralSimilarity(a, b)
    expect(diff).toBeLessThan(same)
  })

  it('component IDs have highest weight impact', () => {
    const base = makeShape()
    const diffComponents = makeShape({ componentIds: ['x1', 'x2', 'x3'] })
    const diffDimensions = makeShape({ width: 400, height: 600 })

    const compDiff = computeStructuralSimilarity(base, diffComponents)
    const dimDiff = computeStructuralSimilarity(base, diffDimensions)

    // Component IDs (weight 3) should cause more drop than dimensions (weight 2)
    expect(compDiff).toBeLessThan(dimDiff)
  })

  it('handles zero dimensions gracefully', () => {
    const a = makeShape({ width: 0, height: 0, aspectRatio: 0 })
    const b = makeShape({ width: 0, height: 0, aspectRatio: 0 })
    const score = computeStructuralSimilarity(a, b)
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(100)
  })

  it('handles empty child type distributions', () => {
    const a = makeShape({ childTypeDistribution: {} })
    const b = makeShape({ childTypeDistribution: {} })
    const score = computeStructuralSimilarity(a, b)
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(100)
  })

  it('handles mismatched child type distributions', () => {
    const a = makeShape({ childTypeDistribution: { TEXT: 5 } })
    const b = makeShape({ childTypeDistribution: { FRAME: 5 } })
    const same = computeStructuralSimilarity(a, a)
    const diff = computeStructuralSimilarity(a, b)
    expect(diff).toBeLessThan(same)
  })

  it('score is symmetric', () => {
    const a = makeShape({ width: 100, childCount: 3 })
    const b = makeShape({ width: 300, childCount: 10 })
    expect(computeStructuralSimilarity(a, b)).toBe(computeStructuralSimilarity(b, a))
  })

  it('produces score between 0 and 100', () => {
    const a = makeShape({ width: 1, height: 1, childCount: 0, maxDepth: 0, componentIds: [] })
    const b = makeShape({ width: 1000, height: 2000, childCount: 50, maxDepth: 10, componentIds: ['x'] })
    const score = computeStructuralSimilarity(a, b)
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(100)
  })
})

// ==================== clusterFrames ====================

describe('clusterFrames', () => {
  it('groups identical frames together', () => {
    const frames = [
      makeFrame({ id: '1' }),
      makeFrame({ id: '2' }),
      makeFrame({ id: '3' }),
    ]
    const clusters = clusterFrames(frames, 60)
    expect(clusters).toHaveLength(1)
    expect(clusters[0].frames).toHaveLength(3)
    expect(clusters[0].consistency).toBe(100)
  })

  it('separates very different frames into separate clusters', () => {
    const cardFrames = [
      makeFrame({ id: '1', width: 200, height: 300, layoutMode: 'VERTICAL', componentIds: ['c1'] }),
      makeFrame({ id: '2', width: 200, height: 300, layoutMode: 'VERTICAL', componentIds: ['c1'] }),
    ]
    const navFrames = [
      makeFrame({ id: '3', width: 1200, height: 60, layoutMode: 'HORIZONTAL', childCount: 15, maxDepth: 1, componentIds: ['c9'], childTypeDistribution: { INSTANCE: 15 }, aspectRatio: 20 }),
      makeFrame({ id: '4', width: 1200, height: 60, layoutMode: 'HORIZONTAL', childCount: 15, maxDepth: 1, componentIds: ['c9'], childTypeDistribution: { INSTANCE: 15 }, aspectRatio: 20 }),
    ]
    const clusters = clusterFrames([...cardFrames, ...navFrames], 60)
    expect(clusters.length).toBeGreaterThanOrEqual(2)
  })

  it('filters out singleton clusters', () => {
    const frames = [
      makeFrame({ id: '1', width: 100, componentIds: ['a'] }),
      makeFrame({ id: '2', width: 500, componentIds: ['b'], childCount: 20, maxDepth: 8, layoutMode: 'HORIZONTAL', childTypeDistribution: { INSTANCE: 20 } }),
    ]
    const clusters = clusterFrames(frames, 90)
    // Each frame is too different at threshold 90, so they form singletons which are filtered
    expect(clusters).toHaveLength(0)
  })

  it('returns empty array for single frame', () => {
    expect(clusterFrames([makeFrame()], 60)).toHaveLength(0)
  })

  it('returns empty array for empty input', () => {
    expect(clusterFrames([], 60)).toHaveLength(0)
  })

  it('consistency is average of pairwise scores', () => {
    const frames = [
      makeFrame({ id: '1' }),
      makeFrame({ id: '2' }),
    ]
    const clusters = clusterFrames(frames, 60)
    expect(clusters[0].consistency).toBe(
      computeSimilarity(frames[0], frames[1])
    )
  })
})

// ==================== findLibraryMatches ====================

describe('findLibraryMatches', () => {
  it('returns empty for empty library', () => {
    expect(findLibraryMatches([makeFrame()], [])).toEqual([])
  })

  it('finds matching library component', () => {
    const frame = makeFrame()
    const lib = makeLibFp()
    const matches = findLibraryMatches([frame], [lib], 40)
    expect(matches).toHaveLength(1)
    expect(matches[0].componentId).toBe('lib-1')
    // Library fingerprints have no componentIds, so Jaccard scores 0 → max ~80
    expect(matches[0].similarity).toBe(80)
  })

  it('filters below threshold', () => {
    const frame = makeFrame({ width: 100, height: 100 })
    const lib = makeLibFp({ width: 1000, height: 2000, childCount: 50, maxDepth: 10 })
    const matches = findLibraryMatches([frame], [lib], 95)
    expect(matches).toHaveLength(0)
  })

  it('limits results to maxResults', () => {
    const frame = makeFrame()
    const libs = Array.from({ length: 10 }, (_, i) =>
      makeLibFp({ id: `lib-${i}`, name: `Lib${i}` })
    )
    const matches = findLibraryMatches([frame], libs, 40, 3)
    expect(matches.length).toBeLessThanOrEqual(3)
  })

  it('returns integer similarity when averaging multiple frames', () => {
    const frame1 = makeFrame({ width: 200, height: 300 })
    const frame2 = makeFrame({ id: 'frame-2', width: 250, height: 350 })
    const lib = makeLibFp()
    const matches = findLibraryMatches([frame1, frame2], [lib], 0)
    expect(matches).toHaveLength(1)
    expect(Number.isInteger(matches[0].similarity)).toBe(true)
  })

  it('sorts by similarity descending', () => {
    const frame = makeFrame()
    const close = makeLibFp({ id: 'close', name: 'Close' })
    const far = makeLibFp({ id: 'far', name: 'Far', width: 500, childCount: 20 })
    const matches = findLibraryMatches([frame], [far, close], 0)
    expect(matches[0].componentId).toBe('close')
  })
})

// ==================== getApiNodeDepth ====================

describe('getApiNodeDepth', () => {
  it('returns 0 for leaf node', () => {
    expect(getApiNodeDepth({ type: 'TEXT' })).toBe(0)
  })

  it('returns 0 for node with empty children', () => {
    expect(getApiNodeDepth({ children: [] })).toBe(0)
  })

  it('returns 1 for single level', () => {
    expect(getApiNodeDepth({ children: [{ type: 'TEXT' }] })).toBe(1)
  })

  it('returns correct depth for nested tree', () => {
    const tree: ApiNode = {
      children: [
        { children: [{ children: [{ type: 'TEXT' }] }] },
        { type: 'TEXT' },
      ],
    }
    expect(getApiNodeDepth(tree)).toBe(3)
  })
})

// ==================== buildApiFingerprint ====================

describe('buildApiFingerprint', () => {
  it('builds fingerprint from API node', () => {
    const node: ApiNode = {
      id: 'n1',
      name: 'Card',
      description: 'A card',
      type: 'COMPONENT',
      absoluteBoundingBox: { x: 0, y: 0, width: 200, height: 300 },
      layoutMode: 'VERTICAL',
      cornerRadius: 8,
      fills: [{ type: 'SOLID', visible: true }],
      children: [{ type: 'TEXT' }, { type: 'FRAME' }],
    }
    const fp = buildApiFingerprint(node, 'fk1', 'File1', 'https://figma.com/file/fk1')
    expect(fp.id).toBe('n1')
    expect(fp.name).toBe('Card')
    expect(fp.width).toBe(200)
    expect(fp.height).toBe(300)
    expect(fp.childCount).toBe(2)
    expect(fp.maxDepth).toBe(1)
    expect(fp.aspectRatio).toBe(0.67)
    expect(fp.layoutMode).toBe('VERTICAL')
    expect(fp.cornerRadius).toBe(8)
    expect(fp.fillCount).toBe(1)
    expect(fp.childTypeDistribution).toEqual({ TEXT: 1, FRAME: 1 })
  })

  it('handles missing bounding box', () => {
    const fp = buildApiFingerprint({}, 'fk', 'f', 'url')
    expect(fp.width).toBe(0)
    expect(fp.height).toBe(0)
    expect(fp.aspectRatio).toBe(1)
  })

  it('handles rectangleCornerRadii', () => {
    const node: ApiNode = { rectangleCornerRadii: [0, 4, 8, 12] }
    const fp = buildApiFingerprint(node, 'fk', 'f', 'url')
    expect(fp.cornerRadius).toBe(12)
  })

  it('filters hidden fills', () => {
    const node: ApiNode = {
      fills: [
        { type: 'SOLID', visible: true },
        { type: 'SOLID', visible: false },
        { type: 'GRADIENT' },
      ],
    }
    const fp = buildApiFingerprint(node, 'fk', 'f', 'url')
    expect(fp.fillCount).toBe(2)
  })

  it('defaults name to Unnamed', () => {
    const fp = buildApiFingerprint({}, 'fk', 'f', 'url')
    expect(fp.name).toBe('Unnamed')
  })
})

// ==================== extractComponentNodes ====================

describe('extractComponentNodes', () => {
  it('extracts COMPONENT nodes', () => {
    const tree: ApiNode = {
      type: 'DOCUMENT',
      children: [
        { type: 'COMPONENT', id: 'c1', name: 'Button' },
        { type: 'TEXT', id: 't1' },
      ],
    }
    const comps: { id: string; name: string }[] = []
    const fps: LibraryComponentFingerprint[] = []
    extractComponentNodes(tree, 'fk', 'f', 'url', comps as any, fps)
    expect(comps).toHaveLength(1)
    expect(comps[0].name).toBe('Button')
    expect(fps).toHaveLength(1)
  })

  it('extracts COMPONENT_SET and stops recursion into its children', () => {
    const tree: ApiNode = {
      type: 'COMPONENT_SET',
      id: 'cs1',
      name: 'ButtonSet',
      children: [
        { type: 'COMPONENT', id: 'c1', name: 'Variant1' },
        { type: 'COMPONENT', id: 'c2', name: 'Variant2' },
      ],
    }
    const comps: { id: string; name: string }[] = []
    const fps: LibraryComponentFingerprint[] = []
    extractComponentNodes(tree, 'fk', 'f', 'url', comps as any, fps)
    // Should only have the set, not its variant children
    expect(comps).toHaveLength(1)
    expect(comps[0].name).toBe('ButtonSet')
  })

  it('recurses into non-component nodes', () => {
    const tree: ApiNode = {
      type: 'DOCUMENT',
      children: [
        {
          type: 'CANVAS',
          children: [{ type: 'COMPONENT', id: 'c1', name: 'Deep' }],
        },
      ],
    }
    const comps: { id: string; name: string }[] = []
    const fps: LibraryComponentFingerprint[] = []
    extractComponentNodes(tree, 'fk', 'f', 'url', comps as any, fps)
    expect(comps).toHaveLength(1)
    expect(comps[0].name).toBe('Deep')
  })
})

// ==================== extractFrameFingerprints ====================

describe('extractFrameFingerprints', () => {
  it('extracts FRAME nodes from CANVAS pages', () => {
    const doc: ApiNode = {
      type: 'DOCUMENT',
      children: [
        {
          type: 'CANVAS',
          children: [
            {
              type: 'FRAME',
              id: 'f1',
              name: 'Home',
              absoluteBoundingBox: { x: 0, y: 0, width: 375, height: 812 },
              layoutMode: 'VERTICAL',
              cornerRadius: 0,
              fills: [{ type: 'SOLID' }],
              children: [{ type: 'TEXT', name: 'Title' }],
            },
          ],
        },
      ],
    }
    const frames = extractFrameFingerprints(doc, 'fk1', 'MyFile')
    expect(frames).toHaveLength(1)
    expect(frames[0].name).toBe('Home')
    expect(frames[0].width).toBe(375)
    expect(frames[0].height).toBe(812)
    expect(frames[0].fileKey).toBe('fk1')
    expect(frames[0].fileName).toBe('MyFile')
  })

  it('skips non-FRAME top-level children', () => {
    const doc: ApiNode = {
      type: 'DOCUMENT',
      children: [
        {
          type: 'CANVAS',
          children: [
            { type: 'COMPONENT', id: 'c1', name: 'NotAFrame' },
            { type: 'FRAME', id: 'f1', name: 'RealFrame', absoluteBoundingBox: { x: 0, y: 0, width: 100, height: 100 } },
          ],
        },
      ],
    }
    const frames = extractFrameFingerprints(doc, 'fk', 'f')
    expect(frames).toHaveLength(1)
    expect(frames[0].name).toBe('RealFrame')
  })

  it('skips non-CANVAS pages', () => {
    const doc: ApiNode = {
      type: 'DOCUMENT',
      children: [{ type: 'PAGE', children: [{ type: 'FRAME', id: 'f1', name: 'F' }] }],
    }
    expect(extractFrameFingerprints(doc, 'fk', 'f')).toHaveLength(0)
  })

  it('returns empty for document with no children', () => {
    expect(extractFrameFingerprints({}, 'fk', 'f')).toHaveLength(0)
  })

  it('collects INSTANCE component names', () => {
    const doc: ApiNode = {
      type: 'DOCUMENT',
      children: [
        {
          type: 'CANVAS',
          children: [
            {
              type: 'FRAME',
              id: 'f1',
              name: 'Card',
              absoluteBoundingBox: { x: 0, y: 0, width: 200, height: 300 },
              children: [
                { type: 'INSTANCE', name: 'Button' },
                { type: 'INSTANCE', name: 'Icon' },
                { type: 'INSTANCE', name: 'Button' }, // duplicate
              ],
            },
          ],
        },
      ],
    }
    const frames = extractFrameFingerprints(doc, 'fk', 'f')
    expect(frames[0].componentNames).toEqual(['Button', 'Icon'])
  })
})
