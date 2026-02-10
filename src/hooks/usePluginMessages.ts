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

export interface RuleIssue {
  ruleId: string;
  ruleName: string;
  severity: 'error' | 'warning' | 'info';
  frameId: string;
  frameName: string;
  nodeIds: string[];
  message: string;
}

export interface SelectedFrameScanResult {
  selectedFrame: FrameFingerprint;
  teamFileResults: TeamFileResult[];
  libraryMatches: LibraryMatch[];
  overallConsistency: number;
  ruleIssues: RuleIssue[];
}

export interface PluginSettings {
  token: string;
  libraryUrls: string[];
  teamId: string;
}

export interface ConnectionTestResult {
  tokenValid: boolean;
  teamIdValid: boolean;
  userName: string;
  error: string;
}

export interface RuleConfig {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

export interface CachedScanData {
  result: SelectedFrameScanResult;
  timestamp: number;
}

export function usePluginMessages() {
  const [results, setResults] = useState<PatternGroup[]>([]);
  const [selectedFrameScanResult, setSelectedFrameScanResult] =
    useState<SelectedFrameScanResult | null>(null);
  const [isScanningFrame, setIsScanningFrame] = useState(false);
  const [isScanningTeam, setIsScanningTeam] = useState(false);
  const [frameScanProgress, setFrameScanProgress] = useState<ScanProgress | null>(null);
  const [teamScanProgress, setTeamScanProgress] = useState<ScanProgress | null>(null);
  const [selectedFrame, setSelectedFrame] = useState<FrameDetail | null>(null);
  const [settings, setSettings] = useState<PluginSettings>({ token: '', libraryUrls: [], teamId: '' });
  const [showSettings, setShowSettings] = useState(false);
  const [frameError, setFrameError] = useState<string | null>(null);
  const [teamError, setTeamError] = useState<string | null>(null);
  const [activeScanType, setActiveScanType] = useState<'frame' | 'team' | null>(null);
  const [connectionTest, setConnectionTest] = useState<ConnectionTestResult | null>(null);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [rules, setRules] = useState<RuleConfig[]>([]);
  const [showRules, setShowRules] = useState(false);
  const [cachedTimestamp, setCachedTimestamp] = useState<number | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  const postMessage = useCallback((type: string, payload?: unknown) => {
    parent.postMessage({ pluginMessage: { type, payload } }, '*');
  }, []);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const msg = event.data.pluginMessage;
      if (!msg) return;

      switch (msg.type) {
        case 'scan-results':
          setResults(msg.payload);
          setIsScanningTeam(false);
          setTeamScanProgress(null);
          break;
        case 'scan-file-results':
          setSelectedFrameScanResult(msg.payload);
          setIsScanningFrame(false);
          setFrameScanProgress(null);
          setCachedTimestamp(Date.now());
          break;
        case 'scan-progress':
          if (activeScanType === 'frame') {
            setFrameScanProgress(msg.payload);
          } else {
            setTeamScanProgress(msg.payload);
          }
          break;
        case 'scan-cancelled':
          if (activeScanType === 'frame') {
            setIsScanningFrame(false);
            setFrameScanProgress(null);
          } else {
            setIsScanningTeam(false);
            setTeamScanProgress(null);
          }
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
        case 'rules-loaded':
          setRules(msg.payload);
          break;
        case 'cache-loaded':
          if (msg.payload) {
            const cached = msg.payload as CachedScanData;
            setSelectedFrameScanResult(cached.result);
            setCachedTimestamp(cached.timestamp);
          }
          break;
        case 'cache-cleared':
          setCachedTimestamp(null);
          setSelectedFrameScanResult(null);
          break;
        case 'test-connection-result':
          setConnectionTest(msg.payload);
          setIsTestingConnection(false);
          break;
        case 'error':
          if (activeScanType === 'frame') {
            setFrameError(msg.payload);
            setIsScanningFrame(false);
            setFrameScanProgress(null);
          } else {
            setTeamError(msg.payload);
            setIsScanningTeam(false);
            setTeamScanProgress(null);
          }
          break;
      }
    };

    window.addEventListener('message', handler);
    postMessage('load-settings');
    postMessage('load-rules');
    postMessage('load-cache');
    return () => window.removeEventListener('message', handler);
  }, [postMessage, activeScanType]);

  const scan = useCallback(() => {
    setFrameError(null);
    setIsScanningFrame(true);
    setFrameScanProgress(null);
    setActiveScanType('frame');
    const enabledRules = rules.filter((r) => r.enabled).map((r) => r.id);
    postMessage('scan', { settings, enabledRules });
  }, [postMessage, settings, rules]);

  const scanTeam = useCallback(() => {
    setTeamError(null);
    setIsScanningTeam(true);
    setTeamScanProgress(null);
    setActiveScanType('team');
    postMessage('scan-team', settings);
  }, [postMessage, settings]);

  const cancelScan = useCallback(() => {
    postMessage('cancel-scan');
  }, [postMessage]);

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
    (token: string, libraryUrls: string[], teamId: string) => {
      const newSettings = { token, libraryUrls, teamId };
      setSettings(newSettings);
      postMessage('save-settings', newSettings);
      setShowSettings(false);
    },
    [postMessage],
  );

  const saveRules = useCallback(
    (updatedRules: RuleConfig[]) => {
      setRules(updatedRules);
      postMessage('save-rules', updatedRules);
    },
    [postMessage],
  );

  const testConnection = useCallback(
    (token: string, teamId: string) => {
      setConnectionTest(null);
      setIsTestingConnection(true);
      postMessage('test-connection', { token, teamId });
    },
    [postMessage],
  );

  const clearCache = useCallback(() => {
    postMessage('clear-cache');
  }, [postMessage]);

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch {
      setCopySuccess(false);
    }
  }, []);

  const close = useCallback(() => {
    postMessage('close');
  }, [postMessage]);

  return {
    results,
    selectedFrameScanResult,
    isScanningFrame,
    isScanningTeam,
    frameScanProgress,
    teamScanProgress,
    selectedFrame,
    settings,
    showSettings,
    setShowSettings,
    frameError,
    teamError,
    scan,
    scanTeam,
    cancelScan,
    zoomToFrame,
    inspectFrame,
    openInFigma,
    saveSettings,
    saveRules,
    rules,
    showRules,
    setShowRules,
    testConnection,
    connectionTest,
    isTestingConnection,
    cachedTimestamp,
    clearCache,
    copyToClipboard,
    copySuccess,
    close,
  };
}
