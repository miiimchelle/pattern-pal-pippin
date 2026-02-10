declare const __html__: string

import {
  type FrameFingerprint,
  type LibraryComponent,
  type LibraryComponentFingerprint,
  type LibraryMatch,
  type PatternGroup,
  type ApiNode,
  type PluginSettings,
  type FigmaFileData,
  type RuleIssue,
  type SelectedFrameScanResult,
  type TeamFileResult,
  type TeamFrameMatch,
  type FrameDetail,
  type RuleConfig,
  type RuleId,
  rgbToHex,
  fuzzyMatch,
  extractFileKey,
  isButtonComponentName,
  HIERARCHY_VARIANT_KEYS,
  computeStructuralSimilarity,
  computeSimilarity,
  findLibraryMatches,
  clusterFrames,
  getApiNodeDepth,
  buildApiFingerprint,
  extractComponentNodes,
  extractFrameFingerprints,
  getRelativeLuminance,
  contrastRatio,
  WCAG_AA_NORMAL,
  WCAG_AA_LARGE,
  RULE_IDS,
  DEFAULT_RULES,
} from './core'

// Re-export types used by other parts of the codebase
export type {
  FrameFingerprint,
  LibraryComponent,
  LibraryComponentFingerprint,
  LibraryMatch,
  PatternGroup,
  ApiNode,
  PluginSettings,
  FigmaFileData,
  RuleIssue,
  SelectedFrameScanResult,
  TeamFileResult,
  TeamFrameMatch,
  FrameDetail,
  RuleConfig,
  RuleId,
}

// ==================== STORAGE ====================

const STORAGE_KEY = 'pattern-pal-settings'
const RULES_STORAGE_KEY = 'pattern-pal-rules'
const CACHE_STORAGE_KEY = 'pattern-pal-scan-cache'

// ==================== CANCELLATION ====================

let scanCancelled = false

// ==================== HELPERS ====================

function getMaxDepth(node: SceneNode, current = 0): number {
  if (!('children' in node) || node.children.length === 0) {
    return current
  }
  return Math.max(...node.children.map((child) => getMaxDepth(child, current + 1)))
}

// ==================== PRIMARY BUTTON CHECK ====================

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
        ruleId: 'primary-button-limit',
        ruleName: 'Primary Button Limit',
        severity: 'error',
        frameId: frame.id,
        frameName: frame.name,
        nodeIds: primaryButtons.map((btn) => btn.id),
        message: `Container '${frame.name}' has ${primaryButtons.length} Primary Buttons — only one is allowed per screen.`,
      })
    }
  }

  return {
    issues,
  }
}

// ==================== TEXT STYLE CONSISTENCY ====================

function checkTextStyleConsistency(): RuleIssue[] {
  const issues: RuleIssue[] = []
  const frames = figma.currentPage.children.filter(
    (c): c is FrameNode | SectionNode => c.type === 'FRAME' || c.type === 'SECTION'
  )

  for (const frame of frames) {
    const unstyledNodes: SceneNode[] = []

    function walkText(node: SceneNode) {
      if (node.type === 'TEXT') {
        const textNode = node as TextNode
        const styleId = textNode.textStyleId
        if (styleId === '' || styleId === figma.mixed) {
          unstyledNodes.push(textNode)
        }
      }
      if ('children' in node) {
        for (const child of (node as ChildrenMixin).children) {
          walkText(child)
        }
      }
    }

    walkText(frame)

    if (unstyledNodes.length > 0) {
      issues.push({
        ruleId: RULE_IDS.TEXT_STYLE_CONSISTENCY,
        ruleName: 'Text Style Consistency',
        severity: 'warning',
        frameId: frame.id,
        frameName: frame.name,
        nodeIds: unstyledNodes.map((n) => n.id),
        message: `'${frame.name}' has ${unstyledNodes.length} text node${unstyledNodes.length > 1 ? 's' : ''} without a text style.`,
      })
    }
  }

  return issues
}

// ==================== SPACING CONSISTENCY ====================

