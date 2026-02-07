interface LibraryComponent {
  id: string;
  name: string;
  description: string;
  fileKey: string;
  fileUrl: string;
}

interface LibraryMatch {
  componentId: string;
  componentName: string;
  similarity: number;
  fileKey: string;
  fileUrl: string;
}

interface Props {
  componentUsage: LibraryComponent[];
  nameMatches: LibraryComponent[];
  libraryMatches: LibraryMatch[];
  onOpenInFigma: (url: string) => void;
}

function buildNodeUrl(fileKey: string, nodeId: string): string {
  const encodedNodeId = nodeId.replace(':', '-');
  return `https://www.figma.com/design/${fileKey}?node-id=${encodedNodeId}`;
}

function similarityColor(sim: number): string {
  if (sim >= 80) return 'text-green-700 bg-green-50';
  if (sim >= 60) return 'text-blue-700 bg-blue-50';
  if (sim >= 40) return 'text-amber-700 bg-amber-50';
  return 'text-gray-600 bg-gray-50';
}

export function MatchDetails({
  componentUsage,
  nameMatches,
  libraryMatches,
  onOpenInFigma,
}: Props) {
  if (componentUsage.length === 0 && nameMatches.length === 0 && libraryMatches.length === 0) {
    return null;
  }

  return (
    <div className="mt-2 flex flex-col gap-2">
      {/* Structural library matches */}
      {libraryMatches.length > 0 && (
        <div className="pl-3 border-l-2 border-purple-400">
          <p className="text-xs font-medium text-purple-700 mb-1">
            Structurally similar to:
          </p>
          <div className="flex flex-col gap-1">
            {libraryMatches.map((match) => (
              <button
                key={match.componentId}
                onClick={() => onOpenInFigma(buildNodeUrl(match.fileKey, match.componentId))}
                className="flex items-center justify-between text-xs text-left hover:bg-purple-50 rounded px-1 py-0.5 transition-colors"
              >
                <span className="text-purple-600 hover:underline truncate">
                  {match.componentName}
                </span>
                <span
                  className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap ${similarityColor(match.similarity)}`}
                >
                  {match.similarity}%
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Component usage (by name) */}
      {componentUsage.length > 0 && (
        <div className="pl-3 border-l-2 border-blue-400">
          <p className="text-xs font-medium text-blue-700 mb-1">
            Uses {componentUsage.length} library component
            {componentUsage.length > 1 ? 's' : ''}:
          </p>
          <div className="flex flex-wrap gap-1">
            {componentUsage.map((comp) => (
              <button
                key={comp.id}
                onClick={() => onOpenInFigma(buildNodeUrl(comp.fileKey, comp.id))}
                className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded hover:bg-blue-100"
                title={comp.description || comp.name}
              >
                {comp.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Fuzzy name matches */}
      {nameMatches.length > 0 && (
        <div className="pl-3 border-l-2 border-amber-400">
          <p className="text-xs font-medium text-amber-700 mb-1">
            Similar to documented pattern{nameMatches.length > 1 ? 's' : ''}:
          </p>
          {nameMatches.map((match) => (
            <button
              key={match.id}
              onClick={() => onOpenInFigma(buildNodeUrl(match.fileKey, match.id))}
              className="block text-xs text-amber-600 hover:underline text-left"
            >
              {match.name}
              {match.description && (
                <span className="text-gray-400 ml-1">
                  — {match.description.slice(0, 50)}
                  {match.description.length > 50 ? '...' : ''}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
