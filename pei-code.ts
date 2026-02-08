// code.ts
console.log("Pattern Pal plugin loaded");

// Show the UI immediately
figma.showUI(__html__, { width: 400, height: 500 });

// -----------------------------
// Interfaces
// -----------------------------
interface RuleIssue {
  frameId: string;
  frameName: string;
  primaryButtonIds: string[];
  message: string;
}

// -----------------------------
// Helpers
// -----------------------------
function isButtonComponentName(name: string): boolean {
  const lower = name.toLowerCase();
  const hasButton = lower.includes("button") || lower.includes("btn");
  const hasCta = lower === "cta" || lower.includes("/cta");
  const hasPrimaryWithButton = lower.includes("primary") && hasButton;
  return hasButton || hasCta || hasPrimaryWithButton;
}

function isPrimaryButton(node: InstanceNode): boolean {
  const props = node.variantProperties as Record<string, string> | undefined;
  if (props && Object.keys(props).length > 0) {
    for (const key of Object.keys(props)) {
      const val = props[key];
      if (typeof val === "string" && (val.toLowerCase() === "primary" || val.toLowerCase() === "default")) {
        return true;
      }
    }
    return false;
  }

  const name = (node.name ?? "").toLowerCase();
  return name.includes("primary") || (name.includes("button") && !name.includes("secondary") && !name.includes("outline") && !name.includes("ghost"));
}

function collectContainers(node: SceneNode): SceneNode[] {
  const containers: SceneNode[] = [];
  const isContainer =
    node.type === "FRAME" ||
    node.type === "SECTION" ||
    node.type === "GROUP" ||
    node.type === "COMPONENT" ||
    node.type === "COMPONENT_SET";
  if (isContainer) containers.push(node);

  if ("children" in node) {
    for (const child of node.children) {
      containers.push(...collectContainers(child));
    }
  }

  return containers;
}

async function findButtonInstances(node: SceneNode, namesSeen: string[]): Promise<InstanceNode[]> {
  let instances: InstanceNode[] = [];

  if (node.type === "INSTANCE") {
    const mainComponent = await node.getMainComponentAsync();
    const componentName = mainComponent?.name ?? "(no main component)";
    const instanceName = node.name ?? "";

    if (componentName !== "(no main component)") namesSeen.push(componentName);

    const nameMatches = isButtonComponentName(componentName) || isButtonComponentName(instanceName);
    if (nameMatches) instances.push(node);
  }

  if ("children" in node) {
    for (const child of node.children) {
      const childInstances = await findButtonInstances(child, namesSeen);
      instances = instances.concat(childInstances);
    }
  }

  return instances;
}

// -----------------------------
// Main Rule Check
// -----------------------------
async function checkPrimaryButtonPerFrame(): Promise<{
  issues: RuleIssue[];
  debug: {
    frameCount: number;
    frameNames: string[];
    buttonCount: number;
    pageChildTypes: string[];
    instanceNamesSeen: string[];
  };
}> {
  const issues: RuleIssue[] = [];
  const frames: SceneNode[] = [];
  const pageChildTypes = figma.currentPage.children.map(c => ({ type: c.type, name: c.name }));
  const pageChildTypesSummary = pageChildTypes.map(p => `${p.type}:${p.name}`).slice(0, 8);

  for (const child of figma.currentPage.children) {
    frames.push(...collectContainers(child));
  }

  const instanceNamesSeen: string[] = [];
  let totalButtons = 0;

  for (const frame of frames) {
    const allButtonInstances = await findButtonInstances(frame, instanceNamesSeen);
    totalButtons += allButtonInstances.length;
    const primaryButtons = allButtonInstances.filter(isPrimaryButton);

    if (primaryButtons.length > 1) {
      issues.push({
        frameId: frame.id,
        frameName: frame.name,
        primaryButtonIds: primaryButtons.map(btn => btn.id),
        message: `Container '${frame.name}' has ${primaryButtons.length} Primary Buttons — only one is allowed per screen.`,
      });
    }
  }

  return {
    issues,
    debug: {
      frameCount: frames.length,
      frameNames: frames.map(f => f.name),
      buttonCount: totalButtons,
      pageChildTypes: pageChildTypesSummary,
      instanceNamesSeen: [...new Set(instanceNamesSeen)],
    },
  };
}

// -----------------------------
// Message Listener
// -----------------------------
figma.ui.onmessage = async (msg) => {
  if (msg.type === "run-check") {
    try {
      const result = await checkPrimaryButtonPerFrame();
      figma.ui.postMessage({ type: "check-result", data: result });
    } catch (error) {
      console.error("Error running check:", error);
      figma.ui.postMessage({ type: "check-error", error: String(error) });
    }
  }

  if (msg.type === "highlight-frame") {
    const node = figma.currentPage.findOne(n => n.id === msg.frameId) as SceneNode | null;
    if (node && "children" in node) {
      figma.currentPage.selection = [node];
      figma.viewport.scrollAndZoomIntoView([node]);
    }
  }
};