function checkSpacingConsistency(): RuleIssue[] {
  const issues: RuleIssue[] = []
  const frames = figma.currentPage.children.filter(
    (c): c is FrameNode | SectionNode => c.type === 'FRAME' || c.type === 'SECTION'
  )

  for (const frame of frames) {
    const spacingValues: Map<number, SceneNode[]> = new Map()

    function walkAutoLayout(node: SceneNode) {
      if ('layoutMode' in node && (node as FrameNode).layoutMode !== 'NONE') {
        const f = node as FrameNode
        const spacing = f.itemSpacing
        if (!spacingValues.has(spacing)) {
          spacingValues.set(spacing, [])
        }
        spacingValues.get(spacing)!.push(f)
      }
      if ('children' in node) {
        for (const child of (node as ChildrenMixin).children) {
          walkAutoLayout(child)
        }
      }
    }

    walkAutoLayout(frame)

    if (spacingValues.size <= 1) continue

    // Find outlier spacing values (appear only once when there's a dominant value)
    const sorted = [...spacingValues.entries()].sort((a, b) => b[1].length - a[1].length)
    const dominantCount = sorted[0][1].length
    const outlierNodes: SceneNode[] = []

    for (const [, nodes] of sorted) {
      if (nodes.length < dominantCount && nodes.length === 1) {
        outlierNodes.push(...nodes)
      }
    }

    if (outlierNodes.length > 0) {
      const uniqueValues = [...spacingValues.keys()].sort((a, b) => a - b).map((v) => `${v}px`)
      issues.push({
        ruleId: RULE_IDS.SPACING_CONSISTENCY,
        ruleName: 'Spacing Consistency',
        severity: 'warning',
        frameId: frame.id,
        frameName: frame.name,
        nodeIds: outlierNodes.map((n) => n.id),
        message: `'${frame.name}' uses ${spacingValues.size} different spacing values (${uniqueValues.join(', ')}). Consider standardizing.`,
      })
    }
  }

  return issues
}

// ==================== COLOR TOKEN USAGE ====================

function checkColorTokenUsage(): RuleIssue[] {
  const issues: RuleIssue[] = []
  const frames = figma.currentPage.children.filter(
    (c): c is FrameNode | SectionNode => c.type === 'FRAME' || c.type === 'SECTION'
  )

  for (const frame of frames) {
    const unstyledNodes: SceneNode[] = []

    function walkFills(node: SceneNode) {
      if ('fills' in node && Array.isArray((node as GeometryMixin).fills)) {
        const fills = (node as GeometryMixin).fills as Paint[]
        const hasSolidFill = fills.some((f) => f.type === 'SOLID' && f.visible !== false)
        if (hasSolidFill) {
          const styleId = 'fillStyleId' in node ? (node as GeometryMixin).fillStyleId : ''
          if (styleId === '' || styleId === figma.mixed) {
            unstyledNodes.push(node)
          }
        }
      }
      if ('children' in node) {
        for (const child of (node as ChildrenMixin).children) {
          walkFills(child)
        }
      }
    }

    walkFills(frame)

    if (unstyledNodes.length > 0) {
      issues.push({
        ruleId: RULE_IDS.COLOR_TOKEN_USAGE,
        ruleName: 'Color Token Usage',
        severity: 'info',
        frameId: frame.id,
        frameName: frame.name,
        nodeIds: unstyledNodes.map((n) => n.id),
        message: `'${frame.name}' has ${unstyledNodes.length} element${unstyledNodes.length > 1 ? 's' : ''} with hardcoded colors instead of style tokens.`,
      })
    }
  }

  return issues
}

// ==================== CONTRAST RATIO ====================

function getNearestBackgroundColor(node: SceneNode): { r: number; g: number; b: number } | null {
  let current: BaseNode | null = node.parent
  while (current && 'fills' in current) {
    const fills = (current as GeometryMixin).fills
    if (Array.isArray(fills)) {
      for (let i = fills.length - 1; i >= 0; i--) {
        const fill = fills[i]
        if (fill.type === 'SOLID' && fill.visible !== false) {
          return fill.color
        }
      }
    }
    current = current.parent
  }
  // Default to white background
  return { r: 1, g: 1, b: 1 }
}

function checkContrastRatio(): RuleIssue[] {
  const issues: RuleIssue[] = []
  const frames = figma.currentPage.children.filter(
    (c): c is FrameNode | SectionNode => c.type === 'FRAME' || c.type === 'SECTION'
  )

  for (const frame of frames) {
    const failingNodes: { node: SceneNode; ratio: number }[] = []

    function walkContrast(node: SceneNode) {
      if (node.type === 'TEXT') {
        const textNode = node as TextNode
        const fills = textNode.fills
        if (Array.isArray(fills)) {
          for (const fill of fills) {
            if (fill.type === 'SOLID' && fill.visible !== false) {
              const bg = getNearestBackgroundColor(textNode)
              if (!bg) break
              const fgLum = getRelativeLuminance(fill.color.r, fill.color.g, fill.color.b)
              const bgLum = getRelativeLuminance(bg.r, bg.g, bg.b)
              const ratio = contrastRatio(fgLum, bgLum)

              const fontSize = typeof textNode.fontSize === 'number' ? textNode.fontSize : 16
              const threshold = fontSize >= 18 ? WCAG_AA_LARGE : WCAG_AA_NORMAL

              if (ratio < threshold) {
                failingNodes.push({ node: textNode, ratio })
              }
              break // Check only the topmost fill
            }
          }
        }
      }
      if ('children' in node) {
        for (const child of (node as ChildrenMixin).children) {
          walkContrast(child)
        }
      }
    }

    walkContrast(frame)

    if (failingNodes.length > 0) {
      issues.push({
        ruleId: RULE_IDS.CONTRAST_RATIO,
        ruleName: 'Contrast Ratio (WCAG AA)',
        severity: 'error',
        frameId: frame.id,
        frameName: frame.name,
        nodeIds: failingNodes.map((n) => n.node.id),
        message: `'${frame.name}' has ${failingNodes.length} text node${failingNodes.length > 1 ? 's' : ''} that fail WCAG AA contrast (min ${WCAG_AA_NORMAL}:1).`,
      })
    }
  }

  return issues
}

