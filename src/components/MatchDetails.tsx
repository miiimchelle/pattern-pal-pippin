interface LibraryComponent {
  id: string;
  name: string;
  description: string;
  fileKey: string;
  fileUrl: string;
}

interface Props {
  componentUsage: LibraryComponent[];
  nameMatches: LibraryComponent[];
  onOpenInFigma: (url: string) => void;
}

function buildNodeUrl(comp: LibraryComponent): string {
  // Figma node IDs use ":" which must be URL-encoded as "-" in the URL format
  const encodedNodeId = comp.id.replace(':', '-');
  return `https://www.figma.com/design/${comp.fileKey}?node-id=${encodedNodeId}`;
}

export function MatchDetails({ componentUsage, nameMatches, onOpenInFigma }: Props) {
  if (componentUsage.length === 0 && nameMatches.length === 0) {
    return null;
  }

  return (
    <div className="mt-2 flex flex-col gap-2">
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
                onClick={() => onOpenInFigma(buildNodeUrl(comp))}
                className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded hover:bg-blue-100"
                title={comp.description || comp.name}
              >
                {comp.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {nameMatches.length > 0 && (
        <div className="pl-3 border-l-2 border-amber-400">
          <p className="text-xs font-medium text-amber-700 mb-1">
            Similar to documented pattern{nameMatches.length > 1 ? 's' : ''}:
          </p>
          {nameMatches.map((match) => (
            <button
              key={match.id}
              onClick={() => onOpenInFigma(buildNodeUrl(match))}
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
