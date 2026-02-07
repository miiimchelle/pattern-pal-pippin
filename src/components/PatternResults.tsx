import type { PatternGroup } from '../hooks/usePluginMessages';

interface Props {
  groups: PatternGroup[];
  onFrameClick: (frameId: string) => void;
}

export function PatternResults({ groups, onFrameClick }: Props) {
  if (groups.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        No similar patterns found. Try a page with more frames.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      {groups.map((group) => (
        <div key={group.fingerprint} className="border border-gray-200 rounded-lg p-3">
          <div className="text-sm font-medium text-gray-700 mb-2">
            {group.frames.length} similar frames
            <span className="text-gray-400 ml-2 font-normal">
              {group.frames[0].width}×{group.frames[0].height}px, {group.frames[0].childCount}{' '}
              children
            </span>
          </div>
          <div className="flex flex-col gap-1">
            {group.frames.map((frame) => (
              <button
                key={frame.id}
                onClick={() => onFrameClick(frame.id)}
                className="text-left px-2 py-1 text-sm hover:bg-blue-50 rounded transition-colors"
              >
                {frame.name}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
