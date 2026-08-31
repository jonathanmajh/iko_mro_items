# Codebase Improvement Plan

Prioritized, phase-based plan for improving and simplifying the **EAM Spare Parts** codebase. Each phase is an independent unit of work with its own rationale, concrete changes, and verification steps. Phases are sequenced so earlier (low-risk, high-impact) work layers cleanly on top of one another, and so the tooling needed to verify refactors is introduced early.

## Summary

| # | Phase | Category | Risk | Est. size |
|---|-------|----------|------|-----------|
| 1 | Remove dead code & legacy modules | Cleanup | Low | S |
| 2 | Centralize config & kill hard-coded env switching | Config | Low | S |
| 3 | De-duplicate Excel modules | Refactor | Medium | M |
| 4 | De-duplicate UI helpers & shared logic | Refactor | Low | S |
| 5 | Consolidate SQLite data layer | Refactor | Medium | M |
| 6 | Standardize worker communication | Refactor | Medium | M |
| 7 | Harden renderer security (preload + contextIsolation) | Security | Medium | M |
| 8 | Add test harness + lint/typecheck | Tooling | Low | M |
| 9 | Reconcile navigation & remove dead IPC | Cleanup | Low | S |
| 10 | Dependency & asset audit | Cleanup | Low | L |

> **Ordering note:** Phase 8 (tooling) is intentionally listed later, but its **tooling pieces** (a lint script) should be adopted *before* Phases 3–6 so each refactor is verified. This is noted inline in each phase.

---

## Phase 1 — Remove dead code & legacy modules

**Goal:** Shrink the maintenance surface and shipped bundle by deleting code that is unused, deprecated, or explicitly marked "don't use."

**Rationale:** Several modules/ functions are confirmed dead or deprecated:

- `assets/exceljs.js` header says **"don't use"**; its `getDescriptions`/`writeDescriptions`/`saveDescription` overlap `spreadsheet.js` (consolidation deferred to Phase 3, but its dead private `Array.prototype.equals` monkey-patch should go now).
- `assets/item_translation/item-translation.js#translate()` is marked **deprecated**; only `contextTranslate` is called from `worker.js`.
- `assets/asset_translation/asset_translation_sqlite.js` is an empty stub ("not needed tbh").
- `renderer/item_translation.js` + Debug markup use **hard-coded Windows paths** (`C:\Users\majona\...`) — test scaffolding, not production.
- `renderer/asset_translation.js` lines 1–3 set hard-coded debug file paths.
- `renderer/test.jpg`, `renderer/sun.png`, `renderer/moon.png` — unused assets.
- `main.js` commented-out `electron-reload` block.
- Dead renderer fields in `common.js` `Item` constructor (unused params).
- `.vscode/settings.json` embeds a Maximo apikey (remove; see Phase 2 for secrets).

**Changes:**
1. Delete `assets/asset_translation/asset_translation_sqlite.js`.
2. Delete deprecated `TranslateDescription.translate()` method (keep `contextTranslate`).
3. Remove `Array.prototype.equals` monkey-patch from `assets/exceljs.js`.
4. Delete or gate-off `renderer/item_translation.js` and its `item_translation.html` wiring (or move behind real file pickers in Phase 9).
5. Remove debug hard-coded paths in `renderer/asset_translation.js` and `renderer/item_translation.js`.
6. Remove unused assets; audit `table_style.css`.
7. Trim unused `Item` constructor params (or convert to config object in Phase 4).

**Verification:** `npx eslint .` passes; `npm start` opens cleanly; item + observation + translation flows still work.

---

## Phase 2 — Centralize config & kill hard-coded environment switching

**Goal:** Eliminate the `devMode`-flag foot-gun and remove secrets from source.

**Rationale:**
- `assets/constants.js` switches UAT/prod via `devMode` with a comment "Remember to set it back to false when committing!" — an accident waiting to happen.
- `FIREBASECONFIG` embeds a live Firebase API key.
- `.vscode/settings.json` and `.vscode/launch.json` embed Maximo credentials / apikeys.
- The user-data `dbPath` resolution is duplicated in `indexDB.js` and `sharedDB.js` (and `better-sqlite.js` uses `%APPDATA%` directly, which breaks off-Windows).

**Changes:**
1. Read `ENV` from an environment variable / Forge config / optional local config file, defaulting to production. `OPEN_DEV_TOOLS` defaults to `!app.isPackaged`.
2. Move `FIREBASECONFIG` to runtime config (env/Forge) or gitignored local file; document how to supply it.
3. Remove the Maximo apikey from `.vscode/settings.json`; gitignore any local credentials file.
4. Add a single `assets/paths.js` helper that resolves the OS user-data directory uniformly (Windows/macOS/Linux) and have all DB modules use it.

**Verification:** App runs in prod mode by default with no dev flag; DevTools only open when `app.isPackaged === false`; no credentials remain in committed files.

---

## Phase 3 — De-duplicate Excel modules

**Goal:** Replace the two overlapping Excel abstraction layers with one module.

