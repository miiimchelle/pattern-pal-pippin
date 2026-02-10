import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { usePluginMessages } from './usePluginMessages';

// Mock parent.postMessage
const postMessageSpy = vi.fn();
Object.defineProperty(window, 'parent', {
  value: { postMessage: postMessageSpy },
  writable: true,
});

function simulatePluginMessage(type: string, payload?: unknown) {
  const event = new MessageEvent('message', {
    data: { pluginMessage: { type, payload } },
  });
  window.dispatchEvent(event);
}

describe('usePluginMessages', () => {
  beforeEach(() => {
    postMessageSpy.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('posts load-settings on mount', () => {
    renderHook(() => usePluginMessages());
    expect(postMessageSpy).toHaveBeenCalledWith(
      { pluginMessage: { type: 'load-settings', payload: undefined } },
      '*',
    );
  });

  it('initializes with default state', () => {
    const { result } = renderHook(() => usePluginMessages());
    expect(result.current.results).toEqual([]);
    expect(result.current.selectedFrameScanResult).toBeNull();
    expect(result.current.isScanningFrame).toBe(false);
    expect(result.current.isScanningTeam).toBe(false);
    expect(result.current.settings).toEqual({ token: '', libraryUrls: [], teamId: '' });
    expect(result.current.showSettings).toBe(false);
    expect(result.current.frameError).toBeNull();
    expect(result.current.teamError).toBeNull();
  });

  it('handles settings-loaded message', () => {
    const { result } = renderHook(() => usePluginMessages());
    act(() => {
      simulatePluginMessage('settings-loaded', { token: 'abc', libraryUrls: [], teamId: '1' });
    });
    expect(result.current.settings).toEqual({ token: 'abc', libraryUrls: [], teamId: '1' });
  });

  it('handles selection-change message', () => {
    const { result } = renderHook(() => usePluginMessages());
    const detail = { id: 'f1', name: 'Frame', width: 100, height: 200 };
    act(() => {
      simulatePluginMessage('selection-change', detail);
    });
    expect(result.current.selectedFrame).toEqual(detail);
  });

  it('handles scan-file-results message', () => {
    const { result } = renderHook(() => usePluginMessages());
    const scanResult = { selectedFrame: {}, teamFileResults: [], libraryMatches: [], overallConsistency: 80, ruleIssues: [] };
    act(() => {
      result.current.scan();
    });
    act(() => {
      simulatePluginMessage('scan-file-results', scanResult);
    });
    expect(result.current.selectedFrameScanResult).toEqual(scanResult);
    expect(result.current.isScanningFrame).toBe(false);
  });

  it('handles scan-results message', () => {
    const { result } = renderHook(() => usePluginMessages());
    const groups = [{ fingerprint: 'fp', frames: [], consistency: 90 }];
    act(() => {
      result.current.scanTeam();
    });
    act(() => {
      simulatePluginMessage('scan-results', groups);
    });
    expect(result.current.results).toEqual(groups);
    expect(result.current.isScanningTeam).toBe(false);
  });

  it('scan sets isScanningFrame and posts message', () => {
    const { result } = renderHook(() => usePluginMessages());
    act(() => {
      result.current.scan();
    });
    expect(result.current.isScanningFrame).toBe(true);
    expect(postMessageSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        pluginMessage: expect.objectContaining({ type: 'scan' }),
      }),
      '*',
    );
  });

  it('scanTeam sets isScanningTeam and posts message', () => {
    const { result } = renderHook(() => usePluginMessages());
    act(() => {
      result.current.scanTeam();
    });
    expect(result.current.isScanningTeam).toBe(true);
    expect(postMessageSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        pluginMessage: expect.objectContaining({ type: 'scan-team' }),
      }),
      '*',
    );
  });

  it('handles error during frame scan', () => {
    const { result } = renderHook(() => usePluginMessages());
    act(() => {
      result.current.scan();
    });
    act(() => {
      simulatePluginMessage('error', 'Something broke');
    });
    expect(result.current.frameError).toBe('Something broke');
    expect(result.current.isScanningFrame).toBe(false);
  });

  it('handles error during team scan', () => {
    const { result } = renderHook(() => usePluginMessages());
    act(() => {
      result.current.scanTeam();
    });
    act(() => {
      simulatePluginMessage('error', 'Team error');
    });
    expect(result.current.teamError).toBe('Team error');
    expect(result.current.isScanningTeam).toBe(false);
  });

  it('saveSettings updates state and posts message', () => {
    const { result } = renderHook(() => usePluginMessages());
    act(() => {
      result.current.saveSettings('tok', ['url1'], '42');
    });
    expect(result.current.settings).toEqual({ token: 'tok', libraryUrls: ['url1'], teamId: '42' });
    expect(result.current.showSettings).toBe(false);
    expect(postMessageSpy).toHaveBeenCalledWith(
      { pluginMessage: { type: 'save-settings', payload: { token: 'tok', libraryUrls: ['url1'], teamId: '42' } } },
      '*',
    );
  });

  it('zoomToFrame posts message', () => {
    const { result } = renderHook(() => usePluginMessages());
    act(() => {
      result.current.zoomToFrame('frame-1');
    });
    expect(postMessageSpy).toHaveBeenCalledWith(
      { pluginMessage: { type: 'zoom-to-frame', payload: 'frame-1' } },
      '*',
    );
  });

  it('inspectFrame posts message', () => {
    const { result } = renderHook(() => usePluginMessages());
    act(() => {
      result.current.inspectFrame('frame-2');
    });
    expect(postMessageSpy).toHaveBeenCalledWith(
      { pluginMessage: { type: 'inspect-frame', payload: 'frame-2' } },
      '*',
    );
  });

  it('openInFigma posts message', () => {
    const { result } = renderHook(() => usePluginMessages());
    act(() => {
      result.current.openInFigma('https://figma.com/file/abc');
    });
    expect(postMessageSpy).toHaveBeenCalledWith(
      { pluginMessage: { type: 'open-url', payload: 'https://figma.com/file/abc' } },
      '*',
    );
  });

  it('close posts message', () => {
    const { result } = renderHook(() => usePluginMessages());
    act(() => {
      result.current.close();
    });
    expect(postMessageSpy).toHaveBeenCalledWith(
      { pluginMessage: { type: 'close', payload: undefined } },
      '*',
    );
  });

  it('ignores messages without pluginMessage', () => {
    const { result } = renderHook(() => usePluginMessages());
    act(() => {
      window.dispatchEvent(new MessageEvent('message', { data: {} }));
    });
    expect(result.current.results).toEqual([]);
  });

  it('handles scan-progress during frame scan', () => {
    const { result } = renderHook(() => usePluginMessages());
    act(() => {
      result.current.scan();
    });
    act(() => {
      simulatePluginMessage('scan-progress', { current: 2, total: 5, fileName: 'File A' });
    });
    expect(result.current.frameScanProgress).toEqual({ current: 2, total: 5, fileName: 'File A' });
  });

  it('testConnection posts message and sets isTestingConnection', () => {
    const { result } = renderHook(() => usePluginMessages());
    act(() => {
      result.current.testConnection('tok', '42');
    });
    expect(result.current.isTestingConnection).toBe(true);
    expect(postMessageSpy).toHaveBeenCalledWith(
      { pluginMessage: { type: 'test-connection', payload: { token: 'tok', teamId: '42' } } },
      '*',
    );
  });

  it('handles test-connection-result message', () => {
    const { result } = renderHook(() => usePluginMessages());
    act(() => {
      result.current.testConnection('tok', '42');
    });
    act(() => {
      simulatePluginMessage('test-connection-result', {
        tokenValid: true,
        teamIdValid: true,
        userName: 'alice',
        error: '',
      });
    });
    expect(result.current.isTestingConnection).toBe(false);
    expect(result.current.connectionTest).toEqual({
      tokenValid: true,
      teamIdValid: true,
      userName: 'alice',
      error: '',
    });
  });

  it('handles scan-progress during team scan', () => {
    const { result } = renderHook(() => usePluginMessages());
    act(() => {
      result.current.scanTeam();
    });
    act(() => {
      simulatePluginMessage('scan-progress', { current: 3, total: 10, fileName: 'File B' });
    });
    expect(result.current.teamScanProgress).toEqual({ current: 3, total: 10, fileName: 'File B' });
  });

  it('cancelScan posts cancel-scan message', () => {
    const { result } = renderHook(() => usePluginMessages());
    act(() => {
      result.current.cancelScan();
    });
    expect(postMessageSpy).toHaveBeenCalledWith(
      { pluginMessage: { type: 'cancel-scan', payload: undefined } },
      '*',
    );
  });

  it('handles scan-cancelled during frame scan', () => {
    const { result } = renderHook(() => usePluginMessages());
    act(() => {
      result.current.scan();
    });
    expect(result.current.isScanningFrame).toBe(true);
    act(() => {
      simulatePluginMessage('scan-cancelled', { partial: true });
    });
    expect(result.current.isScanningFrame).toBe(false);
    expect(result.current.frameScanProgress).toBeNull();
  });

  it('handles scan-cancelled during team scan', () => {
    const { result } = renderHook(() => usePluginMessages());
    act(() => {
      result.current.scanTeam();
    });
    expect(result.current.isScanningTeam).toBe(true);
    act(() => {
      simulatePluginMessage('scan-cancelled', { partial: true });
    });
    expect(result.current.isScanningTeam).toBe(false);
    expect(result.current.teamScanProgress).toBeNull();
  });

  it('posts load-rules on mount', () => {
    renderHook(() => usePluginMessages());
    expect(postMessageSpy).toHaveBeenCalledWith(
      { pluginMessage: { type: 'load-rules', payload: undefined } },
      '*',
    );
  });

  it('handles rules-loaded message', () => {
    const { result } = renderHook(() => usePluginMessages());
    const rules = [{ id: 'r1', name: 'Rule 1', description: 'desc', enabled: true }];
    act(() => {
      simulatePluginMessage('rules-loaded', rules);
    });
    expect(result.current.rules).toEqual(rules);
  });

  it('saveRules updates rules and posts message', () => {
    const { result } = renderHook(() => usePluginMessages());
    const rules = [{ id: 'r1', name: 'Rule 1', description: 'desc', enabled: false }];
    act(() => {
      result.current.saveRules(rules);
    });
    expect(result.current.rules).toEqual(rules);
    expect(postMessageSpy).toHaveBeenCalledWith(
      { pluginMessage: { type: 'save-rules', payload: rules } },
      '*',
    );
  });

  it('scan sends settings and enabled rule IDs', () => {
    const { result } = renderHook(() => usePluginMessages());
    const rules = [
      { id: 'r1', name: 'Rule 1', description: 'desc', enabled: true },
      { id: 'r2', name: 'Rule 2', description: 'desc', enabled: false },
    ];
    act(() => {
      simulatePluginMessage('rules-loaded', rules);
    });
    act(() => {
      result.current.scan();
    });
    expect(postMessageSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        pluginMessage: expect.objectContaining({
          type: 'scan',
          payload: expect.objectContaining({
            enabledRules: ['r1'],
          }),
        }),
      }),
      '*',
    );
  });
});
