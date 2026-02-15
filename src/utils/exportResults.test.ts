import { describe, it, expect, vi, beforeEach } from 'vitest'
import { exportFrameScanToMarkdown, exportTeamScanToMarkdown } from './exportResults'
import type { SelectedFrameScanResult, PatternGroup } from '../hooks/usePluginMessages'

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-01-15'))
})

const frameScanResult: SelectedFrameScanResult = {
  selectedFrame: {
    id: '1',
    name: 'Login Screen',
    width: 375,
    height: 812,
    childCount: 5,
    maxDepth: 3,
    componentIds: [],
    componentNames: [],
    aspectRatio: 0.46,
    layoutMode: 'VERTICAL',
    cornerRadius: 0,
    hasAutoLayout: true,
    fillCount: 1,
    childTypeDistribution: {},
  },
  teamFileResults: [
    {
      fileKey: 'abc',
      fileName: 'Design System',
      consistency: 85,
      matches: [
        {
          teamFrameId: 't1',
          teamFrameName: 'Login',
          localFrameId: '1',
          localFrameName: 'Login Screen',
          similarity: 85,
        },
      ],
    },
  ],
  libraryMatches: [
    {
      componentId: 'c1',
      componentName: 'Button',
      similarity: 92,
      fileKey: 'lib1',
      fileUrl: 'https://figma.com/file/lib1',
    },
  ],
  overallConsistency: 88,
  ruleIssues: [
    {
      ruleId: 'contrast-ratio',
      ruleName: 'Contrast Ratio',
      severity: 'error',
      frameId: '1',
      frameName: 'Login Screen',
      nodeIds: ['n1'],
      message: 'Fails WCAG AA',
    },
  ],
}

describe('exportFrameScanToMarkdown', () => {
  it('includes frame name and consistency', () => {
    const md = exportFrameScanToMarkdown(frameScanResult)
    expect(md).toContain('Login Screen')
    expect(md).toContain('88%')
  })

  it('includes team file results table', () => {
    const md = exportFrameScanToMarkdown(frameScanResult)
    expect(md).toContain('## Team File Matches')
    expect(md).toContain('Design System')
    expect(md).toContain('85%')
  })

  it('includes library matches table', () => {
    const md = exportFrameScanToMarkdown(frameScanResult)
    expect(md).toContain('## Library Matches')
    expect(md).toContain('Button')
    expect(md).toContain('92%')
  })

  it('includes rule violations table', () => {
    const md = exportFrameScanToMarkdown(frameScanResult)
    expect(md).toContain('## Rule Violations')
    expect(md).toContain('Contrast Ratio')
    expect(md).toContain('Fails WCAG AA')
  })

  it('includes date', () => {
    const md = exportFrameScanToMarkdown(frameScanResult)
    expect(md).toContain('Date')
  })

  it('handles empty results', () => {
    const empty: SelectedFrameScanResult = {
      ...frameScanResult,
      teamFileResults: [],
      libraryMatches: [],
      ruleIssues: [],
    }
    const md = exportFrameScanToMarkdown(empty)
    expect(md).toContain('Login Screen')
    expect(md).not.toContain('## Team File Matches')
    expect(md).not.toContain('## Library Matches')
    expect(md).not.toContain('## Rule Violations')
  })
})

const patternGroups: PatternGroup[] = [
  {
    fingerprint: '375x812_2files_80%',
    frames: [
      {
        id: '1',
        name: 'Login',
        width: 375,
        height: 812,
        childCount: 5,
        maxDepth: 3,
        componentIds: [],
        componentNames: [],
        aspectRatio: 0.46,
        layoutMode: 'VERTICAL',
        cornerRadius: 0,
        hasAutoLayout: true,
        fillCount: 1,
        childTypeDistribution: {},
        fileKey: 'f1',
        fileName: 'File A',
      },
      {
        id: '2',
        name: 'Register',
        width: 375,
        height: 812,
        childCount: 5,
        maxDepth: 3,
        componentIds: [],
        componentNames: [],
        aspectRatio: 0.46,
        layoutMode: 'VERTICAL',
        cornerRadius: 0,
        hasAutoLayout: true,
        fillCount: 1,
        childTypeDistribution: {},
        fileKey: 'f2',
        fileName: 'File B',
      },
    ],
    consistency: 80,
    componentUsage: [],
    nameMatches: [],
    libraryMatches: [],
  },
]

describe('exportTeamScanToMarkdown', () => {
  it('includes pattern count', () => {
    const md = exportTeamScanToMarkdown(patternGroups)
    expect(md).toContain('**Patterns Found:** 1')
  })

  it('includes frame table', () => {
    const md = exportTeamScanToMarkdown(patternGroups)
    expect(md).toContain('Login')
    expect(md).toContain('File A')
    expect(md).toContain('Register')
    expect(md).toContain('File B')
  })

  it('includes consistency and dimensions', () => {
    const md = exportTeamScanToMarkdown(patternGroups)
    expect(md).toContain('80% consistent')
    expect(md).toContain('375x812')
  })

  it('handles empty groups', () => {
    const md = exportTeamScanToMarkdown([])
    expect(md).toContain('**Patterns Found:** 0')
  })
})
