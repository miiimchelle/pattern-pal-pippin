import type { PatternGroup } from '../hooks/usePluginMessages';
import { MatchDetails } from './MatchDetails';

interface Props {
  groups: PatternGroup[];
  onFrameClick: (frameId: string, fileKey?: string) => void;
  onOpenInFigma: (url: string) => void;
}

export function PatternResults({ groups, onFrameClick, onOpenInFigma }: Props) {
  if (groups.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        No patterns found. Try a page with more frames.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      {groups.map((group) => {
        const fileCount = new Set(group.frames.map((f) => f.fileKey || '__local__')).size;
        return (
          <div key={group.fingerprint} className="border border-gray-200 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-gray-700">
                {group.frames.length} frame{group.frames.length > 1 ? 's' : ''}
                <span className="text-gray-400 ml-2 font-normal">
                  {group.frames[0].width}×{group.frames[0].height}px
                </span>
                {fileCount >= 2 && (
                  <span className="text-indigo-500 ml-2 text-xs font-normal">
                    {fileCount} files
                  </span>
                )}
              </div>
              {group.frames.length >= 2 && (
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    group.consistency >= 90
                      ? 'bg-green-100 text-green-700'
                      : group.consistency >= 75
                        ? 'bg-blue-100 text-blue-700'
                        : group.consistency >= 60
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-red-100 text-red-700'
                  }`}
                  title="Structural consistency between frames in this group"
                >
                  {group.consistency}% consistent
                </span>
              )}
            </div>

            <div className="flex flex-col gap-1 mb-2">
              {group.frames.map((frame) => (
                <button
                  key={`${frame.fileKey || 'local'}-${frame.id}`}
                  onClick={() => onFrameClick(frame.id, frame.fileKey)}
                  className="text-left px-2 py-1 text-sm hover:bg-blue-50 rounded transition-colors flex justify-between items-center"
                >
                  <span className="truncate flex items-center gap-1.5">
                    {frame.name}
                    {frame.fileName && (
                      <span className="text-xs bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded shrink-0">
                        {frame.fileName}
                      </span>
                    )}
                  </span>
                  {frame.componentNames && frame.componentNames.length > 0 && (
                    <span className="text-xs text-gray-400 ml-2 shrink-0">
                      {frame.componentNames.length} components
                    </span>
                  )}
                </button>
              ))}
            </div>

            <MatchDetails
              componentUsage={group.componentUsage || []}
              nameMatches={group.nameMatches || []}
              libraryMatches={group.libraryMatches || []}
              onOpenInFigma={onOpenInFigma}
            />
          </div>
        );
      })}
    </div>
  );
}
