import { useState, useMemo } from 'react'
import {
  usePluginMessages,
  type PatternGroup,
  type SelectedFrameScanResult,
  type ScanProgress,
} from './hooks/usePluginMessages'
import { PatternResults } from './components/PatternResults'
import { SelectedFrameScanResults } from './components/SelectedFrameScanResults'
import { FrameDetailPanel } from './components/FrameDetailPanel'
import { Settings } from './components/Settings'
import { RulesPanel } from './components/RulesPanel'
import { ResultsFilterBar, DEFAULT_FILTER, type FilterState } from './components/ResultsFilterBar'
import { Pippin, type PippinStatus } from './components/Pippin'
import { ErrorBoundary } from './components/ErrorBoundary'
import { exportFrameScanToMarkdown, exportTeamScanToMarkdown } from './utils/exportResults'

// ---- Helpers ----

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

// Count "findings" (low-similarity library matches or low-consistency team matches)
function countFindings(result: SelectedFrameScanResult | null): number {
  if (!result) return 0
  let count = 0
  for (const lib of result.libraryMatches) {
    if (lib.similarity < 70) count++
  }
  for (const tf of result.teamFileResults) {
    for (const m of tf.matches) {
      if (m.similarity < 70) count++
    }
  }
  count += (result.ruleIssues ?? []).length
  return count
}

// ---- Pippin widget ----

function PippinWidget({
  isScanning,
  scanProgress,
  error,
  selectedFrameScanResult,
  results,
}: {
  isScanning: boolean
  scanProgress: ScanProgress | null
  error: string | null
  selectedFrameScanResult: SelectedFrameScanResult | null
  results: PatternGroup[]
}) {
  let status: PippinStatus = 'idle'
  let consistency: number | null = null

  if (error) {
    status = 'error'
  } else if (isScanning) {
    status = scanProgress ? 'checking' : 'loading'
  } else if (selectedFrameScanResult) {
    status = 'success'
    consistency = selectedFrameScanResult.overallConsistency
  } else if (results.length > 0) {
    status = 'success'
    const avg = results.reduce((sum, g) => sum + g.consistency, 0) / results.length
    consistency = Math.round(avg)
  }

  return <Pippin status={status} overallConsistency={consistency} />
}

// ---- Violations Found header ----

function ViolationsHeader({ count }: { count: number }) {
  return (
    <div className="violations-header">
      <span>Findings</span>
      <span className="status-count">{count}</span>
    </div>
  )
}

// ---- Main App ----