// ==================== RULE ORCHESTRATOR ====================

async function runDesignRules(enabledRules: Set<RuleId>): Promise<RuleIssue[]> {
  const allIssues: RuleIssue[] = []

  if (enabledRules.has(RULE_IDS.PRIMARY_BUTTON_LIMIT)) {
    const result = await checkPrimaryButtonPerFrame()
    allIssues.push(...result.issues)
  }
  if (enabledRules.has(RULE_IDS.TEXT_STYLE_CONSISTENCY)) {
    allIssues.push(...checkTextStyleConsistency())
  }
  if (enabledRules.has(RULE_IDS.SPACING_CONSISTENCY)) {
    allIssues.push(...checkSpacingConsistency())
  }
  if (enabledRules.has(RULE_IDS.COLOR_TOKEN_USAGE)) {
    allIssues.push(...checkColorTokenUsage())
  }
  if (enabledRules.has(RULE_IDS.CONTRAST_RATIO)) {
    allIssues.push(...checkContrastRatio())
  }

  return allIssues
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

async function performScan(settings: PluginSettings, enabledRules: Set<RuleId>): Promise<SelectedFrameScanResult> {
  scanCancelled = false

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
    if (scanCancelled) {
      figma.ui.postMessage({ type: 'scan-cancelled', payload: { partial: true } })
      break
    }
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

  const ruleIssues = await runDesignRules(enabledRules)

  return {
    selectedFrame: selectedFp,
    teamFileResults,
    libraryMatches,
    overallConsistency: Math.round(overallConsistency),
    ruleIssues,
  }
}

async function performTeamScan(settings: PluginSettings): Promise<PatternGroup[]> {
  scanCancelled = false

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
    if (scanCancelled) {
      figma.ui.postMessage({ type: 'scan-cancelled', payload: { partial: true } })
      break
    }
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
        const { settings: scanSettings, enabledRules: ruleIds } = msg.payload as {
          settings: PluginSettings
          enabledRules: string[]
        } || { settings: { token: '', libraryUrls: [], teamId: '' }, enabledRules: [] }
        const enabledSet = new Set(ruleIds as RuleId[])
        const results = await performScan(scanSettings || { token: '', libraryUrls: [], teamId: '' }, enabledSet)
        figma.ui.postMessage({ type: 'scan-file-results', payload: results })
        // Cache frame scan results
        await figma.clientStorage.setAsync(CACHE_STORAGE_KEY, {
          result: results,
          timestamp: Date.now(),
        })
      } catch (err) {
        figma.ui.postMessage({ type: 'error', payload: `Scan failed: ${err}` })
      }
      break
    }

    case 'cancel-scan': {
      scanCancelled = true
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

    case 'save-rules': {
      await figma.clientStorage.setAsync(RULES_STORAGE_KEY, msg.payload)
      break
    }

    case 'load-rules': {
      const savedRules = await figma.clientStorage.getAsync(RULES_STORAGE_KEY)
      figma.ui.postMessage({
        type: 'rules-loaded',
        payload: savedRules || DEFAULT_RULES,
      })
      break
    }

    case 'load-cache': {
      const cachedData = await figma.clientStorage.getAsync(CACHE_STORAGE_KEY)
      figma.ui.postMessage({ type: 'cache-loaded', payload: cachedData || null })
      break
    }

    case 'clear-cache': {
      await figma.clientStorage.deleteAsync(CACHE_STORAGE_KEY)
      figma.ui.postMessage({ type: 'cache-cleared' })
      break
    }

    case 'test-connection': {
      const { token, teamId } = msg.payload as { token: string; teamId: string }
      const result = { tokenValid: false, teamIdValid: false, userName: '', error: '' }
      try {
        const meResp = await fetch('https://api.figma.com/v1/me', {
          headers: { 'X-Figma-Token': token },
        })
        result.tokenValid = meResp.ok
        if (meResp.ok) {
          const me = await meResp.json()
          result.userName = me.handle || me.email || ''
        }
      } catch (err) {
        result.error = `Token check failed: ${err}`
      }
      if (result.tokenValid && teamId) {
        try {
          const teamResp = await fetchWithRetry(
            `https://api.figma.com/v1/teams/${teamId}/projects`,
            token
          )
          result.teamIdValid = teamResp.ok
        } catch (err) {
          result.error = `Team ID check failed: ${err}`
        }
      }
      figma.ui.postMessage({ type: 'test-connection-result', payload: result })
      break
    }

    case 'close':
      figma.closePlugin()
      break
  }
}

// Show UI
figma.showUI(__html__, { width: 560, height: 900 })
