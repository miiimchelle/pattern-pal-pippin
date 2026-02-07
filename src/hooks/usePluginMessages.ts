import { useEffect, useCallback, useState } from 'react';

export interface FrameFingerprint {
  id: string;
  name: string;
  width: number;
  height: number;
  childCount: number;
  maxDepth: number;
  componentIds: string[];
  aspectRatio: number;
}

export interface LibraryFrame extends FrameFingerprint {
  fileKey: string;
  fileName: string;
  fileUrl: string;
}

export interface PatternGroup {
  fingerprint: string;
  frames: FrameFingerprint[];
  libraryMatches: LibraryFrame[];
}

export interface PluginSettings {
  token: string;
  libraryUrls: string[];
}

export function usePluginMessages() {
  const [results, setResults] = useState<PatternGroup[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [settings, setSettings] = useState<PluginSettings>({ token: '', libraryUrls: [] });
  const [showSettings, setShowSettings] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const postMessage = useCallback((type: string, payload?: unknown) => {
    parent.postMessage({ pluginMessage: { type, payload } }, '*');
  }, []);

  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/cb406682-4d9e-4897-950e-32dd1da7d18e', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'usePluginMessages.ts:ui-mount',
        message: 'Plugin UI iframe mounted',
        data: { hypothesisId: 'H3' },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    const handler = (event: MessageEvent) => {
      const msg = event.data.pluginMessage;
      if (!msg) return;

      switch (msg.type) {
        case 'scan-results':
          setResults(msg.payload);
          setIsScanning(false);
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
    if (!settings.token) {
      setShowSettings(true);
      return;
    }
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
    settings,
    showSettings,
    setShowSettings,
    error,
    scan,
    zoomToFrame,
    openInFigma,
    saveSettings,
    close,
  };
}