function App() {
  const {
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
    warning,
    dismissWarning,
  } = usePluginMessages()

  const [selectedGroup, setSelectedGroup] = useState<PatternGroup | null>(null)
  const [selectedFrameName, setSelectedFrameName] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'frame' | 'team'>('frame')
  const [frameFilter, setFrameFilter] = useState<FilterState>(DEFAULT_FILTER)
  const [teamFilter, setTeamFilter] = useState<FilterState>(DEFAULT_FILTER)

  const handleFrameClick = (frameId: string, fileKey: string | undefined, group: PatternGroup) => {
    setSelectedGroup(group)
    const clickedFrame = group.frames.find((f) => f.id === frameId)
    setSelectedFrameName(clickedFrame?.name || null)
    if (fileKey) {
      openInFigma(`https://www.figma.com/file/${fileKey}`)
    } else {
      zoomToFrame(frameId)
      inspectFrame(frameId)
    }
  }

  const handleBackFromDetail = () => {
    setSelectedGroup(null)
    setSelectedFrameName(null)
  }

  const findingsCount = countFindings(selectedFrameScanResult)

  // Filtered frame scan results (filter team file matches within the result)
  const filteredFrameResult = useMemo((): SelectedFrameScanResult | null => {
    if (!selectedFrameScanResult) return null
    const f = frameFilter
    let teamFileResults = selectedFrameScanResult.teamFileResults
    if (f.searchText) {
      const q = f.searchText.toLowerCase()
      teamFileResults = teamFileResults.filter((r) => r.fileName.toLowerCase().includes(q))
    }
    if (f.minConsistency > 0) {
      teamFileResults = teamFileResults.filter((r) => r.consistency >= f.minConsistency)
    }
    const dir = f.sortDir === 'asc' ? 1 : -1
    teamFileResults = [...teamFileResults].sort((a, b) => {
      if (f.sortBy === 'name') return a.fileName.localeCompare(b.fileName) * dir
      return (a.consistency - b.consistency) * dir
    })
    return { ...selectedFrameScanResult, teamFileResults }
  }, [selectedFrameScanResult, frameFilter])

  // Filtered team scan results
  const filteredTeamResults = useMemo((): PatternGroup[] => {
    const f = teamFilter
    let groups = results
    if (f.searchText) {
      const q = f.searchText.toLowerCase()
      groups = groups.filter((g) =>
        g.frames.some(
          (fr) => fr.name.toLowerCase().includes(q) || (fr.fileName || '').toLowerCase().includes(q)
        )
      )
    }
    if (f.minConsistency > 0) {
      groups = groups.filter((g) => g.consistency >= f.minConsistency)
    }
    const dir = f.sortDir === 'asc' ? 1 : -1
    groups = [...groups].sort((a, b) => {
      if (f.sortBy === 'name')
        return (a.frames[0]?.name || '').localeCompare(b.frames[0]?.name || '') * dir
      if (f.sortBy === 'frames') return (a.frames.length - b.frames.length) * dir
      return (a.consistency - b.consistency) * dir
    })
    return groups
  }, [results, teamFilter])

  const isScanning = activeTab === 'frame' ? isScanningFrame : isScanningTeam
  const scanProgress = activeTab === 'frame' ? frameScanProgress : teamScanProgress
  const error = activeTab === 'frame' ? frameError : teamError

  return (
    <ErrorBoundary>
      <div className="h-screen bg-white flex flex-col pattern-pal-body">
        {/* ---- Header ---- */}
        <header className="h-fit max-h-[50px] p-4 border-b border-gray-200 flex items-start justify-between">
          <div>
            <h1 className="pattern-pal-h1">Pattern Pal</h1>
          </div>
          <nav className="flex items-center gap-1" aria-label="Plugin controls">
            <button
              onClick={() => {
                setShowRules(!showRules)
                setShowSettings(false)
              }}
              className="text-gray-400 hover:text-gray-600 p-1"
              aria-label="Design Rules"
              aria-pressed={showRules}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                />
              </svg>
            </button>
            <button
              onClick={() => {
                setShowSettings(!showSettings)
                setShowRules(false)
              }}
              className="text-gray-400 hover:text-gray-600 p-1"
              aria-label="Settings"
              aria-pressed={showSettings}
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
          </nav>
        </header>

        {showSettings ? (
          <Settings
            token={settings.token}
            libraryUrls={settings.libraryUrls}
            teamId={settings.teamId}
            onSave={saveSettings}
            onBack={() => setShowSettings(false)}
            onTestConnection={testConnection}
            connectionTest={connectionTest}
            isTestingConnection={isTestingConnection}
          />
        ) : showRules ? (
          <RulesPanel rules={rules} onSave={saveRules} onBack={() => setShowRules(false)} />
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* ---- Tab bar ---- */}
            <div className="pattern-pal-tabs" role="tablist" aria-label="Scan mode">
              <button
                role="tab"
                id="tab-frame"
                aria-selected={activeTab === 'frame'}
                aria-controls="tabpanel-frame"
                tabIndex={activeTab === 'frame' ? 0 : -1}
                className={`pattern-pal-tab ${activeTab === 'frame' ? 'pattern-pal-tab-active' : ''}`}
                onClick={() => setActiveTab('frame')}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowRight') {
                    setActiveTab('team')
                    ;(e.currentTarget.nextElementSibling as HTMLElement)?.focus()
                  }
                }}
              >
                Scan frame
              </button>
              <button
                role="tab"
                id="tab-team"
                aria-selected={activeTab === 'team'}
                aria-controls="tabpanel-team"
                tabIndex={activeTab === 'team' ? 0 : -1}
                className={`pattern-pal-tab ${activeTab === 'team' ? 'pattern-pal-tab-active' : ''}`}
                onClick={() => setActiveTab('team')}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowLeft') {
                    setActiveTab('frame')
                    ;(e.currentTarget.previousElementSibling as HTMLElement)?.focus()
                  }
                }}
              >
                Scan team files
              </button>
            </div>

            {/* ---- Top section (non-scrolling) ---- */}
            <div className="px-4 pt-4 pb-4 flex flex-col gap-1 text-center">
              {/* Pippin sprite */}
              <PippinWidget
                isScanning={isScanning}
                scanProgress={scanProgress}
                error={error}
                selectedFrameScanResult={activeTab === 'frame' ? selectedFrameScanResult : null}
                results={activeTab === 'team' ? results : []}
              />

              {activeTab === 'frame' ? (
                <>
                  {/* Findings header */}
                  {selectedFrameScanResult && <ViolationsHeader count={findingsCount} />}

                  {/* Primary CTA */}
                  {isScanningFrame ? (
                    <button
                      onClick={cancelScan}
                      className="pattern-pal-btn-secondary w-full"
                      aria-label="Cancel frame scan"
                    >
                      Cancel
                    </button>
                  ) : (
                    <button
                      onClick={scan}
                      disabled={!selectedFrame}
                      className="pattern-pal-btn w-full"
                      title="Scan selected frame and compare to design library"
                    >
                      Scan
                    </button>
                  )}

                  {!selectedFrame && !isScanningFrame && (
                    <p className="text-xs text-gray-500 mt-1">Select a frame to scan.</p>
                  )}

                  {/* Cache timestamp + export */}
                  {selectedFrameScanResult && !isScanningFrame && (
                    <div className="flex items-center justify-between mt-1 text-xs text-gray-400">
                      <span>
                        {cachedTimestamp ? `Last scanned ${formatTimeAgo(cachedTimestamp)}` : ''}
                      </span>
                      <div className="flex items-center gap-2">
                        {cachedTimestamp && (
                          <button
                            onClick={clearCache}
                            className="hover:text-gray-600"
                            title="Clear cache"
                          >
                            Clear
                          </button>
                        )}
                        <button
                          onClick={() =>
                            copyToClipboard(exportFrameScanToMarkdown(selectedFrameScanResult))
                          }
                          className="hover:text-gray-600"
                          aria-label="Copy results as Markdown"
                        >
                          <span aria-live="polite">{copySuccess ? 'Copied!' : 'Copy'}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* Primary CTA */}
                  {isScanningTeam ? (
                    <button
                      onClick={cancelScan}
                      className="pattern-pal-btn-secondary w-full"
                      aria-label="Cancel team scan"
                    >
                      Cancel
                    </button>
                  ) : (
                    <button
                      onClick={scanTeam}
                      disabled={!settings.token || !settings.teamId}
                      className="pattern-pal-btn w-full"
                      title="Scan and compare against other team files"
                    >
                      Scan
                    </button>
                  )}

                  {/* Export for team tab */}
                  {results.length > 0 && !isScanningTeam && (
                    <div className="flex items-center justify-end mt-1 text-xs text-gray-400">
                      <button
                        onClick={() => copyToClipboard(exportTeamScanToMarkdown(results))}
                        className="hover:text-gray-600"
                        aria-label="Copy results as Markdown"
                      >
                        <span aria-live="polite">{copySuccess ? 'Copied!' : 'Copy'}</span>
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* Scan progress (scoped to active tab) */}
              {scanProgress && (
                <div className="mt-1" role="status" aria-live="polite">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span className="truncate mr-2">{scanProgress.fileName}</span>
                    <span className="shrink-0">
                      {scanProgress.current}/{scanProgress.total}
                    </span>
                  </div>
                  <div
                    className="w-full bg-gray-200 rounded-full h-1.5"
                    role="progressbar"
                    aria-valuenow={scanProgress.current}
                    aria-valuemin={0}
                    aria-valuemax={scanProgress.total}
                    aria-label={`Scanning ${scanProgress.fileName}: ${scanProgress.current} of ${scanProgress.total}`}
                  >
                    <div
                      className="bg-indigo-500 h-1.5 rounded-full transition-all"
                      style={{
                        width: `${Math.round((scanProgress.current / scanProgress.total) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Error (scoped to active tab) */}
              {error && (
                <div className="empty-state" role="alert">
                  <div className="empty-state-icon" aria-hidden="true">
                    &#9888;&#65039;
                  </div>
                  <div className="empty-state-title">Check failed</div>
                  <div className="empty-state-description">{error}</div>
                </div>
              )}

              {/* Warning banner */}
              {warning && (
                <div
                  className="mx-4 mt-1 flex items-start gap-2 rounded border border-yellow-200 bg-yellow-50 px-3 py-2 text-xs text-yellow-800"
                  role="status"
                >
                  <span className="flex-1">{warning}</span>
                  <button
                    onClick={dismissWarning}
                    className="shrink-0 text-yellow-600 hover:text-yellow-800"
                    aria-label="Dismiss warning"
                  >
                    &times;
                  </button>
                </div>
              )}
            </div>

            {/* ---- Filter bar ---- */}
            {activeTab === 'frame' &&
              selectedFrameScanResult &&
              !isScanningFrame &&
              !selectedGroup && <ResultsFilterBar filter={frameFilter} onChange={setFrameFilter} />}
            {activeTab === 'team' && results.length > 0 && !isScanningTeam && (
              <ResultsFilterBar filter={teamFilter} onChange={setTeamFilter} showFrameSort />
            )}

            {/* ---- Scrollable results area ---- */}
            <div
              className="flex-1 overflow-auto"
              role="tabpanel"
              id={`tabpanel-${activeTab}`}
              aria-labelledby={`tab-${activeTab}`}
            >
              {activeTab === 'frame' ? (
                <>
                  {isScanningFrame && !frameScanProgress && !frameError && (
                    <div className="loading" role="status" aria-live="polite">
                      Scanning design file...
                    </div>
                  )}
                  {!isScanningFrame && selectedGroup ? (
                    <FrameDetailPanel
                      frame={selectedFrame}
                      group={selectedGroup}
                      frameName={selectedFrameName || undefined}
                      onBack={handleBackFromDetail}
                      onOpenInFigma={openInFigma}
                    />
                  ) : !isScanningFrame && filteredFrameResult ? (
                    <SelectedFrameScanResults
                      result={filteredFrameResult}
                      onOpenInFigma={openInFigma}
                      onZoomToFrame={zoomToFrame}
                    />
                  ) : null}
                </>
              ) : (
                <>
                  {/* Settings prompt (team tab, no credentials) */}
                  {(!settings.token || !settings.teamId) && !isScanningTeam && !teamError && (
                    <div className="px-4">
                      <div className="alert">
                        <div className="alert-body">
                          Add your Figma token and Team ID in settings to scan and compare against
                          other team files
                        </div>
                      </div>
                    </div>
                  )}
                  {isScanningTeam && !teamScanProgress && !teamError && (
                    <div className="loading" role="status" aria-live="polite">
                      Scanning design file...
                    </div>
                  )}
                  {!isScanningTeam ? (
                    <PatternResults
                      groups={filteredTeamResults}
                      onFrameClick={handleFrameClick}
                      onOpenInFigma={openInFigma}
                    />
                  ) : null}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  )
}

export default App
