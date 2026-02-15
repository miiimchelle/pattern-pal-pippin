import type { RuleConfig } from '../hooks/usePluginMessages'

interface Props {
  rules: RuleConfig[]
  onSave: (rules: RuleConfig[]) => void
  onBack: () => void
}

export function RulesPanel({ rules, onSave, onBack }: Props) {
  const handleToggle = (id: string) => {
    const updated = rules.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r))
    onSave(updated)
  }

  return (
    <div
      className="flex-1 flex flex-col overflow-auto pattern-pal-body"
      role="region"
      aria-label="Design rules configuration"
    >
      <div className="px-4 pt-1 pb-4 flex flex-col gap-3">
        <h2 className="violations-header" style={{ marginBottom: 0 }}>
          Design Rules
        </h2>
        <p className="pattern-pal-message">
          Toggle rules on or off. Enabled rules run during frame scans.
        </p>

        <div className="flex flex-col gap-1">
          {rules.map((rule) => (
            <label
              key={rule.id}
              className="flex items-start gap-2.5 px-2 py-2 rounded hover:bg-gray-50 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={rule.enabled}
                onChange={() => handleToggle(rule.id)}
                className="mt-0.5 accent-indigo-500"
                aria-describedby={`rule-desc-${rule.id}`}
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-700">{rule.name}</div>
                <div id={`rule-desc-${rule.id}`} className="text-xs text-gray-400">
                  {rule.description}
                </div>
              </div>
            </label>
          ))}
        </div>

        <button type="button" onClick={onBack} className="pattern-pal-btn-secondary w-full mt-2">
          Done
        </button>
      </div>
    </div>
  )
}
