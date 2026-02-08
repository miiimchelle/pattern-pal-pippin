import type { SelectedFrameScanResult } from '../hooks/usePluginMessages';
import { TeamFileResults } from './TeamFileResults';

function consistencyColor(c: number): string {
  if (c >= 90) return 'bg-green-100 text-green-700';
  if (c >= 75) return 'bg-blue-100 text-blue-700';
  if (c >= 60) return 'bg-amber-100 text-amber-700';
  return 'bg-red-100 text-red-700';
}

function similarityColor(sim: number): string {
  if (sim >= 80) return 'text-green-700 bg-green-50';
  if (sim >= 60) return 'text-blue-700 bg-blue-50';
  if (sim >= 40) return 'text-amber-700 bg-amber-50';
  return 'text-gray-600 bg-gray-50';
}

function buildLibraryUrl(fileKey: string, nodeId: string): string {
  const encodedNodeId = nodeId.replace(':', '-');
  return `https://www.figma.com/design/${fileKey}?node-id=${encodedNodeId}`;
}

interface Props {
  result: SelectedFrameScanResult;
  onOpenInFigma: (url: string) => void;
}

export function SelectedFrameScanResults({ result, onOpenInFigma }: Props) {
  const { selectedFrame, teamFileResults, libraryMatches, overallConsistency } = result;

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="border-b border-gray-200 pb-3">
        <h2 className="frame-name text-sm font-semibold text-gray-800 truncate" title={selectedFrame.name}>
          {selectedFrame.name}
        </h2>
        <div className="mt-1 flex items-center gap-2">
          <span className="overall-health-label">Overall consistency</span>
          <span
            className={`text-sm font-semibold px-2 py-0.5 rounded-full ${consistencyColor(overallConsistency)}`}
          >
            {overallConsistency}%
          </span>
        </div>
      </div>

      {teamFileResults.length > 0 && (
        <section>
          <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
            Team files
          </h3>
          <TeamFileResults fileResults={teamFileResults} onOpenInFigma={onOpenInFigma} />
        </section>
      )}

      {libraryMatches.length > 0 && (
        <section>
          <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
            Design library
          </h3>
          <div className="flex flex-col gap-1">
            {libraryMatches.map((match) => (
              <button
                key={match.componentId}
                onClick={() => onOpenInFigma(buildLibraryUrl(match.fileKey, match.componentId))}
                className="violation text-left px-2 py-1.5 text-sm hover:bg-blue-50 rounded transition-colors flex items-center justify-between gap-2"
              >
                <span className="truncate text-gray-700 pattern-pal-message">{match.componentName}</span>
                <span
                  className={`text-xs font-semibold px-1.5 py-0.5 rounded whitespace-nowrap shrink-0 ${similarityColor(Math.round(match.similarity))}`}
                >
                  {Math.round(match.similarity)}%
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {teamFileResults.length === 0 && libraryMatches.length === 0 && (
        <p className="text-sm text-gray-500 text-center py-4">
          No matches over 50% in team files or design library.
        </p>
      )}
    </div>
  );
}
