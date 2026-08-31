# Developer Documentation

This guide covers how to set up, run, build, debug, and contribute to the **EAM Spare Parts** Electron application.

## Prerequisites

- **Node.js** (LTS recommended; CI uses Node 22)
- **npm**
- **Git**
- **better-sqlite3** platform prebuilds (see "Troubleshooting" below)

## Getting Started

```bash
# 1. Clone the repository
git clone https://github.com/jonathanmajh/iko_mro_items.git
cd iko_mro_items

# 2. Install dependencies
npm install

# 3. Run the app in development mode (Electron Forge)
npm start
```

### Rebuilding native modules

`better-sqlite3` is a native module and must match the Electron ABI. Electron Forge/`@electron/rebuild` handles this during `npm start`, but if you hit ABI errors, rebuild explicitly:

```bash
npx @electron/rebuild -f -w better-sqlite3
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Launch the app in dev mode (Electron Forge) |
| `npm run package` | Package the app into the platform output directory (`out/`) |
| `npm run make` | Produce distributables (Squirrel installer on Windows, zip on macOS) |
| `npm run publish` | Publish a release to GitHub |
| `npm run lint` | Run ESLint (flat config in `eslint.config.js`) |
| `npm test` | Run the Vitest unit-test suite |

## Project Layout

```
iko_mro_items/
├── main.js                     # Electron main process
├── package.json                # Scripts, deps, Forge config
├── assets/                     # Shared business logic (require()'d)
│   ├── constants.js            # Config: env URLs, Firebase, replacements
│   ├── common.js               # UI helpers (theme, WorkerHandler, Item, logs)
│   ├── maximo.js               # Maximo REST client
│   ├── indexDB.js              # Local item/inventory/analysis DB + settings/schema/remote merge
│   ├── remotedb.js             # Remote program.db download/extract
│   ├── better-sqlite.js        # Observation list DB
│   ├── excel.js                # Unified Spreadsheet (item cache/batches + observation/jobtask/translation IO)
│   ├── validators.js           # Description validation
│   ├── utils.js / firestore.js / autoupdater.js
│   └── item_translation/       # Item description translation
│   └── asset_translation/      # Asset/PM/JP translation
└── renderer/                   # UI pages
    ├── *.html                  # One page per screen/module
    ├── *.js                    # Page logic (DOM + WorkerHandler)
    ├── worker.js               # Web Worker dispatcher
    └── style.css / table_style.css
```

## Development Workflow

### Hot reload

Run `npm start`, then inside the opened app window:

- Press **Ctrl+R** (`Cmd+R` on macOS) to reload the current renderer page after JS/HTML changes.
- Type **`rs`** in the terminal that launched the app to restart the whole Electron process (needed for `main.js` / `assets/` changes in `main.js`).

### CSS conventions

Per the project README: **link `style.css` as the only stylesheet** in an HTML page. If you need additional styles, create a file and `@import` it into `style.css`. Do not add multiple `<link>` stylesheets.

### Theme

The app supports dark/light mode via Bootstrap 5 `data-bs-theme`. The theme is stored in `localStorage` under the key `theme` (`'dark'` default). Use the existing `toggleTheme` / `setTheme` / `loadTheme` helpers from `assets/common.js`; wire the dark-mode switch to `toggleTheme`.

## Key Coding Patterns

### Talking to the worker (the standard async pattern)

Never block the renderer. Instead:

```js
// Renderer
const worker = new WorkerHandler();
worker.work(['validSingle', raw_desc], (result) => {
  showResult(result);
});
```

The command + args are dispatched in `renderer/worker.js`, and the callback receives the data that the worker returns under the `result` status. Progress/toasts/errors are handled by `WorkerHandler` automatically.

### Direct worker use (rare)

For special cases the code sometimes uses a bare `Worker('./worker.js')` (e.g., in `finishLoadingBatch` where worker init time matters). Prefer `WorkerHandler` unless there's a specific reason not to.

### Interacting with settings / dialogs via IPC

- To call a native dialog handler from the renderer, use `ipcRenderer.invoke('<handler>')` as a Promise — e.g. `ipcRenderer.invoke('select-to-be-translated')`, or `ipcRenderer.send('<handler>')` for fire-and-forget.
- Handlers are registered in `main.js` (e.g. `select-excel-file`, `select-translations`, `select-to-be-translated`, `openSettings`, `write-file`).

### Adding a new worker command

1. In `renderer/worker.js`, add a `'<command>': (e) => { ... }` entry to the `handlers` registry that instantiates the relevant service and posts a result.
2. Call it from the renderer via `handler.work(['<command>', ...args], callback)`.
3. Add any new UI-status reply in `WorkerHandler.work` in `common.js` if it needs special handling.

## Configuration & Environments

All environment-sensitive settings live in `assets/constants.js`, sourced from environment variables with **production-safe defaults**:

- `ENV` — Maximo host. Defaults to production; override with `MAXIMO_ENV` (e.g. `MAXIMO_ENV=mas.manage.uat.ikona-np.naviam.app`).
- `OPEN_DEV_TOOLS` — opens DevTools at launch. Defaults to off; set `OPEN_DEV_TOOLS=true` to enable.
- `FIREBASECONFIG.apiKey` — Firebase API key for usage tracking, supplied via `FIREBASE_API_KEY`. Non-secret Firebase settings remain inline.

Example launching against the UAT environment with DevTools:

```bash
MAXIMO_ENV=mas.manage.uat.ikona-np.naviam.app OPEN_DEV_TOOLS=true npm start
```

Environment overrides can also be placed in a gitignored local `.env` / `.env.local` file. Production is the default and requires no configuration.

## Data Storage (Local)

The app stores several SQLite databases in the OS user-data folder under the `EAM Spare Parts` directory:

| Platform | Path |
|----------|------|
| Windows | `%APPDATA%\EAM Spare Parts\` |
| macOS | `~/Library/Preferences/EAM Spare Parts\` |
| Linux | `~/.local/share/EAM Spare Parts\` |

Files: `program.db` (item cache + settings), `obserlist.db` (observation lists), `translist.db` (translation dictionary). These are gitignored. Paths are resolved centrally in `assets/paths.js`.

`localStorage` holds user-scoped UI state: `theme`, `userSite`, `powerUser`.

To reset local data while developing, delete the `EAM Spare Parts` directory (or the individual `.db` files) — the app recreates the schema on next run.

## Getting the Latest Item Cache

The app refreshes its local item cache from Maximo on startup (see `maximo.js` delta sync) and can also merge a **remote prebuilt database**. The remote DB is served from a Cloudflare Worker:

- Version: `https://iko-proxy.jonathanmajh.workers.dev/.version`
- Bundle: `https://iko-proxy.jonathanmajh.workers.dev/program.zip`

