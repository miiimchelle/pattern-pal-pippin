declare const __html__: string;

// ==================== TYPES ====================

interface FrameFingerprint {
  id: string;
  name: string;
  width: number;
  height: number;
  childCount: number;
  maxDepth: number;
  componentIds: string[];
  componentNames: string[];
  aspectRatio: number;
}

interface LibraryComponent {
  id: string;
  name: string;
  description: string;
  fileKey: string;
  fileName: string;
  fileUrl: string;
}

interface PatternGroup {
  fingerprint: string;
  frames: FrameFingerprint[];
  componentUsage: LibraryComponent[];
  nameMatches: LibraryComponent[];
}

interface FrameDetail {
  id: string;
  name: string;
  width: number;
  height: number;
  cornerRadius: number | number[];
  padding: { top: number; right: number; bottom: number; left: number } | null;
  gap: number | null;
  layoutMode: string | null;
  childLayers: { name: string; type: string }[];
  fills: string[];
  depth: number;
}

interface PluginSettings {
  token: string;
  libraryUrls: string[];
}

interface FigmaFileData {
  name: string;
  components: LibraryComponent[];
}

// ==================== STORAGE ====================

const STORAGE_KEY = 'pattern-pal-settings';

// ==================== HELPERS ====================

function getMaxDepth(node: SceneNode, current = 0): number {
  if (!('children' in node) || node.children.length === 0) {
    return current;
  }
  return Math.max(...node.children.map((child) => getMaxDepth(child, current + 1)));
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (v: number) =>
    Math.round(v * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// Simple fuzzy match - returns score 0-1
function fuzzyMatch(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().replace(/[^a-z0-9]/g, '');
  const s2 = str2.toLowerCase().replace(/[^a-z0-9]/g, '');

  if (s1 === s2) return 1;
  if (s1.includes(s2) || s2.includes(s1)) return 0.8;

  const words1 = str1
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2);
  const words2 = str2
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2);

  if (words1.length === 0 || words2.length === 0) return 0;

  const matches = words1.filter((w1) =>
    words2.some((w2) => w1.includes(w2) || w2.includes(w1)),
  );
  return (matches.length / Math.max(words1.length, words2.length)) * 0.6;
}

// Extract file key from Figma URL
function extractFileKey(url: string): string | null {
  const match = url.match(/figma\.com\/(file|design)\/([a-zA-Z0-9]+)/);
  return match ? match[2] : null;
}

// ==================== LOCAL SCANNING ====================

function getComponentInfo(node: SceneNode): { ids: string[]; names: string[] } {
  const ids: string[] = [];
  const names: string[] = [];

  function walk(n: SceneNode) {
    if (n.type === 'INSTANCE') {
      const mainComponent = n.mainComponent;
      if (mainComponent) {
        ids.push(mainComponent.id);
        if (mainComponent.name && !names.includes(mainComponent.name)) {
          names.push(mainComponent.name);
        }
      }
    }
    if ('children' in n) {
      for (const child of n.children) {
        walk(child);
      }
    }
  }

  walk(node);
  return { ids: [...new Set(ids)], names };
}

function fingerprint(frame: FrameNode): FrameFingerprint {
  const componentInfo = getComponentInfo(frame);

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
  };
}

function getSimilarityKey(fp: FrameFingerprint): string {
  const widthBucket = Math.round(fp.width / 50) * 50;
  const heightBucket = Math.round(fp.height / 50) * 50;
  return `${widthBucket}x${heightBucket}_c${fp.childCount}_d${fp.maxDepth}`;
}

function scanCurrentPage(): FrameFingerprint[] {
  const page = figma.currentPage;
  const frames = page.children.filter((node): node is FrameNode => node.type === 'FRAME');
  return frames.map(fingerprint);
}

