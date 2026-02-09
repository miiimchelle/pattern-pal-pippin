# Pattern Pal

A Figma plugin that checks your designs against your design system and team files. Built for the **Into Design Systems Hackathon 2026** by Team Pippin.

## What it is

**Pattern Pal** (with its mascot Pippin) helps you:

- **Scan a frame** — Select a single frame, then scan to compare it against:
  - **Design library** — Optional Figma file URLs; the plugin finds structurally similar components and reports consistency.
  - **Team files** — Frames from other files in your Figma team; you see how much your frame aligns with patterns used elsewhere.
- **Scan team files** — Cluster similar frames across all team files to discover recurring patterns and consistency scores.
- **Rule checks** — Built-in rules (e.g. “only one primary button per screen”) surface findings with frame and node references.

Results include consistency scores, library matches, team-file matches, and rule issues. You can zoom to frames, open files in Figma, and inspect frame details (layout, padding, components).

## How it works

1. **Fingerprinting** — Frames are turned into structural fingerprints (size, aspect ratio, child count, depth, layout mode, corner radius, component usage, child-type distribution). No pixels or text content are sent.
2. **Similarity** — Fingerprints are compared with a weighted similarity score. Frames above a threshold are grouped or reported as matches.
3. **Figma REST API** — With your Personal Access Token and Team ID, the plugin fetches team projects/files and optional library files (read-only) to build fingerprints and run comparisons. All processing uses structural data only.
4. **UI** — The plugin UI (React) runs inside Figma and talks to the plugin backend via `postMessage`. Settings (token, team ID, library URLs) are stored in Figma client storage.

## Install and run

### Prerequisites

- Node.js 18+
- npm

### Build the plugin

```bash
# Install dependencies
npm install

# Build plugin UI and backend (required before using in Figma)
npm run build
```

This produces:

- `dist/index.html` — Plugin UI (single-file bundle).
- `dist/code.js` — Plugin backend (runs in Figma’s sandbox).

### Install in Figma

1. Open **Figma Desktop** (plugin does not run in the browser).
2. Go to **Plugins → Development → Import plugin from manifest…**.
3. Choose this project folder (the one that contains `manifest.json`).
4. The plugin will appear under **Plugins → Development → Pattern Pal**.

### First-time setup in the plugin

1. Run the plugin, then open **Settings** (gear icon).
2. Enter your **Figma Personal Access Token** (Figma → Settings → Personal access tokens).
3. Enter your **Figma Team ID** (numeric ID from your team URL: `figma.com/files/team/<team_id>`).
4. Optionally add **Library file URLs** (one per line) to compare frames against design-system components.
5. Save. You can now use **Scan frame** and **Scan team files**.

## Scripts

| Command | Description |
|--------|-------------|
| `npm run dev` | Start Vite dev server (UI only; for local UI dev) |
| `npm run build` | Build UI + plugin code for production |
| `npm run watch` | Watch and rebuild UI and plugin code |
| `npm run preview` | Preview production UI build |
| `npm run lint` | Run ESLint |
| `npm run format` | Format with Prettier |
| `npm run format:check` | Check formatting |
| `npm test` | Run tests (watch) |
| `npm run test:run` | Run tests once |

## Project structure

```
├── manifest.json          # Figma plugin manifest (main: dist/code.js, ui: dist/index.html)
├── index.html             # UI entry for Vite
├── src/
│   ├── main.tsx           # React UI entry
│   ├── App.tsx            # Main app (tabs: Scan frame / Scan team files)
│   ├── plugin/
│   │   ├── code.ts        # Plugin backend (Figma API, scan, storage, message handlers)
│   │   └── core.ts        # Fingerprints, similarity, clustering, API helpers
│   ├── components/        # Pippin, Settings, results panels, etc.
│   └── hooks/             # usePluginMessages (UI ↔ plugin)
├── vite.config.ts         # UI build (single-file output)
└── vite.config.sandbox.ts # Plugin code build → dist/code.js
```

## Tech stack

- React 19, TypeScript, Vite
- Tailwind CSS v4
- Vitest, Testing Library
- Figma Plugin API, Figma REST API (team/files)

## Team

**Team Pippin** — Cologne, Germany + United Kingdom
