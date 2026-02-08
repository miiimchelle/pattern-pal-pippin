import { useState } from 'react';
import { usePluginMessages, type PatternGroup, type SelectedFrameScanResult, type ScanProgress } from './hooks/usePluginMessages';
import { PatternResults } from './components/PatternResults';
import { SelectedFrameScanResults } from './components/SelectedFrameScanResults';
import { FrameDetailPanel } from './components/FrameDetailPanel';
import { Settings } from './components/Settings';
import { Pippin, type PippinStatus } from './components/Pippin';
import { ErrorBoundary } from './components/ErrorBoundary';

// ---- Helpers ----

function healthStatusLabel(c: number): string {
  if (c >= 85) return 'Excellent';
  if (c >= 70) return 'Good';
  if (c >= 55) return 'Fair';
  return 'Needs improvement';
}

function healthColorClass(c: number): string {
  if (c >= 70) return 'health-good';
  if (c >= 55) return 'health-fair';
  return 'health-poor';
}

// Derive a team-comparison percentage from team file results
function deriveTeamPercentage(result: SelectedFrameScanResult | null): number | null {
  if (!result) return null;
  const { teamFileResults } = result;
  if (teamFileResults.length === 0) return null;
  const filesWithMatches = teamFileResults.filter((f) => f.matches.length > 0).length;
  return Math.round((filesWithMatches / teamFileResults.length) * 100);
}

// Count "findings" (low-similarity library matches or low-consistency team matches)
function countFindings(result: SelectedFrameScanResult | null): number {
  if (!result) return 0;
  let count = 0;
  for (const lib of result.libraryMatches) {
    if (lib.similarity < 70) count++;
  }
  for (const tf of result.teamFileResults) {
    for (const m of tf.matches) {
      if (m.similarity < 70) count++;
    }
  }
  count += (result.buttonIssues ?? []).length;
  return count;
}

// ---- Pippin widget (unchanged logic) ----

function PippinWidget({
  isScanning,
  scanProgress,
  error,
  selectedFrameScanResult,
  results,
}: {
  isScanning: boolean;
  scanProgress: ScanProgress | null;
  error: string | null;
  selectedFrameScanResult: SelectedFrameScanResult | null;
  results: PatternGroup[];
}) {
  let status: PippinStatus = 'idle';
  let consistency: number | null = null;

  if (error) {
    status = 'error';
  } else if (isScanning) {
    status = scanProgress ? 'checking' : 'loading';
  } else if (selectedFrameScanResult) {
    status = 'success';
    consistency = selectedFrameScanResult.overallConsistency;
  } else if (results.length > 0) {
    status = 'success';
    consistency = null;
  }

  return <Pippin status={status} overallConsistency={consistency} />;
}

// ---- Overall Health block ----

function OverallHealth({ result }: { result: SelectedFrameScanResult | null }) {
  const hasResult = result != null;
  const c = result?.overallConsistency ?? 0;
  const colorCls = hasResult ? healthColorClass(c) : 'health-neutral';
  const valueText = hasResult ? `${c}%` : '\u2014';
  const statusText = hasResult ? healthStatusLabel(c) : '';

  return (
    <div className="text-center">
      <div className="overall-health-label">Overall Health</div>
      <div className={`overall-health-value ${colorCls}`}>{valueText}</div>
      {statusText && <div className={`overall-health-status ${colorCls}`}>{statusText}</div>}
    </div>
  );
}

// ---- Alert ----

function TeamAlert({ result }: { result: SelectedFrameScanResult | null }) {
  const pct = deriveTeamPercentage(result);
  if (pct == null) return null;

  return (
    <div className="alert">
      <div className="alert-body">
        You have used similar patterns as <strong>{pct}% of other teams</strong>.
        We will share this feedback to the design system team for improvement!
      </div>
    </div>
  );
}

// ---- Violations Found header ----

function ViolationsHeader({ count }: { count: number }) {
  return (
    <div className="violations-header">
      <span>Findings</span>
      <span className="status-count">{count}</span>
    </div>
  );
}

// ---- Main App ----

