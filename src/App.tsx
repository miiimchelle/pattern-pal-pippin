import { usePluginMessages } from './hooks/usePluginMessages';
import { PatternResults } from './components/PatternResults';

function App() {
  const { results, isScanning, scan, zoomToFrame } = usePluginMessages();

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="p-4 border-b border-gray-200">
        <h1 className="text-lg font-semibold">Pattern Pal</h1>
        <p className="text-sm text-gray-500">Find similar patterns in your designs</p>
      </header>

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
        <PatternResults groups={results} onFrameClick={zoomToFrame} />
      </div>
    </div>
  );
}

export default App;
