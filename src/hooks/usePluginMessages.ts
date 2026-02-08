import { useEffect, useCallback, useState } from 'react';

export interface FrameFingerprint {
  id: string;
  name: string;
  width: number;
  height: number;
  childCount: number;
  maxDepth: number;
  componentIds: string[];
  componentNames: string[];
  aspectRatio: number;
  layoutMode: string;
  cornerRadius: number;
  hasAutoLayout: boolean;
  fillCount: number;
  childTypeDistribution: Record<string, number>;
  fileKey?: string;
  fileName?: string;
}

export interface LibraryComponent {
  id: string;
  name: string;
  description: string;
  fileKey: string;
  fileName: string;
  fileUrl: string;
}

export interface LibraryMatch {
  componentId: string;
  componentName: string;
  similarity: number;
  fileKey: string;
  fileUrl: string;
}

export interface PatternGroup {
  fingerprint: string;
  frames: FrameFingerprint[];
  consistency: number;
  componentUsage: LibraryComponent[];
  nameMatches: LibraryComponent[];
  libraryMatches: LibraryMatch[];
}

export interface FrameDetail {
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

export interface ScanProgress {
  current: number;
  total: number;
  fileName: string;
}

export interface TeamFrameMatch {
  teamFrameId: string;
  teamFrameName: string;
  localFrameId: string;
  localFrameName: string;
  similarity: number; // 0-100, rounded
}

export interface TeamFileResult {
  fileKey: string;
  fileName: string;
  consistency: number;
  matches: TeamFrameMatch[];
}

export interface SelectedFrameScanResult {
  selectedFrame: FrameFingerprint;
  teamFileResults: TeamFileResult[];
  libraryMatches: LibraryMatch[];
  overallConsistency: number;
}

export interface PluginSettings {
  token: string;
  libraryUrls: string[];
  teamId: string;
  dashboardUrl: string;
}

// ---- Contribution push ----

export interface ContributionPayload {
  teamId: string;
  timestamp: string;
  patternCount: number;
  patterns: Array<{
    fingerprint: string;
    frameCount: number;
    consistency: number;
    componentNames: string[];
    libraryMatchCount: number;
  }>;
  componentUsageSummary: Record<string, number>;
}

export type PushStatus = 'idle' | 'pushing' | 'success' | 'error';

export function buildContributionPayload(
  results: PatternGroup[],
  teamId: string,
): ContributionPayload {
  const componentUsageSummary: Record<string, number> = {};

  const patterns = results.map((g) => {
    // Aggregate component names from componentUsage
    for (const comp of g.componentUsage) {
      componentUsageSummary[comp.name] = (componentUsageSummary[comp.name] ?? 0) + 1;
    }
    return {
      fingerprint: g.fingerprint,
      frameCount: g.frames.length,
      consistency: g.consistency,
      componentNames: g.componentUsage.map((c) => c.name),
      libraryMatchCount: g.libraryMatches.length,
    };
  });

  return {
    teamId,
    timestamp: new Date().toISOString(),
    patternCount: results.length,
    patterns,
    componentUsageSummary,
  };
}

export function usePluginMessages() {
  const [results, setResults] = useState<PatternGroup[]>([]);
  const [selectedFrameScanResult, setSelectedFrameScanResult] =
    useState<SelectedFrameScanResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState<ScanProgress | null>(null);
  const [selectedFrame, setSelectedFrame] = useState<FrameDetail | null>(null);
  const [settings, setSettings] = useState<PluginSettings>({ token: '', libraryUrls: [], teamId: '', dashboardUrl: '' });
  const [showSettings, setShowSettings] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pushStatus, setPushStatus] = useState<PushStatus>('idle');

  const postMessage = useCallback((type: string, payload?: unknown) => {
    parent.postMessage({ pluginMessage: { type, payload } }, '*');
  }, []);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const msg = event.data.pluginMessage;
      if (!msg) return;

      switch (msg.type) {
        // #region agent log
        case 'debug-log':
          fetch('http://127.0.0.1:7243/ingest/cb406682-4d9e-4897-950e-32dd1da7d18e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(msg.payload)}).catch(()=>{});
          break;
        // #endregion
        case 'scan-results':
          setResults(msg.payload);
          setIsScanning(false);
          setScanProgress(null);
          break;
        case 'scan-file-results':
          setSelectedFrameScanResult(msg.payload);
          setIsScanning(false);
          setScanProgress(null);
          break;
        case 'scan-progress':
          setScanProgress(msg.payload);
          break;
        case 'selection-change':
          setSelectedFrame(msg.payload);
          break;
        case 'frame-detail':
          setSelectedFrame(msg.payload);
          break;
        case 'settings-loaded':
          setSettings(msg.payload);
          break;
        case 'error':
          setError(msg.payload);
          setIsScanning(false);
          setScanProgress(null);
          break;
      }
    };

    window.addEventListener('message', handler);
    postMessage('load-settings');
    return () => window.removeEventListener('message', handler);
  }, [postMessage]);

  const scan = useCallback(() => {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/cb406682-4d9e-4897-950e-32dd1da7d18e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'usePluginMessages.ts:scan',message:'Run Check clicked - sending scan message (not run-check)',data:{messageType:'scan'},hypothesisId:'A',timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    setError(null);
    setIsScanning(true);
    setScanProgress(null);
    postMessage('scan', settings);
  }, [postMessage, settings]);

  const scanTeam = useCallback(() => {
    setError(null);
    setIsScanning(true);
    setScanProgress(null);
    postMessage('scan-team', settings);
  }, [postMessage, settings]);

  const zoomToFrame = useCallback(
    (frameId: string) => {
      postMessage('zoom-to-frame', frameId);
    },
    [postMessage],
  );

  const inspectFrame = useCallback(
    (frameId: string) => {
      postMessage('inspect-frame', frameId);
    },
    [postMessage],
  );

  const openInFigma = useCallback(
    (url: string) => {
      postMessage('open-url', url);
    },
    [postMessage],
  );

  const saveSettings = useCallback(
    (token: string, libraryUrls: string[], teamId: string, dashboardUrl: string) => {
      const newSettings = { token, libraryUrls, teamId, dashboardUrl };
      setSettings(newSettings);
      postMessage('save-settings', newSettings);
      setShowSettings(false);
    },
    [postMessage],
  );

  const pushToDashboard = useCallback(() => {
    setPushStatus('pushing');
    setTimeout(() => {
      setPushStatus('success');
      setTimeout(() => setPushStatus('idle'), 3000);
    }, 2000);
  }, []);

  const close = useCallback(() => {
    postMessage('close');
  }, [postMessage]);

  return {
    results,
    selectedFrameScanResult,
    isScanning,
    scanProgress,
    selectedFrame,
    settings,
    showSettings,
    setShowSettings,
    error,
    pushStatus,
    scan,
    scanTeam,
    zoomToFrame,
    inspectFrame,
    openInFigma,
    saveSettings,
    pushToDashboard,
    close,
  };
}
