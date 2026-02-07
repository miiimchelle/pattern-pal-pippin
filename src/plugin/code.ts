// Types (__HTML_PLACEHOLDER__ is replaced at build time by vite.config.sandbox)

interface FrameFingerprint {
  id: string;
  name: string;
  width: number;
  height: number;
  childCount: number;
  maxDepth: number;
  componentIds: string[];
  aspectRatio: number;
}

interface LibraryFrame extends FrameFingerprint {
  fileKey: string;
  fileName: string;
  fileUrl: string;
}

interface PatternGroup {
  fingerprint: string;
  frames: FrameFingerprint[];
  libraryMatches: LibraryFrame[];
}

interface PluginSettings {
  token: string;
  libraryUrls: string[];
}

// Storage keys
const STORAGE_KEY = 'pattern-pal-settings';

// #region agent log
try {
  fetch('http://127.0.0.1:7243/ingest/cb406682-4d9e-4897-950e-32dd1da7d18e', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      location: 'code.ts:sandbox-entry',
      message: 'Sandbox script executing',
      data: { hypothesisId: 'H1' },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
} catch (_) {}
// #endregion

// Calculate max depth of node tree
function getMaxDepth(node: SceneNode, current = 0): number {
  if (!('children' in node) || node.children.length === 0) {
    return current;
  }
  return Math.max(...node.children.map((child) => getMaxDepth(child, current + 1)));
}

// Get all component IDs used in a subtree
function getComponentIds(node: SceneNode): string[] {
  const ids: string[] = [];

  if (node.type === 'INSTANCE') {
    const mainComponent = node.mainComponent;
    if (mainComponent) {
      ids.push(mainComponent.id);
    }
  }

  if ('children' in node) {
    for (const child of node.children) {
      ids.push(...getComponentIds(child));
    }
  }

  return [...new Set(ids)];
}

// Create fingerprint for a frame
function fingerprint(frame: FrameNode): FrameFingerprint {
  return {
    id: frame.id,
    name: frame.name,
    width: Math.round(frame.width),
    height: Math.round(frame.height),
    childCount: frame.children.length,
    maxDepth: getMaxDepth(frame),
    componentIds: getComponentIds(frame),
    aspectRatio: Math.round((frame.width / frame.height) * 100) / 100,
  };
}

// Generate similarity key
function getSimilarityKey(fp: FrameFingerprint): string {
  const widthBucket = Math.round(fp.width / 50) * 50;
  const heightBucket = Math.round(fp.height / 50) * 50;
  return `${widthBucket}x${heightBucket}_c${fp.childCount}_d${fp.maxDepth}`;
}

// Extract file key from Figma URL
function extractFileKey(url: string): string | null {
  const match = url.match(/figma\.com\/(file|design)\/([a-zA-Z0-9]+)/);
  return match ? match[2] : null;
}

// Fetch file from Figma REST API
async function fetchFigmaFile(
  fileKey: string,
  token: string,
): Promise<{ name: string; frames: FrameFingerprint[] } | null> {
  try {
    const response = await fetch(`https://api.figma.com/v1/files/${fileKey}?depth=2`, {
      headers: { 'X-Figma-Token': token },
    });

    if (!response.ok) {
      console.error(`Failed to fetch file ${fileKey}: ${response.status}`);
      return null;
    }

    const data = (await response.json()) as {
      name: string;
      document: { children: Array<{ type: string; id: string; name: string; absoluteBoundingBox?: { width: number; height: number }; children?: unknown[] }> };
    };
    const frames: FrameFingerprint[] = [];

    function walkNode(
      node: {
        type: string;
        id: string;
        name: string;
        absoluteBoundingBox?: { width: number; height: number };
        children?: unknown[];
      },
    ) {
      if (node.type === 'FRAME') {
        const w = node.absoluteBoundingBox?.width ?? 0;
        const h = node.absoluteBoundingBox?.height ?? 0;
        frames.push({
          id: node.id,
          name: node.name,
          width: Math.round(w),
          height: Math.round(h),
          childCount: node.children?.length ?? 0,
          maxDepth: 1,
          componentIds: [],
          aspectRatio: h ? Math.round((w / h) * 100) / 100 : 1,
        });
      }
      if (node.children) {
        node.children.forEach((child) => walkNode(child as Parameters<typeof walkNode>[0]));
      }
    }

    data.document.children.forEach(walkNode);

    return { name: data.name, frames };
  } catch (err) {
    console.error(`Error fetching file ${fileKey}:`, err);
    return null;
  }
}

// Scan current page
function scanCurrentPage(): FrameFingerprint[] {
  const page = figma.currentPage;
  const frames = page.children.filter((node): node is FrameNode => node.type === 'FRAME');
  return frames.map(fingerprint);
}

// Main scan function with library matching
async function performScan(settings: PluginSettings): Promise<PatternGroup[]> {
  const localFrames = scanCurrentPage();

  const libraryFrames: LibraryFrame[] = [];

  for (const url of settings.libraryUrls) {
    const fileKey = extractFileKey(url);
    if (!fileKey) continue;

    const fileData = await fetchFigmaFile(fileKey, settings.token);
    if (!fileData) continue;

    for (const frame of fileData.frames) {
      libraryFrames.push({
        ...frame,
        fileKey,
        fileName: fileData.name,
        fileUrl: url,
      });
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

  // Build results with library matches
  const results: PatternGroup[] = [];

  for (const [key, frames] of groups) {
    const libraryMatches = libraryFrames.filter((lf) => getSimilarityKey(lf) === key);

    if (frames.length >= 2 || libraryMatches.length > 0) {
      results.push({
        fingerprint: key,
        frames,
        libraryMatches,
      });
    }
  }

  results.sort(
    (a, b) =>
      b.frames.length + b.libraryMatches.length - (a.frames.length + a.libraryMatches.length),
  );

  return results;
}

// Handle messages from UI
figma.ui.onmessage = async (msg: { type: string; payload?: unknown }) => {
  switch (msg.type) {
    case 'scan': {
      try {
        const settings = msg.payload as PluginSettings;
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
    case 'open-url':
      figma.openExternal(msg.payload as string);
      break;

    case 'save-settings':
      await figma.clientStorage.setAsync(STORAGE_KEY, msg.payload);
      break;

    case 'load-settings': {
      const saved = await figma.clientStorage.getAsync(STORAGE_KEY);
      figma.ui.postMessage({
        type: 'settings-loaded',
        payload: saved ?? { token: '', libraryUrls: [] },
      });
      break;
    }
    case 'close':
      figma.closePlugin();
      break;
  }
};

const __html__ = '__HTML_PLACEHOLDER__';
// #region agent log
try {
  fetch('http://127.0.0.1:7243/ingest/cb406682-4d9e-4897-950e-32dd1da7d18e', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      location: 'code.ts:before-showUI',
      message: 'Inlined HTML before showUI',
      data: { hypothesisId: 'H2', htmlLen: __html__.length, runId: 'post-fix' },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
} catch (_) {}
// #endregion
figma.showUI(__html__, { width: 400, height: 600 });
