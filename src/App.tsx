import { useState } from 'react';
import { usePluginMessages, type PatternGroup, type SelectedFrameScanResult, type ScanProgress, type PushStatus } from './hooks/usePluginMessages';
import { PatternResults } from './components/PatternResults';
import { SelectedFrameScanResults } from './components/SelectedFrameScanResults';
import { FrameDetailPanel } from './components/FrameDetailPanel';
import { Settings } from './components/Settings';
import { Pippin, type PippinStatus } from './components/Pippin';

// Derive Pippin's status and consistency from app state
function PippinWidget({
  isScanning,
  scanProgress,
  error,
  selectedFrameScanResult,
  results,
  pushStatus,
}: {
  isScanning: boolean;
  scanProgress: ScanProgress | null;
  error: string | null;
  selectedFrameScanResult: SelectedFrameScanResult | null;
  results: PatternGroup[];
  pushStatus: PushStatus;
}) {
  let status: PippinStatus = 'idle';
  let consistency: number | null = null;

  if (pushStatus === 'pushing') {
    status = 'loading';
  } else if (pushStatus === 'success') {
    status = 'success';
    consistency = 95;
  } else if (error) {
    status = 'error';
  } else if (isScanning) {
    status = scanProgress ? 'checking' : 'loading';
  } else if (selectedFrameScanResult) {
    status = 'success';
    consistency = selectedFrameScanResult.overallConsistency;
  } else if (results.length > 0) {
    status = 'success';
    consistency = null; // team-scan only — generic success
  }

  return <Pippin status={status} overallConsistency={consistency} />;
}

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
    pushStatus,
    scan,
    scanTeam,
    zoomToFrame,
    inspectFrame,
    openInFigma,
    saveSettings,
    pushToDashboard,
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

  return (
    <div className="h-screen bg-white flex flex-col">
      <header className="p-4 border-b border-gray-200 flex items-start justify-between">
        <div>
          <h1 className="text-lg font-semibold">Pattern Pal</h1>
          <p className="text-sm text-gray-500">Find similar patterns in your designs</p>
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
          dashboardUrl={settings.dashboardUrl}
          onSave={saveSettings}
        />
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="p-4 flex flex-col gap-4">
            <PippinWidget
              isScanning={isScanning}
              scanProgress={scanProgress}
              error={error}
              selectedFrameScanResult={selectedFrameScanResult}
              results={results}
              pushStatus={pushStatus}
            />
            <button
              onClick={scan}
              disabled={isScanning || !selectedFrame}
              className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-medium py-2 px-4 rounded transition-colors"
              title="Scan selected frame and compare to team files and design library"
            >
              {isScanning && !scanProgress ? 'Scanning...' : 'Scan Selected Frame'}
            </button>
            {!selectedFrame && (
              <p className="text-xs text-gray-500">Select a frame to scan.</p>
            )}
            {settings.teamId && settings.token && (
              <button
                onClick={scanTeam}
                disabled={isScanning}
                className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-300 text-white font-medium py-2 px-4 rounded transition-colors"
              >
                {isScanning && scanProgress ? 'Scanning Team...' : 'Scan Team Files'}
              </button>
            )}
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
            {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
            {(!settings.token || !settings.teamId) && (
              <p className="text-xs text-amber-600 mt-1">
                Add your Figma token and Team ID in settings to scan and compare against other team files
              </p>
            )}
            {results.length > 0 && (
              <>
                <button
                  onClick={pushToDashboard}
                  disabled={pushStatus === 'pushing'}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-white font-medium py-2 px-4 rounded transition-colors"
                >
                  {pushStatus === 'pushing'
                    ? 'Pushing...'
                    : pushStatus === 'success'
                      ? 'Pushed!'
                      : pushStatus === 'error'
                        ? 'Push Failed — Retry?'
                        : 'Push to Dashboard'}
                </button>
                {pushStatus === 'success' && settings.dashboardUrl && (
                  <button
                    onClick={() => openInFigma(settings.dashboardUrl)}
                    className="w-full text-emerald-600 hover:text-emerald-700 text-sm font-medium py-1 underline underline-offset-2 transition-colors"
                  >
                    View Dashboard
                  </button>
                )}
              </>
            )}
          </div>
          <div className="flex-1 overflow-auto">
            {selectedGroup ? (
              <FrameDetailPanel
                frame={selectedFrame}
                group={selectedGroup}
                frameName={selectedFrameName || undefined}
                onBack={handleBackFromDetail}
                onOpenInFigma={openInFigma}
              />
            ) : selectedFrameScanResult ? (
              <SelectedFrameScanResults
                result={selectedFrameScanResult}
                onOpenInFigma={openInFigma}
              />
            ) : (
              <PatternResults
                groups={results}
                onFrameClick={handleFrameClick}
                onOpenInFigma={openInFigma}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