function App() {
  const {
    results,
    selectedFrameScanResult,
    isScanning,
    scanProgress,
    selectedFrame,
    settings,
    showSettings,
    setShowSettings,
    error,
    scan,
    scanTeam,
    zoomToFrame,
    inspectFrame,
    openInFigma,
    saveSettings,
  } = usePluginMessages();

  const [selectedGroup, setSelectedGroup] = useState<PatternGroup | null>(null);
  const [selectedFrameName, setSelectedFrameName] = useState<string | null>(null);

  const handleFrameClick = (frameId: string, fileKey: string | undefined, group: PatternGroup) => {
    setSelectedGroup(group);
    const clickedFrame = group.frames.find((f) => f.id === frameId);
    setSelectedFrameName(clickedFrame?.name || null);
    if (fileKey) {
      openInFigma(`https://www.figma.com/file/${fileKey}`);
    } else {
      zoomToFrame(frameId);
      inspectFrame(frameId);
    }
  };

  const handleBackFromDetail = () => {
    setSelectedGroup(null);
    setSelectedFrameName(null);
  };

  const findingsCount = countFindings(selectedFrameScanResult);

  return (
    <ErrorBoundary>
    <div className="h-screen bg-white flex flex-col pattern-pal-body">
      {/* ---- Header ---- */}
      <header className="p-4 border-b border-gray-200 flex items-start justify-between">
        <div>
          <h1 className="pattern-pal-h1">Pattern Pal</h1>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="text-gray-400 hover:text-gray-600 p-1"
          title="Settings"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </button>
      </header>

      {showSettings ? (
        <Settings
          token={settings.token}
          libraryUrls={settings.libraryUrls}
          teamId={settings.teamId}
          onSave={saveSettings}
          onBack={() => setShowSettings(false)}
        />
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* ---- Top section (non-scrolling, 3:7 ratio) ---- */}
          <div className="px-4 pt-1 pb-1 flex flex-col gap-1 text-center overflow-hidden" style={{ flex: 2 }}>
            {/* Pippin sprite (kept as-is) */}
            <PippinWidget
              isScanning={isScanning}
              scanProgress={scanProgress}
              error={error}
              selectedFrameScanResult={selectedFrameScanResult}
              results={results}
            />

            {/* Overall Health */}
            <OverallHealth result={selectedFrameScanResult} />

            {/* Alert — team comparison */}
            <TeamAlert result={selectedFrameScanResult} />

            {/* Settings prompt alert (when no token/teamId) */}
            {(!settings.token || !settings.teamId) && (
              <div className="alert">
                <div className="alert-body">
                  Add your Figma token and Team ID in settings to scan and compare against other team files
                </div>
              </div>
            )}

            {/* Findings header */}
            {selectedFrameScanResult && (
              <ViolationsHeader count={findingsCount} />
            )}

            {/* Primary + Secondary CTAs — inline */}
            <div className="flex gap-2">
              <button
                onClick={scan}
                disabled={isScanning || !selectedFrame}
                className="pattern-pal-btn"
                title="Scan selected frame and compare to team files and design library"
              >
                {isScanning && !scanProgress ? 'Checking...' : 'Run Check'}
              </button>

              {settings.teamId && settings.token && (
                <button
                  onClick={scanTeam}
                  disabled={isScanning}
                  className="pattern-pal-btn-secondary"
                >
                  {isScanning && scanProgress ? 'Scanning Team...' : 'Scan Team Files'}
                </button>
              )}
            </div>

            {!selectedFrame && (
              <p className="text-xs text-gray-500 -mt-1">Select a frame to scan.</p>
            )}

            {/* Scan progress */}
            {scanProgress && (
              <div className="mt-1">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span className="truncate mr-2">{scanProgress.fileName}</span>
                  <span className="shrink-0">{scanProgress.current}/{scanProgress.total}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div
                    className="bg-indigo-500 h-1.5 rounded-full transition-all"
                    style={{ width: `${Math.round((scanProgress.current / scanProgress.total) * 100)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Error — shown as empty-state style */}
            {error && (
              <div className="empty-state">
                <div className="empty-state-icon">&#9888;&#65039;</div>
                <div className="empty-state-title">Check failed</div>
                <div className="empty-state-description">{error}</div>
              </div>
            )}

          </div>

          {/* ---- Scrollable results area (7:3 ratio) ---- */}
          <div className="overflow-auto" style={{ flex: 3 }}>
            {isScanning && !scanProgress && !error && (
              <div className="loading">Scanning design file...</div>
            )}
            {!isScanning && selectedGroup ? (
              <FrameDetailPanel
                frame={selectedFrame}
                group={selectedGroup}
                frameName={selectedFrameName || undefined}
                onBack={handleBackFromDetail}
                onOpenInFigma={openInFigma}
              />
            ) : !isScanning && selectedFrameScanResult ? (
              <SelectedFrameScanResults
                result={selectedFrameScanResult}
                onOpenInFigma={openInFigma}
                onZoomToFrame={zoomToFrame}
              />
            ) : !isScanning ? (
              <PatternResults
                groups={results}
                onFrameClick={handleFrameClick}
                onOpenInFigma={openInFigma}
              />
            ) : null}
          </div>
        </div>
      )}
    </div>
    </ErrorBoundary>
  );
}

export default App;
