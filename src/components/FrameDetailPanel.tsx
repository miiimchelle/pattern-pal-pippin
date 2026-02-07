import type { FrameDetail, PatternGroup } from '../hooks/usePluginMessages';
import { MatchDetails } from './MatchDetails';

function consistencyColor(c: number): string {
  if (c >= 90) return 'bg-green-100 text-green-700';
  if (c >= 75) return 'bg-blue-100 text-blue-700';
  if (c >= 60) return 'bg-amber-100 text-amber-700';
  return 'bg-red-100 text-red-700';
}

function formatCornerRadius(cr: number | number[]): string {
  if (typeof cr === 'number') return cr === 0 ? 'None' : `${cr}px`;
  const unique = [...new Set(cr)];
  if (unique.length === 1) return unique[0] === 0 ? 'None' : `${unique[0]}px`;
  return cr.map((v) => `${v}px`).join(', ');
}

function formatPadding(p: { top: number; right: number; bottom: number; left: number }): string {
  if (p.top === p.right && p.right === p.bottom && p.bottom === p.left) return `${p.top}px`;
  if (p.top === p.bottom && p.left === p.right) return `${p.top}px ${p.right}px`;
  return `${p.top} ${p.right} ${p.bottom} ${p.left}`;
}

interface Props {
  frame: FrameDetail | null;
  group: PatternGroup | null;
  frameName?: string;
  onBack: () => void;
  onOpenInFigma: (url: string) => void;
}

export function FrameDetailPanel({ frame, group, frameName, onBack, onOpenInFigma }: Props) {
  const name = frame?.name || frameName || 'Frame';

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 p-3 border-b border-gray-200">
        <button
          onClick={onBack}
          className="text-gray-400 hover:text-gray-600 p-1 -ml-1"
          title="Back to results"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-sm font-semibold truncate">{name}</h2>
      </div>

      <div className="flex-1 overflow-auto p-4 flex flex-col gap-4">
        {/* Team Consistency */}
        {group && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Team consistency:</span>
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-full ${consistencyColor(group.consistency)}`}
            >
              {group.consistency}%
            </span>
          </div>
        )}

        {/* Structural Details */}
        {frame && (
          <div>
            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Structure
            </h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
              <Detail label="Size" value={`${frame.width} × ${frame.height}px`} />
              <Detail label="Depth" value={String(frame.depth)} />
              {frame.layoutMode && <Detail label="Layout" value={frame.layoutMode} />}
              {frame.gap !== null && <Detail label="Gap" value={`${frame.gap}px`} />}
              {frame.padding && <Detail label="Padding" value={formatPadding(frame.padding)} />}
              <Detail label="Corner radius" value={formatCornerRadius(frame.cornerRadius)} />
              {frame.fills.length > 0 && (
                <div className="col-span-2 flex items-center gap-1.5">
                  <span className="text-gray-400">Fills</span>
                  <div className="flex gap-1">
                    {frame.fills.map((fill, i) => (
                      <span
                        key={i}
                        className="inline-block w-4 h-4 rounded border border-gray-200"
                        style={{ backgroundColor: fill }}
                        title={fill}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Child Layers */}
        {frame && frame.childLayers.length > 0 && (
          <div>
            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Layers ({frame.childLayers.length})
            </h3>
            <div className="flex flex-col gap-0.5 max-h-40 overflow-auto">
              {frame.childLayers.map((layer, i) => (
                <div key={i} className="flex items-center justify-between text-xs px-1 py-0.5 rounded hover:bg-gray-50">
                  <span className="truncate text-gray-700">{layer.name}</span>
                  <span className="text-[10px] text-gray-400 ml-2 shrink-0">{layer.type}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Group frames */}
        {group && group.frames.length > 1 && (
          <div>
            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Grouped with ({group.frames.length - 1} other frame{group.frames.length > 2 ? 's' : ''})
            </h3>
            <div className="flex flex-col gap-0.5">
              {group.frames
                .filter((f) => f.name !== name || f.id !== frame?.id)
                .map((f) => (
                  <div key={`${f.fileKey || 'local'}-${f.id}`} className="flex items-center justify-between text-xs px-1 py-0.5 rounded hover:bg-gray-50">
                    <span className="truncate text-gray-700">{f.name}</span>
                    {f.fileName && (
                      <span className="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded shrink-0 ml-2">
                        {f.fileName}
                      </span>
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Consistency Insights (library matches, component usage, name matches) */}
        {group && (
          <div>
            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Insights
            </h3>
            <MatchDetails
              componentUsage={group.componentUsage || []}
              nameMatches={group.nameMatches || []}
              libraryMatches={group.libraryMatches || []}
              onOpenInFigma={onOpenInFigma}
            />
            {(group.componentUsage || []).length === 0 &&
              (group.nameMatches || []).length === 0 &&
              (group.libraryMatches || []).length === 0 && (
                <p className="text-xs text-gray-400">No library matches found for this group.</p>
              )}
          </div>
        )}
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-gray-400">{label}</span>
      <span className="text-gray-700 font-medium">{value}</span>
    </div>
  );
}
