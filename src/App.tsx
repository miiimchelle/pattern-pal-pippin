import { useState } from 'react';
import { usePluginMessages } from './hooks/usePluginMessages';
import { PatternResults } from './components/PatternResults';
import { FrameDetailPanel } from './components/FrameDetailPanel';
import { ComponentReference } from './components/ComponentReference';

type Tab = 'patterns' | 'reference';

function App() {
  const { results, isScanning, selectedFrame, scan, zoomToFrame, inspectFrame, openUrl } =
    usePluginMessages();
  const [tab, setTab] = useState<Tab>('patterns');

  const handleFrameClick = (frameId: string) => {
    zoomToFrame(frameId);
    inspectFrame(frameId);
    setTab('reference');
  };

  return (
    <div className="h-screen bg-white flex flex-col">
      <header className="p-4 border-b border-gray-200">
        <h1 className="text-lg font-semibold">Pattern Pal</h1>
        <p className="text-sm text-gray-500">Find similar patterns in your designs</p>
      </header>

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
          </div>
          <div className="flex-1 overflow-auto">
            <PatternResults groups={results} onFrameClick={handleFrameClick} />
          </div>
        </div>
      )}

      {tab === 'reference' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <FrameDetailPanel frame={selectedFrame} />
          <ComponentReference onOpenUrl={openUrl} />
        </div>
      )}
    </div>
  );
}

export default App;