**Rationale:** `assets/spreadsheet.js` (`ExcelReader`) and `assets/exceljs.js` (`Spreadsheet`) both wrap `exceljs` and have overlapping `getDescriptions`, saving/reading logic. Maintaining two is confusing and encourages drift.

**Changes:**
1. Consolidate into a single `assets/excel.js` exporting one class with a clean method surface:
   - Reading: `getItemCache`, `getDescriptions`, `getManufactures`, `getAbbreviations`, `getTranslations`, `getJobTasks`, `readObservList`
   - Writing: `saveDescription`, `saveNumber`, `saveNonInteractive`, `saveTranslations`, `saveObserListChanges`
2. Update all importers (`renderer/worker.js`, `assets/validators.js`) to the merged class.
3. Delete the old two files.
4. Replace the `Array.prototype.equals` usage with a normal helper function.

**Verification:** `npm start`; exercise item cache loading, observation import/export, and translation import/export. Optionally add unit tests (Phase 8) around the pure methods.

---

## Phase 4 — De-duplicate UI helpers & shared logic

**Goal:** Remove duplicated client-side helpers and consolidate shared utilities.

**Rationale (confirmed):**
- `assets/common.js` defines `toggleTheme`/`setTheme`/`loadTheme`, but `renderer/observation_template.js` (lines 19–28) and `renderer/asset_translation.js` (lines 64–72) define their **own buggy copies**.
- `getCombinations` is duplicated in `assets/utils.js` and `assets/indexDB.js` (and `inOrderCombinations` exists only in utils).
- `data-bs-theme` handling is mixed: some pages rely on the shared helper, others re-implement it.

**Changes:**
1. Delete the local `toggleTheme` copies in `observation_template.js` and `asset_translation.js`; wire the page's dark-mode switch to the shared `toggleTheme`.
2. Have `indexDB.js` import `getCombinations` from `assets/utils.js` instead of redefining it.
3. (Optional) Convert `Item` constructor to a config object and drop unused fields.

**Verification:** Theme toggle works identically on all pages; related-item search still functions after the `getCombinations` dedup; lint passes.

---

## Phase 5 — Consolidate SQLite data layer

**Goal:** End the split-brain between the two `program.db` manager classes.

**Rationale:** `assets/indexDB.js` (`Database`) and `assets/sharedDB.js` (`SharedDatabase`) both open **the same `program.db`** and both manage schema/tables/settings. `SharedDatabase` owns schema + settings + remote-load; `Database` owns data tables. This creates confusion about who owns table creation.

**Changes:**
1. Merge into a single `Database` class (single module, single connection) exposing: schema creation, settings (user/password/version), item/inventory/manufacturer/abbreviation tables, working-description analysis, and remote-DB merge.
2. Update all importers (`renderer/worker.js`, `assets/maximo.js`, `assets/validators.js`, `renderer/item_main.js`).
3. Keep a thin `SettingsDatabase` (or methods) for the settings-only reads used by `sharedDB` consumers, or migrate those callers to the merged class.
4. Ensure table creation runs exactly once with the schema defined in one place.

**Verification:** Fresh start creates all tables; item cache sync + related search + login/save-password still work; no "table does not exist" errors.

---

## Phase 6 — Standardize worker communication

**Goal:** Make the worker dispatch declarative and remove direct `postMessage` calls from business logic.

**Rationale:**
- `renderer/worker.js` is a large imperative `switch`; adding a command touches many lines.
- Business modules (`assets/better-sqlite.js`, `assets/indexDB.js`, `assets/exceljs.js`, `assets/validators.js`) call `postMessage(...)` directly, which couples them to the worker and makes them untestable outside a worker context.

**Changes:**
1. Replace the `switch` in `renderer/worker.js` with a **command → handler registry** (a `Map` or router object) so a new command is a one-line registration.
2. Introduce a small logging/progress helper (e.g. `assets/reporting.js`) with functions `debug/info/warning/error/progress/result` that map to `postMessage`. Move business modules onto it.
3. Keep `WorkerHandler.work` (renderer side) as-is, or align message types into shared constants.

**Verification:** All existing commands behave the same; logging/toasts/progress still update the UI correctly; unit tests for business logic can now run by injecting a fake reporter (Phase 8).

---

## Phase 7 — Harden renderer security (preload + contextIsolation)

**Goal:** Remove unrestricted Node access from renderer windows.

**Rationale:** All windows set `nodeIntegration: true`, `nodeIntegrationInWorker: true`, `contextIsolation: false`. Renderer files `require('electron')` directly (`item_main.js`, `start_page.js`, `setting.js`, `asset_translation.js`, and `observation_template.js` uses the removed/insecure `require('electron').remote`).

**Changes:**
1. Enable `contextIsolation: true`, `nodeIntegration: false` on all windows.
2. Add a single **preload script** exposing a minimal, explicit API via `contextBridge`:
   - `clipboard` write (`item_main.js`)
   - `ipcRenderer.send` / `ipcRenderer.invoke` for the specific channels used (`write-file`, `firestore-log`, `openSettings`, `getVersion`, `select-*`, `getPath`, `loading`, `start_*`)
   - `shell.openExternal` (`item_main.js`)
