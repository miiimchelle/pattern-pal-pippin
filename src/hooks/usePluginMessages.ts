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

export interface PluginSettings {
  token: string;
  libraryUrls: string[];
}

export function usePluginMessages() {
  const [results, setResults] = useState<PatternGroup[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [selectedFrame, setSelectedFrame] = useState<FrameDetail | null>(null);
  const [settings, setSettings] = useState<PluginSettings>({ token: '', libraryUrls: [] });
  const [showSettings, setShowSettings] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          setIsScanning(false);
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
          break;
      }
    };

    window.addEventListener('message', handler);
    postMessage('load-settings');
    return () => window.removeEventListener('message', handler);
  }, [postMessage]);

  const scan = useCallback(() => {
    setError(null);
    setIsScanning(true);
    postMessage('scan', settings);
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
    (token: string, libraryUrls: string[]) => {
      const newSettings = { token, libraryUrls };
      setSettings(newSettings);
      postMessage('save-settings', newSettings);
      setShowSettings(false);
    },
    [postMessage],
  );

  const close = useCallback(() => {
    postMessage('close');
  }, [postMessage]);

  return {
    results,
    isScanning,
    selectedFrame,
    settings,
    showSettings,
    setShowSettings,
    error,
    scan,
    zoomToFrame,
    inspectFrame,
    openInFigma,
    saveSettings,
    close,
  };
}
