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

// Types for frame detail inspection
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

// Convert Figma RGB to hex string
function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (v: number) =>
    Math.round(v * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// Extract detailed frame info for the reference panel
function getFrameDetail(frame: FrameNode): FrameDetail {
  // Corner radius
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

  // Padding (auto-layout only)
  let padding: FrameDetail['padding'] = null;
  if (frame.layoutMode && frame.layoutMode !== 'NONE') {
    padding = {
      top: frame.paddingTop,
      right: frame.paddingRight,
      bottom: frame.paddingBottom,
      left: frame.paddingLeft,
    };
  }

  // Gap (auto-layout only)
  const gap =
    frame.layoutMode && frame.layoutMode !== 'NONE' ? frame.itemSpacing : null;

  // Layout mode
  const layoutMode =
    frame.layoutMode && frame.layoutMode !== 'NONE' ? frame.layoutMode : null;

  // Child layers
  const childLayers = frame.children.map((child) => ({
    name: child.name,
    type: child.type,
  }));

  // Fill colors
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
  const widthBucket = Math.round(fp.width / 50) * 50;
  const heightBucket = Math.round(fp.height / 50) * 50;
  return `${widthBucket}x${heightBucket}_c${fp.childCount}_d${fp.maxDepth}`;
}

// Scan all top-level frames in current page
function scanCurrentPage(): PatternGroup[] {
  const page = figma.currentPage;
  const frames = page.children.filter((node): node is FrameNode => node.type === 'FRAME');

  const fingerprints = frames.map(fingerprint);

  const groups = new Map<string, FrameFingerprint[]>();

  for (const fp of fingerprints) {
    const key = getSimilarityKey(fp);
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(fp);
  }

  return Array.from(groups.entries())
    .filter(([, frames]) => frames.length >= 2)
    .map(([fingerprint, frames]) => ({ fingerprint, frames }))
    .sort((a, b) => b.frames.length - a.frames.length);
}

// Listen to selection changes and send frame detail to UI
figma.on('selectionchange', () => {
  const sel = figma.currentPage.selection;
  if (sel.length === 1 && sel[0].type === 'FRAME') {
    const detail = getFrameDetail(sel[0] as FrameNode);
    figma.ui.postMessage({ type: 'selection-change', payload: detail });
  } else {
    figma.ui.postMessage({ type: 'selection-change', payload: null });
  }
});

// Handle messages from UI
figma.ui.onmessage = (msg: { type: string; payload?: unknown }) => {
  switch (msg.type) {
    case 'scan': {
      const results = scanCurrentPage();
      figma.ui.postMessage({ type: 'scan-results', payload: results });
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
      if (url.startsWith('https://ui.shadcn.com/')) {
        figma.openExternal(url);
      }
      break;
    }

    case 'close':
      figma.closePlugin();
      break;
  }
};

// Show UI
figma.showUI(__html__, { width: 480, height: 700 });
