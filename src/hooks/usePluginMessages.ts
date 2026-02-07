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

export function usePluginMessages() {
  const [results, setResults] = useState<PatternGroup[]>([]);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const msg = event.data.pluginMessage;
      if (!msg) return;

      switch (msg.type) {
        case 'scan-results':
          setResults(msg.payload);
          setIsScanning(false);
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
    [postMessage]
  );

  const close = useCallback(() => {
    postMessage('close');
  }, [postMessage]);

  return {
    results,
    isScanning,
    scan,
    zoomToFrame,
    close,
  };
}
