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

export interface PatternGroup {
  fingerprint: string;
  frames: FrameFingerprint[];
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

export function usePluginMessages() {
  const [results, setResults] = useState<PatternGroup[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [selectedFrame, setSelectedFrame] = useState<FrameDetail | null>(null);

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
      }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  const postMessage = useCallback((type: string, payload?: unknown) => {
    parent.postMessage({ pluginMessage: { type, payload } }, '*');
  }, []);

  const scan = useCallback(() => {
    setIsScanning(true);
    postMessage('scan');
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

  const openUrl = useCallback(
    (url: string) => {
      postMessage('open-url', url);
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
    scan,
    zoomToFrame,
    inspectFrame,
    openUrl,
    close,
  };
}
