import type { TeamFileResult } from '../hooks/usePluginMessages';

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

function buildNodeUrl(fileKey: string, nodeId: string): string {
  const encodedNodeId = nodeId.replace(':', '-');
  return `https://www.figma.com/design/${fileKey}?node-id=${encodedNodeId}`;
}

interface Props {
  fileResults: TeamFileResult[];
  onOpenInFigma: (url: string) => void;
}

export function TeamFileResults({ fileResults, onOpenInFigma }: Props) {
  if (fileResults.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        No similar frames found in other team files.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      {fileResults.map((file) => (
        <div key={file.fileKey} className="border border-gray-200 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => onOpenInFigma(`https://www.figma.com/file/${file.fileKey}`)}
              className="text-sm font-medium text-gray-700 hover:text-blue-600 truncate text-left"
              title={`Open ${file.fileName} in Figma`}
            >
              {file.fileName}
            </button>
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ml-2 ${consistencyColor(file.consistency)}`}
              title="Structural consistency between frames within the team files"
            >
              {file.consistency}% consistent
            </span>
          </div>

          <div className="flex flex-col gap-1">
            {file.matches.map((match) => (
              <button
                key={`${match.teamFrameId}-${match.localFrameId}`}
                onClick={() => onOpenInFigma(buildNodeUrl(file.fileKey, match.teamFrameId))}
                className="text-left px-2 py-1.5 text-sm hover:bg-blue-50 rounded transition-colors flex items-center justify-between gap-2"
              >
                <div className="flex flex-col min-w-0">
                  <span className="truncate text-gray-700">{match.teamFrameName}</span>
                  <span className="text-[11px] text-gray-400 truncate">
                    matches {match.localFrameName}
                  </span>
                </div>
                <span
                  className={`text-xs font-semibold px-1.5 py-0.5 rounded whitespace-nowrap shrink-0 ${similarityColor(match.similarity)}`}
                >
                  {match.similarity}%
                </span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
