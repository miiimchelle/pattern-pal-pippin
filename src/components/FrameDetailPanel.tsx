import type { FrameDetail } from '../hooks/usePluginMessages';

interface Props {
  frame: FrameDetail | null;
}

function formatCornerRadius(cr: number | number[]): string {
  if (typeof cr === 'number') return `${cr}px`;
  return cr.map((v) => `${v}px`).join(' ');
}

function formatPadding(p: { top: number; right: number; bottom: number; left: number }): string {
  return `${p.top} ${p.right} ${p.bottom} ${p.left}`;
}

export function FrameDetailPanel({ frame }: Props) {
  if (!frame) {
    return (
      <div className="p-4 text-center text-gray-400 text-sm">
        Select a frame on the canvas to inspect it.
      </div>
    );
  }

  return (
    <div className="p-4 border-b border-gray-200">
      <h3 className="text-sm font-semibold text-gray-800 mb-2 truncate" title={frame.name}>
        {frame.name}
      </h3>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <Property label="Dimensions" value={`${frame.width} × ${frame.height}px`} />
        <Property label="Corner radius" value={formatCornerRadius(frame.cornerRadius)} />
        <Property label="Layout" value={frame.layoutMode ?? 'None'} />
        <Property label="Gap" value={frame.gap !== null ? `${frame.gap}px` : '—'} />
        <Property
          label="Padding"
          value={frame.padding ? formatPadding(frame.padding) : '—'}
        />
        <Property label="Depth" value={String(frame.depth)} />
      </div>

      {frame.fills.length > 0 && (
        <div className="mt-2">
          <span className="text-xs text-gray-500">Fills: </span>
          <span className="inline-flex gap-1 items-center">
            {frame.fills.map((color, i) => (
              <span key={i} className="inline-flex items-center gap-1">
                <span
                  className="inline-block w-3 h-3 rounded border border-gray-300"
                  style={{ backgroundColor: color }}
                />
                <span className="text-xs text-gray-600">{color}</span>
              </span>
            ))}
          </span>
        </div>
      )}

      {frame.childLayers.length > 0 && (
        <div className="mt-2">
          <span className="text-xs text-gray-500 block mb-1">
            Children ({frame.childLayers.length}):
          </span>
          <div className="flex flex-wrap gap-1">
            {frame.childLayers.slice(0, 12).map((child, i) => (
              <span
                key={i}
                className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded"
              >
                {child.name}
                <span className="text-gray-400 ml-0.5">{child.type}</span>
              </span>
            ))}
            {frame.childLayers.length > 12 && (
              <span className="text-xs text-gray-400">
                +{frame.childLayers.length - 12} more
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Property({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-gray-400">{label}: </span>
      <span className="text-gray-700">{value}</span>
    </div>
  );
}
