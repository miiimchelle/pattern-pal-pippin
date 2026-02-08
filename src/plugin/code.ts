declare const __html__: string

// ==================== TYPES ====================

interface FrameFingerprint {
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

interface LibraryComponent {
  id: string
  name: string
  description: string
  fileKey: string
  fileName: string
  fileUrl: string
}

// Structural fingerprint for a library component (from REST API)
interface LibraryComponentFingerprint {
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

// A structural match between a local frame and a library component
interface LibraryMatch {
  componentId: string
  componentName: string
  similarity: number // 0-100
  fileKey: string
  fileUrl: string
}

interface PatternGroup {
  fingerprint: string
  frames: FrameFingerprint[]
  consistency: number // 0-100 percentage
  componentUsage: LibraryComponent[]
  nameMatches: LibraryComponent[]
  libraryMatches: LibraryMatch[] // structural matches against library
}

interface FrameDetail {
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

interface TeamFrameMatch {
  teamFrameId: string
  teamFrameName: string
  localFrameId: string
  localFrameName: string
  similarity: number
}

interface TeamFileResult {
  fileKey: string
  fileName: string
  consistency: number
  matches: TeamFrameMatch[]
}

interface SelectedFrameScanResult {
  selectedFrame: FrameFingerprint
  teamFileResults: TeamFileResult[]
  libraryMatches: LibraryMatch[]
  overallConsistency: number
  buttonIssues: RuleIssue[]
}

interface PluginSettings {
  token: string
  libraryUrls: string[]
  teamId: string
}

interface FigmaFileData {
  name: string
  components: LibraryComponent[]
  fingerprints: LibraryComponentFingerprint[]
}

interface RuleIssue {
  frameId: string
  frameName: string
  primaryButtonIds: string[]
  message: string
}

// ==================== STORAGE ====================

const STORAGE_KEY = 'pattern-pal-settings'

// ==================== HELPERS ====================

function getMaxDepth(node: SceneNode, current = 0): number {
  if (!('children' in node) || node.children.length === 0) {
    return current
  }
  return Math.max(...node.children.map((child) => getMaxDepth(child, current + 1)))
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (v: number) =>
    Math.round(v * 255)
      .toString(16)
      .padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

// Simple fuzzy match - returns score 0-1
function fuzzyMatch(str1: string, str2: string): number {
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

// Extract file key from Figma URL
function extractFileKey(url: string): string | null {
  const match = url.match(/figma\.com\/(file|design)\/([a-zA-Z0-9]+)/)
  return match ? match[2] : null
}

// ==================== PRIMARY BUTTON CHECK ====================

function isButtonComponentName(name: string): boolean {
  const lower = name.toLowerCase()
  const hasButton = lower.includes('button') || lower.includes('btn')
  const hasCta = lower === 'cta' || lower.includes('/cta')
  return hasButton || hasCta
}

const HIERARCHY_VARIANT_KEYS = new Set([
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

function hasPrimaryFillStyle(node: SceneNode): boolean {
  if ('fillStyleId' in node) {
    const id = (node as GeometryMixin).fillStyleId
    if (typeof id === 'string' && id !== '') {
      const style = figma.getStyleById(id)
      if (style && style.name.toLowerCase().includes('primary')) {
        return true
      }
    }
  }
  if ('children' in node) {
    for (const child of (node as ChildrenMixin).children) {
      if (hasPrimaryFillStyle(child)) return true
    }
  }
  return false
}

function isPrimaryButton(node: InstanceNode): boolean {
  const props = node.variantProperties as Record<string, string> | undefined
  if (props && Object.keys(props).length > 0) {
    for (const key of Object.keys(props)) {
      if (!HIERARCHY_VARIANT_KEYS.has(key.toLowerCase())) continue
      const val = props[key]
      if (typeof val === 'string' && val.toLowerCase() === 'primary') {
        return true
      }
    }
    // No hierarchy key matched — fall through to other checks
  }

  const fillMatch = hasPrimaryFillStyle(node)
  if (fillMatch) {
    return true
  }

  const name = (node.name ?? '').toLowerCase()
  const nameMatch =
    name.includes('primary') ||
    (name.includes('button') &&
      !name.includes('secondary') &&
      !name.includes('outline') &&
      !name.includes('ghost'))
  return nameMatch
}

async function findButtonInstances(node: SceneNode, namesSeen: string[]): Promise<InstanceNode[]> {
  let instances: InstanceNode[] = []

  if (node.type === 'INSTANCE') {
    const mainComponent = await node.getMainComponentAsync()
    const componentName = mainComponent?.name ?? '(no main component)'
    const instanceName = node.name ?? ''

    if (componentName !== '(no main component)') namesSeen.push(componentName)

    const nameMatches = isButtonComponentName(componentName) || isButtonComponentName(instanceName)
    if (nameMatches) instances.push(node)
  }

  if ('children' in node) {
    for (const child of node.children) {
      const childInstances = await findButtonInstances(child, namesSeen)
      instances = instances.concat(childInstances)
    }
  }

  return instances
}

async function checkPrimaryButtonPerFrame(): Promise<{
  issues: RuleIssue[]
}> {
  const issues: RuleIssue[] = []
  const frames = figma.currentPage.children.filter(
    (c): c is FrameNode | SectionNode => c.type === 'FRAME' || c.type === 'SECTION'
  )
  const instanceNamesSeen: string[] = []

  for (const frame of frames) {
    const allButtonInstances = await findButtonInstances(frame, instanceNamesSeen)
    const primaryButtons = allButtonInstances.filter(isPrimaryButton)

    if (primaryButtons.length > 1) {
      issues.push({
        frameId: frame.id,
        frameName: frame.name,
        primaryButtonIds: primaryButtons.map((btn) => btn.id),
        message: `Container '${frame.name}' has ${primaryButtons.length} Primary Buttons — only one is allowed per screen.`,
      })
    }
  }

  return {
    issues,
  }
}

// ==================== LOCAL SCANNING ====================

function getComponentInfo(node: SceneNode): { ids: string[]; names: string[] } {
  const ids: string[] = []
  const names: string[] = []

  function walk(n: SceneNode) {
    if (n.type === 'INSTANCE') {
      const mainComponent = n.mainComponent
      if (mainComponent) {
        ids.push(mainComponent.id)
        // Use parent component set name (e.g. "button") instead of variant name (e.g. "type=default, state=Default, size=default")
        const displayName =
          mainComponent.parent && mainComponent.parent.type === 'COMPONENT_SET'
            ? mainComponent.parent.name
            : mainComponent.name
        if (displayName && !names.includes(displayName)) {
          names.push(displayName)
        }
      }
    }
    if ('children' in n) {
      for (const child of n.children) {
        walk(child)
      }
    }
  }

  walk(node)
  return { ids: [...new Set(ids)], names }
}

function getChildTypeDistribution(frame: FrameNode): Record<string, number> {
  const dist: Record<string, number> = {}
  for (const child of frame.children) {
    dist[child.type] = (dist[child.type] || 0) + 1
  }
  return dist
}

function fingerprint(frame: FrameNode): FrameFingerprint {
  const componentInfo = getComponentInfo(frame)
  const layoutMode = frame.layoutMode || 'NONE'
  let cr = 0
  if (typeof frame.cornerRadius === 'number') {
    cr = frame.cornerRadius
  } else {
    cr = Math.max(
      frame.topLeftRadius,
      frame.topRightRadius,
      frame.bottomRightRadius,
      frame.bottomLeftRadius
    )
  }

  return {
    id: frame.id,
    name: frame.name,
    width: Math.round(frame.width),
    height: Math.round(frame.height),
    childCount: frame.children.length,
    maxDepth: getMaxDepth(frame),
    componentIds: componentInfo.ids,
    componentNames: componentInfo.names,
    aspectRatio: Math.round((frame.width / frame.height) * 100) / 100,
    layoutMode,
    cornerRadius: cr,
    hasAutoLayout: layoutMode !== 'NONE',
    fillCount: Array.isArray(frame.fills)
      ? frame.fills.filter((f) => f.visible !== false).length
      : 0,
    childTypeDistribution: getChildTypeDistribution(frame),
  }
}

// ==================== SIMILARITY SCORING ====================

// Common structural shape shared by both FrameFingerprint and LibraryComponentFingerprint
interface StructuralShape {
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

function computeStructuralSimilarity(a: StructuralShape, b: StructuralShape): number {
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

  // Component ID overlap — Jaccard similarity (weight 3, only if both have componentIds)
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

// Compare two local frames
function computeSimilarity(a: FrameFingerprint, b: FrameFingerprint): number {
  return computeStructuralSimilarity(a, b)
}

// Compare a local frame against a library component fingerprint
function compareFrameToLibrary(
  frame: FrameFingerprint,
  libFp: LibraryComponentFingerprint
): number {
  return computeStructuralSimilarity(frame, libFp)
}

// Find the best library matches for a set of frames (top matches above threshold)
function findLibraryMatches(
  frames: FrameFingerprint[],
  libraryFingerprints: LibraryComponentFingerprint[],
  threshold = 40,
  maxResults = 5
): LibraryMatch[] {
  if (libraryFingerprints.length === 0) return []

  // For each library component, compute the average similarity across all frames in the group
  const scored: { fp: LibraryComponentFingerprint; avgSim: number }[] = []

  for (const libFp of libraryFingerprints) {
    const avgSim =
      frames.reduce((sum, f) => sum + compareFrameToLibrary(f, libFp), 0) / frames.length
    if (avgSim >= threshold) {
      scored.push({ fp: libFp, avgSim })
    }
  }

  // Sort by similarity descending, take top N
  scored.sort((a, b) => b.avgSim - a.avgSim)

  return scored.slice(0, maxResults).map((s) => ({
    componentId: s.fp.id,
    componentName: s.fp.name,
    similarity: s.avgSim,
    fileKey: s.fp.fileKey,
    fileUrl: s.fp.fileUrl,
  }))
}

// Cluster frames by pairwise similarity, threshold = minimum % to belong to a cluster
function clusterFrames(
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

function scanCurrentPage(): FrameFingerprint[] {
  const page = figma.currentPage
  const frames = page.children.filter((node): node is FrameNode => node.type === 'FRAME')
  return frames.map(fingerprint)
}

function getFrameDetail(frame: FrameNode): FrameDetail {
  let cornerRadius: number | number[]
  if (typeof frame.cornerRadius === 'number') {
    cornerRadius = frame.cornerRadius
  } else {
    cornerRadius = [
      frame.topLeftRadius,
      frame.topRightRadius,
      frame.bottomRightRadius,
      frame.bottomLeftRadius,
    ]
  }

  let padding: FrameDetail['padding'] = null
  if (frame.layoutMode && frame.layoutMode !== 'NONE') {
    padding = {
      top: frame.paddingTop,
      right: frame.paddingRight,
      bottom: frame.paddingBottom,
      left: frame.paddingLeft,
    }
  }

  const gap = frame.layoutMode && frame.layoutMode !== 'NONE' ? frame.itemSpacing : null
  const layoutMode = frame.layoutMode && frame.layoutMode !== 'NONE' ? frame.layoutMode : null

  const childLayers = frame.children.map((child) => ({
    name: child.name,
    type: child.type,
  }))

  const fills: string[] = []
  if (Array.isArray(frame.fills)) {
    for (const fill of frame.fills) {
      if (fill.type === 'SOLID' && fill.visible !== false) {
        fills.push(rgbToHex(fill.color.r, fill.color.g, fill.color.b))
      }
    }
  }

  return {
    id: frame.id,
    name: frame.name,
    width: Math.round(frame.width),
    height: Math.round(frame.height),
    cornerRadius,
    padding,
    gap,
    layoutMode,
    childLayers,
    fills,
    depth: getMaxDepth(frame),
  }
}

// ==================== FIGMA API ====================

// REST API node shape (partial)
interface ApiNode {
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

// Get max depth from an API node tree
function getApiNodeDepth(node: ApiNode, current = 0): number {
  if (!node.children || node.children.length === 0) return current
  return Math.max(...node.children.map((c) => getApiNodeDepth(c, current + 1)))
}

// Build a structural fingerprint from a REST API node
function buildApiFingerprint(
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

// Recursively walk the node tree to find COMPONENT and COMPONENT_SET nodes
function extractComponentNodes(
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

async function fetchFigmaFile(
  fileKey: string,
  fileUrl: string,
  token: string
): Promise<FigmaFileData | null> {
  try {
    // Use depth=4 to get structural data inside COMPONENT/COMPONENT_SET nodes
    const response = await fetch(`https://api.figma.com/v1/files/${fileKey}?depth=4`, {
      headers: { 'X-Figma-Token': token },
    })

    if (!response.ok) {
      console.error(`Failed to fetch file ${fileKey}: ${response.status}`)
      return null
    }

    const data = await response.json()
    const components: LibraryComponent[] = []
    const fingerprints: LibraryComponentFingerprint[] = []

    // First try the published components metadata
    if (data.components && Object.keys(data.components).length > 0) {
      for (const [id, comp] of Object.entries(
        data.components as Record<string, { name?: string; description?: string }>
      )) {
        components.push({
          id,
          name: (comp as { name?: string }).name || 'Unnamed',
          description: (comp as { description?: string }).description || '',
          fileKey,
          fileName: data.name,
          fileUrl,
        })
      }
    }

    // Walk tree to extract fingerprints (and components if none published)
    if (data.document) {
      const treeComponents: LibraryComponent[] = []
      extractComponentNodes(
        data.document,
        fileKey,
        data.name,
        fileUrl,
        treeComponents,
        fingerprints
      )

      // Use tree components if no published ones
      if (components.length === 0) {
        components.push(...treeComponents)
      }
    }

    return { name: data.name, components, fingerprints }
  } catch (err) {
    console.error(`Error fetching file ${fileKey}:`, err)
    return null
  }
}

// ==================== TEAM DISCOVERY ====================

interface TeamFile {
  fileKey: string
  fileName: string
}

// Rate-limit-aware fetch helper with retry on 429
async function fetchWithRetry(url: string, token: string, maxRetries = 3): Promise<Response> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, {
      headers: { 'X-Figma-Token': token },
    })
    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get('Retry-After') || '60', 10)
      const waitMs = Math.min(retryAfter * 1000, 120_000)
      await new Promise((r) => setTimeout(r, waitMs))
      continue
    }
    return response
  }
  // Final attempt without retry
  return fetch(url, { headers: { 'X-Figma-Token': token } })
}

async function fetchTeamProjects(
  teamId: string,
  token: string
): Promise<{ id: string; name: string }[]> {
  const response = await fetchWithRetry(`https://api.figma.com/v1/teams/${teamId}/projects`, token)
  if (!response.ok) {
    console.error(`Failed to fetch team projects: ${response.status}`)
    return []
  }
  const data = await response.json()
  return (data.projects || []).map((p: { id: string; name: string }) => ({
    id: String(p.id),
    name: p.name,
  }))
}

async function fetchProjectFiles(projectId: string, token: string): Promise<TeamFile[]> {
  const response = await fetchWithRetry(
    `https://api.figma.com/v1/projects/${projectId}/files`,
    token
  )
  if (!response.ok) {
    console.error(`Failed to fetch project files: ${response.status}`)
    return []
  }
  const data = await response.json()
  return (data.files || []).map((f: { key: string; name: string }) => ({
    fileKey: f.key,
    fileName: f.name,
  }))
}

async function discoverTeamFiles(teamId: string, token: string): Promise<TeamFile[]> {
  const projects = await fetchTeamProjects(teamId, token)
  const allFiles: TeamFile[] = []
  for (const project of projects) {
    const files = await fetchProjectFiles(project.id, token)
    allFiles.push(...files)
  }
  return allFiles
}

// Extract top-level FRAME nodes from a REST API file response and build fingerprints
function extractFrameFingerprints(
  document: ApiNode,
  fileKey: string,
  fileName: string
): FrameFingerprint[] {
  const frames: FrameFingerprint[] = []

  // Pages are first-level children of the document
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

      // Collect component names from INSTANCE children (shallow walk)
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

// Fetch a file and extract its frames as FrameFingerprints
async function fetchFileFrames(
  fileKey: string,
  fileName: string,
  token: string
): Promise<FrameFingerprint[]> {
  try {
    const response = await fetchWithRetry(
      `https://api.figma.com/v1/files/${fileKey}?depth=3`,
      token
    )
    if (!response.ok) {
      console.error(`Failed to fetch file ${fileKey}: ${response.status}`)
      return []
    }
    const data = await response.json()
    if (!data.document) return []
    return extractFrameFingerprints(data.document, fileKey, data.name || fileName)
  } catch (err) {
    console.error(`Error fetching file ${fileKey}:`, err)
    return []
  }
}

// ==================== MAIN SCAN ====================

async function performScan(settings: PluginSettings): Promise<SelectedFrameScanResult> {
  if (!settings.token || !settings.teamId) {
    throw new Error(
      'Token and Team ID are required. Add them in Settings to compare against other team files.'
    )
  }

  const sel = figma.currentPage.selection
  if (sel.length !== 1 || sel[0].type !== 'FRAME') {
    throw new Error('Select a single frame to scan.')
  }

  const selectedFp = fingerprint(sel[0] as FrameNode)

  figma.ui.postMessage({
    type: 'scan-progress',
    payload: { current: 0, total: 1, fileName: 'Discovering team files...' },
  })
  const teamFiles = await discoverTeamFiles(settings.teamId, settings.token)
  const currentFileKey = typeof figma.fileKey !== 'undefined' ? figma.fileKey : null
  const otherFiles = teamFiles.filter((f) => f.fileKey !== currentFileKey)

  const fileFrameMap: Map<string, { fileName: string; frames: FrameFingerprint[] }> = new Map()
  const total = otherFiles.length
  for (let i = 0; i < otherFiles.length; i++) {
    const file = otherFiles[i]
    figma.ui.postMessage({
      type: 'scan-progress',
      payload: { current: i + 1, total, fileName: file.fileName },
    })
    const frames = await fetchFileFrames(file.fileKey, file.fileName, settings.token)
    if (frames.length > 0) {
      fileFrameMap.set(file.fileKey, { fileName: file.fileName, frames })
    }
  }

  const matchThreshold = 50
  const teamFileResults: TeamFileResult[] = []

  for (const [fileKey, { fileName, frames: teamFrames }] of fileFrameMap) {
    const matches: TeamFrameMatch[] = []

    for (const teamFrame of teamFrames) {
      const sim = computeSimilarity(selectedFp, teamFrame)
      if (sim > matchThreshold) {
        matches.push({
          teamFrameId: teamFrame.id,
          teamFrameName: teamFrame.name,
          localFrameId: selectedFp.id,
          localFrameName: selectedFp.name,
          similarity: Math.round(sim),
        })
      }
    }

    if (matches.length === 0) continue

    matches.sort((a, b) => b.similarity - a.similarity)
    const consistency = Math.round(Math.max(...matches.map((m) => m.similarity)))

    teamFileResults.push({ fileKey, fileName, consistency, matches })
  }

  teamFileResults.sort((a, b) => b.consistency - a.consistency)

  let libraryMatches: LibraryMatch[] = []
  const allLibraryFingerprints: LibraryComponentFingerprint[] = []

  if (settings.libraryUrls.length > 0) {
    for (const url of settings.libraryUrls) {
      const fileKey = extractFileKey(url)
      if (!fileKey) continue
      const fileData = await fetchFigmaFile(fileKey, url, settings.token)
      if (fileData) {
        allLibraryFingerprints.push(...fileData.fingerprints)
      }
    }
    libraryMatches = findLibraryMatches([selectedFp], allLibraryFingerprints, 50)
  }

  let overallConsistency: number
  const teamAvg =
    teamFileResults.length > 0
      ? teamFileResults.reduce((sum, r) => sum + r.consistency, 0) / teamFileResults.length
      : 0
  const libraryBest =
    libraryMatches.length > 0 ? Math.max(...libraryMatches.map((m) => m.similarity)) : 0

  if (teamFileResults.length > 0 && libraryMatches.length > 0) {
    overallConsistency = (teamAvg + libraryBest) / 2
  } else if (teamFileResults.length > 0) {
    overallConsistency = teamAvg
  } else if (libraryMatches.length > 0) {
    overallConsistency = libraryBest
  } else {
    overallConsistency = 0
  }

  const buttonCheckResult = await checkPrimaryButtonPerFrame()

  return {
    selectedFrame: selectedFp,
    teamFileResults,
    libraryMatches,
    overallConsistency: Math.round(overallConsistency),
    buttonIssues: buttonCheckResult.issues,
  }
}

async function performTeamScan(settings: PluginSettings): Promise<PatternGroup[]> {
  if (!settings.token || !settings.teamId) {
    throw new Error('Token and Team ID are required for team scanning')
  }

  // Discover all files in the team
  figma.ui.postMessage({
    type: 'scan-progress',
    payload: { current: 0, total: 1, fileName: 'Discovering team files...' },
  })
  const teamFiles = await discoverTeamFiles(settings.teamId, settings.token)
  if (teamFiles.length === 0) {
    throw new Error('No files found in team. Check your Team ID and token permissions.')
  }

  // Collect frames from all files
  const allFrames: FrameFingerprint[] = []
  const total = teamFiles.length

  for (let i = 0; i < teamFiles.length; i++) {
    const file = teamFiles[i]
    figma.ui.postMessage({
      type: 'scan-progress',
      payload: { current: i + 1, total, fileName: file.fileName },
    })
    const frames = await fetchFileFrames(file.fileKey, file.fileName, settings.token)
    allFrames.push(...frames)
  }

  // Also include local frames from the current page
  const localFrames = scanCurrentPage()
  allFrames.push(...localFrames)

  // Cluster all frames together (cross-file)
  const clusters = clusterFrames(allFrames, 60)

  // Filter to only clusters that span multiple files
  const crossFileClusters = clusters.filter((c) => {
    const fileKeys = new Set(c.frames.map((f) => f.fileKey || '__local__'))
    return fileKeys.size >= 2 || c.frames.length >= 2
  })

  // Fetch library data for matching
  const allLibraryComponents: LibraryComponent[] = []
  const allLibraryFingerprints: LibraryComponentFingerprint[] = []

  if (settings.libraryUrls.length > 0) {
    for (const url of settings.libraryUrls) {
      const fileKey = extractFileKey(url)
      if (!fileKey) continue
      const fileData = await fetchFigmaFile(fileKey, url, settings.token)
      if (fileData) {
        allLibraryComponents.push(...fileData.components)
        allLibraryFingerprints.push(...fileData.fingerprints)
      }
    }
  }

  // Build results
  const results: PatternGroup[] = []

  for (const cluster of crossFileClusters) {
    const { frames, consistency } = cluster

    const usedComponentNames = new Set<string>()
    frames.forEach((f) => f.componentNames.forEach((n) => usedComponentNames.add(n)))
    const componentUsage = allLibraryComponents.filter((lc) => usedComponentNames.has(lc.name))

    const nameMatches: LibraryComponent[] = []
    for (const frame of frames) {
      for (const libComp of allLibraryComponents) {
        const score = fuzzyMatch(frame.name, libComp.name)
        if (score >= 0.5 && !nameMatches.some((m) => m.id === libComp.id)) {
          nameMatches.push(libComp)
        }
      }
    }

    const libraryMatches = findLibraryMatches(frames, allLibraryFingerprints)

    const fileCount = new Set(frames.map((f) => f.fileKey || '__local__')).size
    const label = `${frames[0].width}x${frames[0].height}_${fileCount}files_${consistency}%`
    results.push({
      fingerprint: label,
      frames,
      consistency,
      componentUsage,
      nameMatches,
      libraryMatches,
    })
  }

  // Sort by relevance (prefer cross-file patterns)
  results.sort((a, b) => {
    const filesA = new Set(a.frames.map((f) => f.fileKey || '__local__')).size
    const filesB = new Set(b.frames.map((f) => f.fileKey || '__local__')).size
    const topMatchA = a.libraryMatches.length > 0 ? a.libraryMatches[0].similarity : 0
    const topMatchB = b.libraryMatches.length > 0 ? b.libraryMatches[0].similarity : 0
    const scoreA = filesA * 10 + a.consistency + a.frames.length * 5 + topMatchA
    const scoreB = filesB * 10 + b.consistency + b.frames.length * 5 + topMatchB
    return scoreB - scoreA
  })

  return results
}

// ==================== MESSAGE HANDLERS ====================

function zoomToFrameId(id: string): void {
  const node = figma.getNodeById(id)
  if (node) {
    figma.currentPage.selection = [node as SceneNode]
    figma.viewport.scrollAndZoomIntoView([node as SceneNode])
  }
}

figma.on('selectionchange', () => {
  const sel = figma.currentPage.selection
  if (sel.length === 1 && sel[0].type === 'FRAME') {
    const detail = getFrameDetail(sel[0] as FrameNode)
    figma.ui.postMessage({ type: 'selection-change', payload: detail })
  } else {
    figma.ui.postMessage({ type: 'selection-change', payload: null })
  }
})

figma.ui.onmessage = async (msg: { type: string; payload?: unknown }) => {
  switch (msg.type) {
    case 'scan': {
      try {
        const settings = (msg.payload as PluginSettings) || {
          token: '',
          libraryUrls: [],
          teamId: '',
        }
        const results = await performScan(settings)
        figma.ui.postMessage({ type: 'scan-file-results', payload: results })
      } catch (err) {
        figma.ui.postMessage({ type: 'error', payload: `Scan failed: ${err}` })
      }
      break
    }

    case 'scan-team': {
      try {
        const settings = (msg.payload as PluginSettings) || {
          token: '',
          libraryUrls: [],
          teamId: '',
        }
        const results = await performTeamScan(settings)
        figma.ui.postMessage({ type: 'scan-results', payload: results })
      } catch (err) {
        figma.ui.postMessage({ type: 'error', payload: `Team scan failed: ${err}` })
      }
      break
    }

    case 'zoom-to-frame': {
      zoomToFrameId(msg.payload as string)
      break
    }

    case 'inspect-frame': {
      const inspectId = msg.payload as string
      const inspectNode = figma.getNodeById(inspectId)
      if (inspectNode && inspectNode.type === 'FRAME') {
        const detail = getFrameDetail(inspectNode as FrameNode)
        figma.ui.postMessage({ type: 'frame-detail', payload: detail })
      }
      break
    }

    case 'open-url': {
      const url = msg.payload as string
      if (url.startsWith('https://')) {
        figma.openExternal(url)
      }
      break
    }

    case 'save-settings': {
      await figma.clientStorage.setAsync(STORAGE_KEY, msg.payload)
      break
    }

    case 'load-settings': {
      const saved = await figma.clientStorage.getAsync(STORAGE_KEY)
      figma.ui.postMessage({
        type: 'settings-loaded',
        payload: saved || { token: '', libraryUrls: [], teamId: '' },
      })
      break
    }

    case 'close':
      figma.closePlugin()
      break
  }
}

// Show UI
figma.showUI(__html__, { width: 560, height: 900 })