function getFrameDetail(frame: FrameNode): FrameDetail {
  let cornerRadius: number | number[];
  if (typeof frame.cornerRadius === 'number') {
    cornerRadius = frame.cornerRadius;
  } else {
    cornerRadius = [
      frame.topLeftRadius,
      frame.topRightRadius,
      frame.bottomRightRadius,
      frame.bottomLeftRadius,
    ];
  }

  let padding: FrameDetail['padding'] = null;
  if (frame.layoutMode && frame.layoutMode !== 'NONE') {
    padding = {
      top: frame.paddingTop,
      right: frame.paddingRight,
      bottom: frame.paddingBottom,
      left: frame.paddingLeft,
    };
  }

  const gap = frame.layoutMode && frame.layoutMode !== 'NONE' ? frame.itemSpacing : null;
  const layoutMode = frame.layoutMode && frame.layoutMode !== 'NONE' ? frame.layoutMode : null;

  const childLayers = frame.children.map((child) => ({
    name: child.name,
    type: child.type,
  }));

  const fills: string[] = [];
  if (Array.isArray(frame.fills)) {
    for (const fill of frame.fills) {
      if (fill.type === 'SOLID' && fill.visible !== false) {
        fills.push(rgbToHex(fill.color.r, fill.color.g, fill.color.b));
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
  };
}

// ==================== FIGMA API ====================

async function fetchFigmaFile(
  fileKey: string,
  fileUrl: string,
  token: string,
): Promise<FigmaFileData | null> {
  try {
    const response = await fetch(`https://api.figma.com/v1/files/${fileKey}?depth=1`, {
      headers: { 'X-Figma-Token': token },
    });

    if (!response.ok) {
      console.error(`Failed to fetch file ${fileKey}: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const components: LibraryComponent[] = [];

    // Extract components from the file
    if (data.components) {
      for (const [id, comp] of Object.entries(
        data.components as Record<string, { name?: string; description?: string }>,
      )) {
        components.push({
          id,
          name: comp.name || 'Unnamed',
          description: comp.description || '',
          fileKey,
          fileName: data.name,
          fileUrl,
        });
      }
    }

    return { name: data.name, components };
  } catch (err) {
    console.error(`Error fetching file ${fileKey}:`, err);
    return null;
  }
}

// ==================== MAIN SCAN ====================

async function performScan(settings: PluginSettings): Promise<PatternGroup[]> {
  const localFrames = scanCurrentPage();

  // Fetch library components if token provided
  const allLibraryComponents: LibraryComponent[] = [];

  if (settings.token && settings.libraryUrls.length > 0) {
    for (const url of settings.libraryUrls) {
      const fileKey = extractFileKey(url);
      if (!fileKey) continue;

      const fileData = await fetchFigmaFile(fileKey, url, settings.token);
      if (fileData) {
        allLibraryComponents.push(...fileData.components);
      }
    }
  }

  // Group local frames by similarity
  const groups = new Map<string, FrameFingerprint[]>();

  for (const fp of localFrames) {
    const key = getSimilarityKey(fp);
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(fp);
  }

  // Build results with enhanced matching
  const results: PatternGroup[] = [];

  for (const [key, frames] of groups) {
    // Find which library components are used in these frames
    const usedComponentNames = new Set<string>();
    frames.forEach((f) => f.componentNames.forEach((n) => usedComponentNames.add(n)));

    const componentUsage = allLibraryComponents.filter((lc) => usedComponentNames.has(lc.name));

    // Find name matches (fuzzy)
    const nameMatches: LibraryComponent[] = [];
    for (const frame of frames) {
      for (const libComp of allLibraryComponents) {
        const score = fuzzyMatch(frame.name, libComp.name);
        if (score >= 0.5 && !nameMatches.some((m) => m.id === libComp.id)) {
          nameMatches.push(libComp);
        }
      }
    }

    // Include groups with 2+ frames OR any library match
    if (frames.length >= 2 || componentUsage.length > 0 || nameMatches.length > 0) {
      results.push({
        fingerprint: key,
        frames,
        componentUsage,
        nameMatches,
      });
    }
  }

  // Sort by relevance
  results.sort((a, b) => {
    const scoreA = a.frames.length + a.componentUsage.length * 3 + a.nameMatches.length * 2;
    const scoreB = b.frames.length + b.componentUsage.length * 3 + b.nameMatches.length * 2;
    return scoreB - scoreA;
  });

  return results;
}

// ==================== MESSAGE HANDLERS ====================

figma.on('selectionchange', () => {
  const sel = figma.currentPage.selection;
  if (sel.length === 1 && sel[0].type === 'FRAME') {
    const detail = getFrameDetail(sel[0] as FrameNode);
    figma.ui.postMessage({ type: 'selection-change', payload: detail });
  } else {
    figma.ui.postMessage({ type: 'selection-change', payload: null });
  }
});

figma.ui.onmessage = async (msg: { type: string; payload?: unknown }) => {
  switch (msg.type) {
    case 'scan': {
      try {
        const settings = (msg.payload as PluginSettings) || { token: '', libraryUrls: [] };
        const results = await performScan(settings);
        figma.ui.postMessage({ type: 'scan-results', payload: results });
      } catch (err) {
        figma.ui.postMessage({ type: 'error', payload: `Scan failed: ${err}` });
      }
      break;
    }

    case 'zoom-to-frame': {
      const frameId = msg.payload as string;
      const node = figma.getNodeById(frameId);
      if (node) {
        figma.currentPage.selection = [node as SceneNode];
        figma.viewport.scrollAndZoomIntoView([node as SceneNode]);
      }
      break;
    }

    case 'inspect-frame': {
      const inspectId = msg.payload as string;
      const inspectNode = figma.getNodeById(inspectId);
      if (inspectNode && inspectNode.type === 'FRAME') {
        const detail = getFrameDetail(inspectNode as FrameNode);
        figma.ui.postMessage({ type: 'frame-detail', payload: detail });
      }
      break;
    }

    case 'open-url': {
      const url = msg.payload as string;
      if (url.startsWith('https://')) {
        figma.openExternal(url);
      }
      break;
    }

    case 'save-settings': {
      await figma.clientStorage.setAsync(STORAGE_KEY, msg.payload);
      break;
    }

    case 'load-settings': {
      const saved = await figma.clientStorage.getAsync(STORAGE_KEY);
      figma.ui.postMessage({
        type: 'settings-loaded',
        payload: saved || { token: '', libraryUrls: [] },
      });
      break;
    }

    case 'close':
      figma.closePlugin();
      break;
  }
};

// Show UI
figma.showUI(__html__, { width: 480, height: 700 });
