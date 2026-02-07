import type { LibraryFrame } from '../hooks/usePluginMessages';

interface Props {
  matches: LibraryFrame[];
  onOpenInFigma: (url: string) => void;
}

export function LibraryMatch({ matches, onOpenInFigma }: Props) {
  if (matches.length === 0) return null;

  return (
    <div className="mt-2 pl-3 border-l-2 border-green-400">
      <p className="text-xs font-medium text-green-700 mb-1">Library matches:</p>
      {matches.map((match) => (
        <button
          key={`${match.fileUrl}-${match.id}`}
          onClick={() => onOpenInFigma(match.fileUrl)}
          className="block text-xs text-green-600 hover:underline"
        >
          {match.fileName} → {match.name}
        </button>
      ))}
    </div>
  );
}
