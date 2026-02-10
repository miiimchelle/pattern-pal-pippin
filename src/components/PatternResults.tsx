import type { PatternGroup } from '../hooks/usePluginMessages';
import { MatchDetails } from './MatchDetails';

function consistencyBadgeClass(c: number): string {
  if (c >= 90) return 'badge bg-green-50 text-green-700!';
  if (c >= 75) return 'badge bg-blue-50 text-blue-700!';
  if (c >= 60) return 'badge bg-amber-50 text-amber-700!';
  return 'badge';
}

interface Props {
  groups: PatternGroup[];
  onFrameClick: (frameId: string, fileKey: string | undefined, group: PatternGroup) => void;
  onOpenInFigma: (url: string) => void;
}

export function PatternResults({ groups, onFrameClick, onOpenInFigma }: Props) {
  if (groups.length === 0) {
    return (
      <div className="empty-state" role="status">
        <div className="empty-state-icon" aria-hidden="true"></div>
        <div className="empty-state-title">No patterns found</div>
        <div className="empty-state-description">Try a page with more frames.</div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="violations-header">
        <span>Patterns Found</span>
        <span className="status-count">{groups.length}</span>
      </div>
      <div className="violations-container">
        {groups.map((group) => {
          const fileCount = new Set(group.frames.map((f) => f.fileKey || '__local__')).size;
          return (
            <div key={group.fingerprint} className="violation">
              {/* Group header */}
              <div className="frame-name">
                <span>
                  {group.frames.length} frame{group.frames.length > 1 ? 's' : ''}
                </span>
                {group.frames.length >= 2 && (
                  <span className={consistencyBadgeClass(group.consistency)}>
                    {group.consistency}% consistent
                  </span>
                )}
              </div>
              <div className="pattern-pal-message" style={{ marginBottom: 8 }}>
                {group.frames[0].width}&times;{group.frames[0].height}px
                {fileCount >= 2 && <span> &middot; {fileCount} files</span>}
              </div>

              {/* Frame list */}
              <div className="flex flex-col gap-1 mb-2">
                {group.frames.map((frame) => (
                  <button
                    key={`${frame.fileKey || 'local'}-${frame.id}`}
                    onClick={() => onFrameClick(frame.id, frame.fileKey, group)}
                    className="text-left px-2 py-1 text-sm hover:bg-blue-50 rounded transition-colors flex justify-between items-center"
                  >
                    <span className="truncate flex items-center gap-1.5" style={{ fontWeight: 500, fontSize: 13, color: '#09090b' }}>
                      {frame.name}
                      {frame.fileName && (
                        <span className="badge bg-indigo-50 text-indigo-600!">
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
    </div>
  );
}
