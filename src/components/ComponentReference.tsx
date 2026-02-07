import { useState } from 'react';
import { shadcnCatalog, type ShadcnComponent } from '../data/shadcn-catalog';

interface Props {
  onOpenUrl: (url: string) => void;
}

const categories = ['All', 'Layout', 'Input', 'Feedback', 'Navigation', 'Data Display'] as const;

export function ComponentReference({ onOpenUrl }: Props) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('All');
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = shadcnCatalog.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === 'All' || c.category === category;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Search */}
      <div className="px-4 pt-3 pb-2">
        <input
          type="text"
          placeholder="Search components..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full text-sm border border-gray-200 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
        />
      </div>

      {/* Category filter */}
      <div className="px-4 pb-2 flex gap-1 flex-wrap">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`text-xs px-2 py-0.5 rounded-full transition-colors ${
              category === cat
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Component list */}
      <div className="flex-1 overflow-auto px-4 pb-4">
        {filtered.length === 0 ? (
          <div className="text-sm text-gray-400 text-center py-4">No components match.</div>
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map((comp) => (
              <ComponentCard
                key={comp.name}
                component={comp}
                isExpanded={expanded === comp.name}
                onToggle={() => setExpanded(expanded === comp.name ? null : comp.name)}
                onOpenUrl={onOpenUrl}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ComponentCard({
  component,
  isExpanded,
  onToggle,
  onOpenUrl,
}: {
  component: ShadcnComponent;
  isExpanded: boolean;
  onToggle: () => void;
  onOpenUrl: (url: string) => void;
}) {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full text-left px-3 py-2 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-medium text-gray-800">{component.name}</span>
          <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full shrink-0">
            {component.category}
          </span>
        </div>
        <span className="text-gray-400 text-xs shrink-0">{isExpanded ? '▲' : '▼'}</span>
      </button>

      {isExpanded && (
        <div className="px-3 pb-3 border-t border-gray-100">
          <p className="text-xs text-gray-500 mt-2 mb-2">{component.description}</p>

          {/* Tokens */}
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs mb-2">
            <TokenRow label="Border radius" value={component.tokens.borderRadius} />
            <TokenRow label="Padding" value={component.tokens.padding} />
            {component.tokens.gap && <TokenRow label="Gap" value={component.tokens.gap} />}
          </div>

          {/* Variants */}
          {component.variants.length > 0 && (
            <div className="mb-2">
              <span className="text-xs text-gray-400">Variants: </span>
              <span className="text-xs text-gray-600">
                {component.variants.join(', ')}
              </span>
            </div>
          )}

          {/* Structure */}
          <div className="mb-2">
            <span className="text-xs text-gray-400 block mb-1">Structure:</span>
            <div className="flex flex-wrap gap-1">
              {component.structure.map((slot) => (
                <span
                  key={slot}
                  className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded"
                >
                  {slot}
                </span>
              ))}
            </div>
          </div>

          {/* Doc link */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenUrl(component.docUrl);
            }}
            className="text-xs text-blue-500 hover:text-blue-700 hover:underline transition-colors"
          >
            View docs →
          </button>
        </div>
      )}
    </div>
  );
}

function TokenRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-gray-400">{label}: </span>
      <span className="text-gray-700">{value}</span>
    </div>
  );
}
