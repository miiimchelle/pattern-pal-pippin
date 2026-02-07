import { useState } from 'react';
import { usePluginMessages } from './hooks/usePluginMessages';
import { PatternResults } from './components/PatternResults';
import { FrameDetailPanel } from './components/FrameDetailPanel';
import { ComponentReference } from './components/ComponentReference';
import { Settings } from './components/Settings';

type Tab = 'patterns' | 'reference';

function App() {
  const {
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
  } = usePluginMessages();
  const [tab, setTab] = useState<Tab>('patterns');

  const handleFrameClick = (frameId: string) => {
    zoomToFrame(frameId);
    inspectFrame(frameId);
    setTab('reference');
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
          onSave={saveSettings}
        />
      ) : (
        <>
          {/* Tab bar */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setTab('patterns')}
              className={`flex-1 text-sm py-2 font-medium transition-colors ${
                tab === 'patterns'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Patterns
            </button>
            <button
              onClick={() => setTab('reference')}
              className={`flex-1 text-sm py-2 font-medium transition-colors ${
                tab === 'reference'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Reference
            </button>
          </div>

          {/* Tab content */}
          {tab === 'patterns' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="p-4">
                <button
                  onClick={scan}
                  disabled={isScanning}
                  className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-medium py-2 px-4 rounded transition-colors"
                >
                  {isScanning ? 'Scanning...' : 'Scan Current Page'}
                </button>
                {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
                {!settings.token && (
                  <p className="text-xs text-amber-600 mt-2">
                    Add your Figma token in settings to enable library matching
                  </p>
                )}
              </div>
              <div className="flex-1 overflow-auto">
                <PatternResults
                  groups={results}
                  onFrameClick={handleFrameClick}
                  onOpenInFigma={openInFigma}
                />
              </div>
            </div>
          )}

          {tab === 'reference' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <FrameDetailPanel frame={selectedFrame} />
              <ComponentReference onOpenUrl={openInFigma} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default App;