To regenerate/update this remote bundle for all users, you would produce a fresh `program.db`, zip it, and update the hosted files (maintained separately from this repo).

## Testing & Verification

- **No automated test suite exists.** Verify changes manually: start the app (`npm start`), exercise the affected flows, and watch the DevTools console + the Logs table.
- **Lint**: run `npx eslint .` (note `max-len` is disabled, so long lines are expected/allowed).
- Before raising a PR, `npm run make` should complete for your platform to confirm packaging works.

## Debugging

### VS Code

`.vscode/launch.json` includes a "Debug Main Process" configuration that launches the app with `--enable-logging`. Select it in the Run and Debug panel to debug the main process; attach to the renderer via the DevTools (set `OPEN_DEV_TOOLS` to `true` while developing).

### Console logging locations

- Renderer logs appear in DevTools.
- Service/worker `console.log` / `postMessage([...])` also surface through the Logs table / toasts.
- Main process (`main.js`, `autoupdater.js`) logs to the terminal that launched the app.

## Releasing

Releases are driven by **git tags** and GitHub Actions.

1. Bump the version:

   ```bash
   npm version major|minor|patch
   ```

2. Push the tag (and the version commit):

   ```bash
   git push --follow-tags
   ```

3. The `release.yml` workflow (on tags/`v*` or a created release) runs `npm run publish`, which uses the Forge GitHub publisher to attach artifacts to the release. Set `draft`/`prerelease` in `package.json` as needed.

Update dependency versions with:

```bash
npx npm-check-updates -u
npm install
```

## Auto-Updater

- On Windows, the app uses Squirrel's `autoUpdater` with a feed at `https://mro-update.vercel.app/update/<platform>/<version>` (the Vercel server is maintained separately).
- If the `autoUpdater` errors, `autoupdater.js` falls back to querying the GitHub API for the latest release and offers to open the release page. The fallback logic compares versions, so tags should be plain semver (`v` prefix allowed).

## Troubleshooting

### `better-sqlite3` ABI / prebuilt binary errors

`better-sqlite3` does not ship prebuilt binaries for all Electron versions/platforms and may need compiling against Electron. See the [better-sqlite3 troubleshooting docs](https://github.com/JoshuaWise/better-sqlite3/blob/master/docs/troubleshooting.md) and rebuild with `npx @electron/rebuild -f -w better-sqlite3` (or re-run `npm start`, which triggers a rebuild).

### "Cannot edit old file make sure it is closed"

The Excel writer (`saveWorkbook`) fails if the target `.xlsx` is open in Excel. Close the file and retry.

### Firestore / usage tracking errors

These are non-fatal; errors are swallowed and logged to the console (`firestore.js` wraps `addDoc` in try/catch).

### Missing items / stale cache

Delete the local `program.db` (see "Data Storage") and restart; on startup the app re-syncs from Maximo or the remote DB.

## Contribution Guidelines

- Match the existing style (Google-ish, 2-space indent, template literals, `postMessage`-based progress reporting). ESLint config is provided.
- Keep heavy work in the worker, never in the renderer/DOM event handlers.
- Put new business logic under `assets/` (or a subfolder for a new feature) and new screens in `renderer/`.
- Do **not** hard-code environment credentials; use the env-var config in `assets/constants.js` and the path helpers in `assets/paths.js`.
- Update this doc if you add scripts, modules, or change architecture.
- Follow existing JSDoc comment conventions.
