import { useState } from 'react';

interface Props {
  token: string;
  libraryUrls: string[];
  onSave: (token: string, urls: string[]) => void;
}

export function Settings({ token: initialToken, libraryUrls: initialUrls, onSave }: Props) {
  const [token, setToken] = useState(initialToken);
  const [urlsText, setUrlsText] = useState(initialUrls.join('\n'));

  const handleSave = () => {
    const urls = urlsText
      .split('\n')
      .map((u) => u.trim())
      .filter((u) => u.length > 0);
    onSave(token, urls);
  };

  return (
    <div className="p-4 flex flex-col gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Figma Personal Access Token
        </label>
        <input
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="figd_..."
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
        />
        <p className="text-xs text-gray-500 mt-1">
          Get from Figma → Settings → Personal access tokens
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
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
        />
      </div>

      <button
        onClick={handleSave}
        className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded transition-colors"
      >
        Save Settings
      </button>
    </div>
  );
}
