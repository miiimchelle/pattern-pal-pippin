declare const __html__: string;

// Types for pattern fingerprinting
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

interface PatternGroup {
  fingerprint: string;
  frames: FrameFingerprint[];
}

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

  return [...new Set(ids)]; // dedupe
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

// Generate similarity key (frames with same key are "similar")
function getSimilarityKey(fp: FrameFingerprint): string {
  // Group by: similar dimensions (within 10%), same child count, same depth
  const widthBucket = Math.round(fp.width / 50) * 50;
  const heightBucket = Math.round(fp.height / 50) * 50;
  return `${widthBucket}x${heightBucket}_c${fp.childCount}_d${fp.maxDepth}`;
}

// Scan all top-level frames in current page
function scanCurrentPage(): PatternGroup[] {
  const page = figma.currentPage;
  const frames = page.children.filter((node): node is FrameNode => node.type === 'FRAME');

  const fingerprints = frames.map(fingerprint);

  // Group by similarity key
  const groups = new Map<string, FrameFingerprint[]>();

  for (const fp of fingerprints) {
    const key = getSimilarityKey(fp);
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(fp);
  }

  // Convert to array, filter to groups with 2+ matches, sort by count desc
  return Array.from(groups.entries())
    .filter(([, frames]) => frames.length >= 2)
    .map(([fingerprint, frames]) => ({ fingerprint, frames }))
    .sort((a, b) => b.frames.length - a.frames.length);
}

// Handle messages from UI
figma.ui.onmessage = (msg: { type: string; payload?: unknown }) => {
  switch (msg.type) {
    case 'scan':
      const results = scanCurrentPage();
      figma.ui.postMessage({ type: 'scan-results', payload: results });
      break;

    case 'zoom-to-frame':
      const frameId = msg.payload as string;
      const node = figma.getNodeById(frameId);
      if (node) {
        figma.currentPage.selection = [node as SceneNode];
        figma.viewport.scrollAndZoomIntoView([node as SceneNode]);
      }
      break;

    case 'close':
      figma.closePlugin();
      break;
  }
};

// Show UI
figma.showUI(__html__, { width: 400, height: 600 });