3. Migrate `observation_template.js` from `require('electron').remote` dialogs to `ipcMain.handle` + `ipcRenderer.invoke` (mirroring the other pages).
4. Update the five renderer files to consume the preload API instead of `require('electron')`.

**Verification:** All pages load and function; file pickers, theme, item upload, observation flow, and settings work; no renderer calls Node APIs it shouldn't.

---

## Phase 8 — Add test harness + lint/typecheck

**Goal:** Make refactors verifiable and catch regressions.

**Rationale:** There is no test or lint npm script (ESLint config exists but isn't wired). Confirmed-dead code and refactors currently can only be verified manually.

**Changes:**
1. Add a `lint` script (`eslint .`) and wire it into `.github/workflows/build.yml`.
2. Introduce a lightweight test runner (**Vitest**) and unit tests for the pure logic that is currently untestable due to `postMessage`/DOM coupling (best written after Phase 6):
   - `assets/validators.js` (`validateSingle`, `assembleDescription`)
   - `assets/utils.js` (`getCombinations`, `inOrderCombinations`)
   - `assets/constants.js` (replacements, env resolution)
   - `assets/item_translation/item-translation.js` (`contextTranslate`)
   - `assets/indexDB.js` (`itemOccurrence`, `matchAndScore`)
3. Add a `test` script; document in `docs/DEVELOPMENT.md`.
4. (Optional) Add `tsc --checkJs` for incremental type checking of hot paths via JSDoc.

**Verification:** `npm run lint` and `npm test` pass; CI runs lint on PRs.

---

## Phase 9 — Reconcile navigation & remove dead IPC

**Goal:** Align the declared modules with the actual UI and remove unused main-process handlers.

**Rationale:** `main.js` registers `start_item_module`, `start_item_translate`, `start_item_translation`, `start_asset_translate` handlers, but `start_page.js` has the corresponding module links **commented out** (`openItemTranslation`, `openAssetDescription`). This is dead navigation surface.

**Changes (DECIDED: remove dead surface):**
1. Removed the unused `start_item_module`, `start_observation_template`, `start_asset_translate`, and `getPath` IPC handlers. (`start_item_module` also referenced a non-existent `item_loading.html`.) Kept `loading`, which the start page actually uses.
2. Deleted the orphaned standalone pages `observation_template.html`/`.js` and `asset_translation.html`/`.js`, which had no navigation entry point. Their worker logic (`compareObservLists`, `assets/asset_translation/*`) is preserved and used by the Item Tool.
3. Removed commented-out dead code in `renderer/setting.js` (`updateManuf`/`updateAbbre`/`exportTables`/`update`/`createTables`).

**Verification:** Start page shows only working entry points; no orphan IPC handlers; lint passes.

---

## Phase 10 — Dependency & asset audit

**Goal:** Reduce dependency churn and confirm what is actually needed.

**Rationale:** `README.md` references stale versions (electron v21.4.3, better-sqlite3 v8.2.0) that disagree with `package.json` (electron ^41, better-sqlite3 ^12.8). `dependabot.yml` runs daily, and `npm-check-updates` is in the workflow, so churn is high.

**Changes (done):**
1. Audited every runtime dependency; all 9 (`@zip.js/zip.js`, `better-sqlite3`, `bootstrap`, `electron-squirrel-startup`, `exceljs`, `firebase`, `jimp`, `lodash`, `luxon`) are referenced and kept. Dropped unused devDependencies: `eslint-config-google` and `electron-reload` (no references; superseded by the flat ESLint config), and `@eslint/eslintrc` (unused). Declared the previously-undeclared `globals` devDependency used by `eslint.config.js`. Kept `@electron/rebuild` (documented native-module rebuild step) and `npm-check-updates` (documented update workflow).
2. Deleted legacy `.eslintrc.json` (superseded by `eslint.config.js`; incompatible with ESLint 10).
3. Updated `README.md` and `docs/DEVELOPMENT.md` to current versions (electron 41, better-sqlite3 12.8, exceljs 4.4) and the Electron Forge workflow; dropped the stale per-version "Using" list.
4. Regenerated `package-lock.json` via `npm install` after pruning.

**Verification:** `npm install` clean; `npm run lint` and `npm test` pass; app runs with the pruned dependency set.

---

## Execution guidance

- **Start** with Phase 1 + Phase 2 (pure cleanup, low risk) to establish a clean baseline.
- **Adopt Phase 8's linting immediately** before starting Phases 3–6 so refactors are verified.
- **Do Phase 7** only after rendering `require`s are removed/centralized (i.e., after Phases 3–6 or alongside them) to avoid breaking the Electron `require` calls.
- Each phase should be a separate commit/PR with its own verification, per the contributing guidance in `docs/DEVELOPMENT.md`.
