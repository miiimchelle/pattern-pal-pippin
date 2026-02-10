// ==================== TYPES ====================

export interface FrameFingerprint {
  id: string
  name: string
  width: number
  height: number
  childCount: number
  maxDepth: number
  componentIds: string[]
  componentNames: string[]
  aspectRatio: number
  layoutMode: string
  cornerRadius: number
  hasAutoLayout: boolean
  fillCount: number
  childTypeDistribution: Record<string, number>
  fileKey?: string
  fileName?: string
}

export interface LibraryComponentFingerprint {
  id: string
  name: string
  description: string
  fileKey: string
  fileName: string
  fileUrl: string
  width: number
  height: number
  childCount: number
  maxDepth: number
  aspectRatio: number
  layoutMode: string
  cornerRadius: number
  fillCount: number
  childTypeDistribution: Record<string, number>
}

export interface LibraryComponent {
  id: string
  name: string
  description: string
  fileKey: string
  fileName: string
  fileUrl: string
}

export interface LibraryMatch {
  componentId: string
  componentName: string
  similarity: number
  fileKey: string
  fileUrl: string
}

export interface PatternGroup {
  fingerprint: string
  frames: FrameFingerprint[]
  consistency: number
  componentUsage: LibraryComponent[]
  nameMatches: LibraryComponent[]
  libraryMatches: LibraryMatch[]
}

export interface FrameDetail {
  id: string
  name: string
  width: number
  height: number
  cornerRadius: number | number[]
  padding: { top: number; right: number; bottom: number; left: number } | null
  gap: number | null
  layoutMode: string | null
  childLayers: { name: string; type: string }[]
  fills: string[]
  depth: number
}

export interface TeamFrameMatch {
  teamFrameId: string
  teamFrameName: string
  localFrameId: string
  localFrameName: string
  similarity: number
}

export interface TeamFileResult {
  fileKey: string
  fileName: string
  consistency: number
  matches: TeamFrameMatch[]
}

export interface SelectedFrameScanResult {
  selectedFrame: FrameFingerprint
  teamFileResults: TeamFileResult[]
  libraryMatches: LibraryMatch[]
  overallConsistency: number
  ruleIssues: RuleIssue[]
}

export interface PluginSettings {
  token: string
  libraryUrls: string[]
  teamId: string
}

export interface FigmaFileData {
  name: string
  components: LibraryComponent[]
  fingerprints: LibraryComponentFingerprint[]
}

export interface RuleIssue {
  ruleId: string
  ruleName: string
  severity: 'error' | 'warning' | 'info'
  frameId: string
  frameName: string
  nodeIds: string[]
  message: string
}

export interface StructuralShape {
  width: number
  height: number
  childCount: number
  maxDepth: number
  aspectRatio: number
  layoutMode: string
  cornerRadius: number
  fillCount: number
  childTypeDistribution: Record<string, number>
  componentIds?: string[]
}

export interface ApiNode {
  id?: string
  name?: string
  type?: string
  description?: string
  children?: ApiNode[]
  absoluteBoundingBox?: { x: number; y: number; width: number; height: number }
  layoutMode?: string
  cornerRadius?: number
  rectangleCornerRadii?: number[]
  fills?: { type: string; visible?: boolean }[]
}

// ==================== HELPERS ====================

export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (v: number) =>
    Math.round(v * 255)
      .toString(16)
      .padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

export function fuzzyMatch(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().replace(/[^a-z0-9]/g, '')
  const s2 = str2.toLowerCase().replace(/[^a-z0-9]/g, '')

  if (s1 === s2) return 1
  if (s1.includes(s2) || s2.includes(s1)) return 0.8

  const words1 = str1
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2)
  const words2 = str2
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2)

  if (words1.length === 0 || words2.length === 0) return 0

  const matches = words1.filter((w1) => words2.some((w2) => w1.includes(w2) || w2.includes(w1)))
  return (matches.length / Math.max(words1.length, words2.length)) * 0.6
}

export function extractFileKey(url: string): string | null {
  const match = url.match(/figma\.com\/(file|design)\/([a-zA-Z0-9]+)/)
  return match ? match[2] : null
}

