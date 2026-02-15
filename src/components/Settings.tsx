import { useState } from 'react'
import type { ConnectionTestResult } from '../hooks/usePluginMessages'

interface Props {
  token: string
  libraryUrls: string[]
  teamId: string
  onSave: (token: string, urls: string[], teamId: string) => void
  onBack: () => void
  onTestConnection?: (token: string, teamId: string) => void
  connectionTest?: ConnectionTestResult | null
  isTestingConnection?: boolean
}

export function Settings({
  token: initialToken,
  libraryUrls: initialUrls,
  teamId: initialTeamId,
  onSave,
  onBack,
  onTestConnection,
  connectionTest,
  isTestingConnection,
}: Props) {
  const [token, setToken] = useState(initialToken)
  const [urlsText, setUrlsText] = useState(initialUrls.join('\n'))
  const [teamId, setTeamId] = useState(initialTeamId)

  const canSave = token.trim().length > 0 && teamId.trim().length > 0
  const canTest = token.trim().length > 0

  const handleSave = () => {
    if (!canSave) return
    const urls = urlsText
      .split('\n')
      .map((u) => u.trim())
      .filter((u) => u.length > 0)
    onSave(token, urls, teamId)
  }

  const handleTestConnection = () => {
    if (!canTest || !onTestConnection) return
    onTestConnection(token, teamId)
  }

  return (
    <div
      className="flex-1 flex flex-col overflow-auto pattern-pal-body"
      role="region"
      aria-label="Plugin settings"
    >
      <form
        className="px-4 pt-1 pb-4 flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          handleSave()
        }}
      >
        <h2 className="violations-header" style={{ marginBottom: 0 }}>
          Settings
        </h2>

        <div>
          <label htmlFor="settings-token" className="block text-sm font-medium text-gray-700 mb-1">
            Figma Personal Access Token
          </label>
          <input
            id="settings-token"
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="figd_..."
            className={`pattern-pal-input ${token.trim().length === 0 ? 'pattern-pal-input-error' : ''}`}
          />
          <p className="pattern-pal-message mt-1">
            Get from Figma &rarr; Settings &rarr; Personal access tokens
          </p>
          {connectionTest && (
            <div
              className="mt-1 flex items-center gap-1.5 text-xs"
              role="status"
              aria-live="polite"
            >
              {connectionTest.tokenValid ? (
                <span className="text-green-600">
                  &#10003; Token valid
                  {connectionTest.userName ? ` (${connectionTest.userName})` : ''}
                </span>
              ) : (
                <span className="text-red-600">&#10007; Invalid token</span>
              )}
            </div>
          )}
        </div>

        <div>
          <label
            htmlFor="settings-team-id"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Figma Team ID
          </label>
          <input
            id="settings-team-id"
            type="text"
            value={teamId}
            onChange={(e) => setTeamId(e.target.value)}
            placeholder="123456789"
            className={`pattern-pal-input ${teamId.trim().length === 0 ? 'pattern-pal-input-error' : ''}`}
          />
          <p className="pattern-pal-message mt-1">
            Numeric ID from your team URL: figma.com/files/team/&lt;team_id&gt;
          </p>
          {connectionTest && connectionTest.tokenValid && teamId.trim().length > 0 && (
            <div
              className="mt-1 flex items-center gap-1.5 text-xs"
              role="status"
              aria-live="polite"
            >
              {connectionTest.teamIdValid ? (
                <span className="text-green-600">&#10003; Team ID valid</span>
              ) : (
                <span className="text-red-600">&#10007; Invalid Team ID</span>
              )}
            </div>
          )}
        </div>

        <div>
          <label
            htmlFor="settings-library-urls"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Library File URLs (one per line)
          </label>
          <textarea
            id="settings-library-urls"
            value={urlsText}
            onChange={(e) => setUrlsText(e.target.value)}
            placeholder="https://www.figma.com/design/ABC123/Design-System"
            rows={4}
            className="pattern-pal-textarea"
          />
        </div>

        {connectionTest?.error && (
          <div className="text-xs text-red-600" role="alert">
            {connectionTest.error}
          </div>
        )}

        <div className="flex gap-2">
          <button onClick={handleSave} disabled={!canSave} className="pattern-pal-btn flex-1">
            Save Settings
          </button>
          <button type="button" onClick={onBack} className="pattern-pal-btn-secondary flex-1">
            Cancel
          </button>
        </div>

        {onTestConnection && (
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={!canTest || isTestingConnection}
            className="pattern-pal-btn-secondary w-full"
          >
            {isTestingConnection ? 'Testing...' : 'Test Connection'}
          </button>
        )}
      </form>
    </div>
  )
}
