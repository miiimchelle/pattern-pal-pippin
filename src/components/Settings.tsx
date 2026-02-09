import { useState } from 'react';

interface Props {
  token: string;
  libraryUrls: string[];
  teamId: string;
  onSave: (token: string, urls: string[], teamId: string) => void;
  onBack: () => void;
}

export function Settings({ token: initialToken, libraryUrls: initialUrls, teamId: initialTeamId, onSave, onBack }: Props) {
  const [token, setToken] = useState(initialToken);
  const [urlsText, setUrlsText] = useState(initialUrls.join('\n'));
  const [teamId, setTeamId] = useState(initialTeamId);

  const canSave = token.trim().length > 0 && teamId.trim().length > 0;

  const handleSave = () => {
    if (!canSave) return;
    const urls = urlsText
      .split('\n')
      .map((u) => u.trim())
      .filter((u) => u.length > 0);
    onSave(token, urls, teamId);
  };

  return (
    <div className="flex-1 flex flex-col overflow-auto pattern-pal-body">
      <div className="px-4 pt-1 pb-4 flex flex-col gap-4">
        <div className="violations-header" style={{ marginBottom: 0 }}>
          Settings
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Figma Personal Access Token
          </label>
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="figd_..."
            className={`pattern-pal-input ${token.trim().length === 0 ? 'pattern-pal-input-error' : ''}`}
          />
          <p className="pattern-pal-message mt-1">
            Get from Figma &rarr; Settings &rarr; Personal access tokens
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Figma Team ID
          </label>
          <input
            type="text"
            value={teamId}
            onChange={(e) => setTeamId(e.target.value)}
            placeholder="123456789"
            className={`pattern-pal-input ${teamId.trim().length === 0 ? 'pattern-pal-input-error' : ''}`}
          />
          <p className="pattern-pal-message mt-1">
            Numeric ID from your team URL: figma.com/files/team/&lt;team_id&gt;
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Library File URLs (one per line)
          </label>
          <textarea
            value={urlsText}
            onChange={(e) => setUrlsText(e.target.value)}
            placeholder="https://www.figma.com/design/ABC123/Design-System"
            rows={4}
            className="pattern-pal-textarea"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="pattern-pal-btn flex-1"
          >
            Save Settings
          </button>
          <button
            type="button"
            onClick={onBack}
            className="pattern-pal-btn-secondary flex-1"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