export function isButtonComponentName(name: string): boolean {
  const lower = name.toLowerCase()
  const hasButton = lower.includes('button') || lower.includes('btn')
  const hasCta = lower === 'cta' || lower.includes('/cta')
  return hasButton || hasCta
}

export const HIERARCHY_VARIANT_KEYS = new Set([
  'type',
  'variant',
  'hierarchy',
  'kind',
  'style',
  'emphasis',
  'priority',
  'appearance',
  'level',
])

// ==================== CONTRAST HELPERS ====================

export function getRelativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
}

export function contrastRatio(l1: number, l2: number): number {
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

export const WCAG_AA_NORMAL = 4.5
export const WCAG_AA_LARGE = 3

// ==================== RULE IDS ====================

export const RULE_IDS = {
  PRIMARY_BUTTON_LIMIT: 'primary-button-limit',
  TEXT_STYLE_CONSISTENCY: 'text-style-consistency',
  SPACING_CONSISTENCY: 'spacing-consistency',
  COLOR_TOKEN_USAGE: 'color-token-usage',
  CONTRAST_RATIO: 'contrast-ratio',
} as const

export type RuleId = (typeof RULE_IDS)[keyof typeof RULE_IDS]

export interface RuleConfig {
  id: RuleId
  name: string
  description: string
  enabled: boolean
}

export const DEFAULT_RULES: RuleConfig[] = [
  { id: RULE_IDS.PRIMARY_BUTTON_LIMIT, name: 'Primary Button Limit', description: 'Max one primary button per screen', enabled: true },
  { id: RULE_IDS.TEXT_STYLE_CONSISTENCY, name: 'Text Style Consistency', description: 'Text nodes should use text styles', enabled: true },
  { id: RULE_IDS.SPACING_CONSISTENCY, name: 'Spacing Consistency', description: 'Auto-layout spacing values should be consistent', enabled: true },
  { id: RULE_IDS.COLOR_TOKEN_USAGE, name: 'Color Token Usage', description: 'Solid fills should reference a style', enabled: true },
  { id: RULE_IDS.CONTRAST_RATIO, name: 'Contrast Ratio (WCAG AA)', description: 'Text must meet WCAG AA contrast', enabled: true },
]

// ==================== SIMILARITY SCORING ====================

export function computeStructuralSimilarity(a: StructuralShape, b: StructuralShape): number {
  let score = 0
  let totalWeight = 0

  // Dimension similarity (weight 2)
  const dimW = 1 - Math.abs(a.width - b.width) / Math.max(a.width, b.width, 1)
  const dimH = 1 - Math.abs(a.height - b.height) / Math.max(a.height, b.height, 1)
  score += ((dimW + dimH) / 2) * 2
  totalWeight += 2

  // Aspect ratio similarity (weight 1)
  const arSim =
    1 - Math.abs(a.aspectRatio - b.aspectRatio) / Math.max(a.aspectRatio, b.aspectRatio, 0.01)
  score += arSim * 1
  totalWeight += 1

  // Child count similarity (weight 2)
  const ccSim = 1 - Math.abs(a.childCount - b.childCount) / Math.max(a.childCount, b.childCount, 1)
  score += ccSim * 2
  totalWeight += 2

  // Tree depth similarity (weight 2)
  const depthSim = 1 - Math.abs(a.maxDepth - b.maxDepth) / Math.max(a.maxDepth, b.maxDepth, 1)
  score += depthSim * 2
  totalWeight += 2

  // Layout mode match (weight 1.5)
  score += (a.layoutMode === b.layoutMode ? 1 : 0) * 1.5
  totalWeight += 1.5

  // Corner radius similarity (weight 1)
  const maxCr = Math.max(a.cornerRadius, b.cornerRadius, 1)
  score += (1 - Math.abs(a.cornerRadius - b.cornerRadius) / maxCr) * 1
  totalWeight += 1

  // Component ID overlap — Jaccard similarity (weight 3)
  const idsA = a.componentIds || []
  const idsB = b.componentIds || []
  if (idsA.length > 0 || idsB.length > 0) {
    const setA = new Set(idsA)
    const setB = new Set(idsB)
    const union = new Set([...setA, ...setB])
    if (union.size > 0) {
      const intersection = [...setA].filter((x) => setB.has(x)).length
      score += (intersection / union.size) * 3
    }
  }
  totalWeight += 3

  // Child type distribution similarity (weight 2)
  const allTypes = new Set([
    ...Object.keys(a.childTypeDistribution),
    ...Object.keys(b.childTypeDistribution),
  ])
  if (allTypes.size > 0) {
    let typeSim = 0
    for (const t of allTypes) {
      const countA = a.childTypeDistribution[t] || 0
      const countB = b.childTypeDistribution[t] || 0
      typeSim += 1 - Math.abs(countA - countB) / Math.max(countA, countB, 1)
    }
    score += (typeSim / allTypes.size) * 2
  }
  totalWeight += 2

  // Fill count similarity (weight 0.5)
  const maxFill = Math.max(a.fillCount, b.fillCount, 1)
  score += (1 - Math.abs(a.fillCount - b.fillCount) / maxFill) * 0.5
  totalWeight += 0.5

  return Math.round((score / totalWeight) * 100)
}

export function computeSimilarity(a: FrameFingerprint, b: FrameFingerprint): number {
  return computeStructuralSimilarity(a, b)
}

export function compareFrameToLibrary(
  frame: FrameFingerprint,
  libFp: LibraryComponentFingerprint
): number {
  return computeStructuralSimilarity(frame, libFp)
}

export function findLibraryMatches(
  frames: FrameFingerprint[],
  libraryFingerprints: LibraryComponentFingerprint[],
  threshold = 40,
  maxResults = 5
): LibraryMatch[] {
  if (libraryFingerprints.length === 0) return []

  const scored: { fp: LibraryComponentFingerprint; avgSim: number }[] = []

  for (const libFp of libraryFingerprints) {
    const avgSim =
      frames.reduce((sum, f) => sum + compareFrameToLibrary(f, libFp), 0) / frames.length
    if (avgSim >= threshold) {
      scored.push({ fp: libFp, avgSim })
    }
  }

  scored.sort((a, b) => b.avgSim - a.avgSim)

  return scored.slice(0, maxResults).map((s) => ({
    componentId: s.fp.id,
    componentName: s.fp.name,
    similarity: Math.round(s.avgSim),
    fileKey: s.fp.fileKey,
    fileUrl: s.fp.fileUrl,
  }))
}

// ==================== CLUSTERING ====================

export function clusterFrames(
  frames: FrameFingerprint[],
  threshold: number
): { frames: FrameFingerprint[]; consistency: number }[] {
  const clusters: FrameFingerprint[][] = []

  for (const frame of frames) {
    let bestCluster: FrameFingerprint[] | null = null
    let bestAvg = 0

    for (const cluster of clusters) {
      const avgSim =
        cluster.reduce((sum, f) => sum + computeSimilarity(frame, f), 0) / cluster.length
      if (avgSim >= threshold && avgSim > bestAvg) {
        bestCluster = cluster
        bestAvg = avgSim
      }
    }

    if (bestCluster) {
      bestCluster.push(frame)
    } else {
      clusters.push([frame])
    }
  }

  return clusters
    .filter((c) => c.length >= 2)
    .map((cluster) => {
      let totalSim = 0
      let pairs = 0
      for (let i = 0; i < cluster.length; i++) {
        for (let j = i + 1; j < cluster.length; j++) {
          totalSim += computeSimilarity(cluster[i], cluster[j])
          pairs++
        }
      }
      return {
        frames: cluster,
        consistency: pairs > 0 ? Math.round(totalSim / pairs) : 100,
      }
    })
}

// ==================== API NODE HELPERS ====================

export function getApiNodeDepth(node: ApiNode, current = 0): number {
  if (!node.children || node.children.length === 0) return current
  return Math.max(...node.children.map((c) => getApiNodeDepth(c, current + 1)))
}

export function buildApiFingerprint(
  node: ApiNode,
  fileKey: string,
  fileName: string,
  fileUrl: string
): LibraryComponentFingerprint {
  const bb = node.absoluteBoundingBox || { width: 0, height: 0 }
  const w = Math.round(bb.width)
  const h = Math.round(bb.height)
  const children = node.children || []

  const childTypeDist: Record<string, number> = {}
  for (const child of children) {
    const t = child.type || 'UNKNOWN'
    childTypeDist[t] = (childTypeDist[t] || 0) + 1
  }

  let cr = 0
  if (typeof node.cornerRadius === 'number') {
    cr = node.cornerRadius
  } else if (node.rectangleCornerRadii) {
    cr = Math.max(...node.rectangleCornerRadii)
  }

  const visibleFills = (node.fills || []).filter((f) => f.visible !== false)

  return {
    id: node.id || '',
    name: node.name || 'Unnamed',
    description: node.description || '',
    fileKey,
    fileName,
    fileUrl,
    width: w,
    height: h,
    childCount: children.length,
    maxDepth: getApiNodeDepth(node),
    aspectRatio: h > 0 ? Math.round((w / h) * 100) / 100 : 1,
    layoutMode: node.layoutMode || 'NONE',
    cornerRadius: cr,
    fillCount: visibleFills.length,
    childTypeDistribution: childTypeDist,
  }
}

export function extractComponentNodes(
  node: ApiNode,
  fileKey: string,
  fileName: string,
  fileUrl: string,
  components: LibraryComponent[],
  fingerprints: LibraryComponentFingerprint[]
): void {
  if (node.type === 'COMPONENT_SET') {
    components.push({
      id: node.id || '',
      name: node.name || 'Unnamed',
      description: node.description || '',
      fileKey,
      fileName,
      fileUrl,
    })
    fingerprints.push(buildApiFingerprint(node, fileKey, fileName, fileUrl))
    return // Don't recurse into variants
  }
  if (node.type === 'COMPONENT') {
    components.push({
      id: node.id || '',
      name: node.name || 'Unnamed',
      description: node.description || '',
      fileKey,
      fileName,
      fileUrl,
    })
    fingerprints.push(buildApiFingerprint(node, fileKey, fileName, fileUrl))
  }
  if (Array.isArray(node.children)) {
    for (const child of node.children) {
      extractComponentNodes(child, fileKey, fileName, fileUrl, components, fingerprints)
    }
  }
}

export function extractFrameFingerprints(
  document: ApiNode,
  fileKey: string,
  fileName: string
): FrameFingerprint[] {
  const frames: FrameFingerprint[] = []

  const pages = document.children || []
  for (const page of pages) {
    if (page.type !== 'CANVAS') continue
    const topChildren = page.children || []
    for (const child of topChildren) {
      if (child.type !== 'FRAME') continue

      const bb = child.absoluteBoundingBox || { width: 0, height: 0 }
      const w = Math.round(bb.width)
      const h = Math.round(bb.height)
      const children = child.children || []

      const childTypeDist: Record<string, number> = {}
      for (const c of children) {
        const t = c.type || 'UNKNOWN'
        childTypeDist[t] = (childTypeDist[t] || 0) + 1
      }

      let cr = 0
      if (typeof child.cornerRadius === 'number') {
        cr = child.cornerRadius
      } else if (child.rectangleCornerRadii) {
        cr = Math.max(...child.rectangleCornerRadii)
      }

      const visibleFills = (child.fills || []).filter((f) => f.visible !== false)
      const layoutMode = child.layoutMode || 'NONE'

      const componentNames: string[] = []
      function walkForComponents(node: ApiNode) {
        if (node.type === 'INSTANCE' && node.name) {
          if (!componentNames.includes(node.name)) {
            componentNames.push(node.name)
          }
        }
        if (node.children) {
          for (const c of node.children) walkForComponents(c)
        }
      }
      walkForComponents(child)

      frames.push({
        id: child.id || '',
        name: child.name || 'Unnamed',
        width: w,
        height: h,
        childCount: children.length,
        maxDepth: getApiNodeDepth(child),
        componentIds: [],
        componentNames,
        aspectRatio: h > 0 ? Math.round((w / h) * 100) / 100 : 1,
        layoutMode,
        cornerRadius: cr,
        hasAutoLayout: layoutMode !== 'NONE',
        fillCount: visibleFills.length,
        childTypeDistribution: childTypeDist,
        fileKey,
        fileName,
      })
    }
  }

  return frames
}
