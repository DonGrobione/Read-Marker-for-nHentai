# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Firefox extension (Manifest V3, plain JavaScript, no build tooling or dependencies) that stores the IDs of opened nhentai.net galleries and draws a green frame around thumbnails of already-opened galleries. Licensed AGPL-3.0 (`LICENSE`).

## Commands

- Build the installable package: `python build.py` → `dist/read-marker-for-nhentai-<version>.xpi` (version comes from `src/manifest.json`). Do not package with PowerShell `Compress-Archive`, because it can write backslash paths that Firefox rejects.
- Test: Firefox → `about:debugging#/runtime/this-firefox` → "Load Temporary Add-on…" → select the `.xpi` or `src/manifest.json`. There is no automated test suite.
- Node.js is not installed on the Windows host. Node tooling runs in the dev container (`.devcontainer/`: Node 22, Python 3, current Firefox from Mozilla's APT repo, and a desktop-lite noVNC desktop at http://localhost:6080, password `vscode`). Inside the container:
  - `npm run lint` runs `web-ext lint` (addons-linter, the same checks AMO uses). Keep it at 0 errors and 0 warnings.
  - `npm run build` runs `build.py`.
  - `npm start` runs `web-ext run`, which starts Firefox on the noVNC desktop with the extension loaded and live reload.
- Without VS Code: `docker build -t read-marker-dev .devcontainer`, then run commands with the repo mounted at `/work` and a named volume on `/work/node_modules` (e.g. `-v read-marker-node_modules:/work/node_modules`).
- `node_modules` must stay out of the repo folder on the host: the repo is in a HiDrive-synced folder, and npm's `.bin` entries are Linux symlinks that the sync client cannot handle. The dev container therefore mounts it as the Docker volume `read-marker-node_modules`.

## Architecture

Everything that ships lives in `src/`:

- `storage.js` holds the shared helpers (global `ReadMarker`: load, add, remove and replace IDs, parse ID lists from JSON exports or plain text/URLs, and `exportJson`). It is loaded before `content.js` (manifest `js` array), before `background.js` (manifest `background.scripts`) and before `options/options.js` (a `<script>` tag). The extension uses no modules.
- `dropbox.js` (global `ReadMarkerDropbox`) is the Dropbox client for the optional cloud sync, loaded by the background page and the options page: OAuth 2 with PKCE via `browser.identity.launchWebAuthFlow` (app key in the file, no client secret, refresh tokens via `token_access_type=offline`), download/upload of `/galleries.json` in the app folder with revision checks, token revocation on disconnect. Its storage keys are `dropbox:auth`, `dropbox:state` (file `rev` and `base`, the list at the last sync) and `dropbox:status`.
- `content.js` + `content.css` run on `https://nhentai.net/*`. They record gallery IDs and frame thumbnails.
- `options/` is the list-management page (edit, import, export). It opens in a tab. Import replaces the whole list via `ReadMarker.replaceIds` after an inline confirmation, not `confirm()`. Export uses a Blob download, so it needs no `downloads` permission. The JSON format is `{format, version, exported, galleries: [ids]}`.
- `background.js` is a non-persistent event page. It opens the options page when the toolbar button is clicked and runs the Dropbox sync (only there, so syncs never overlap). Sync is a three-way merge of local, remote and `base`, so removals propagate; without `base` or without a remote file the lists are combined, so nothing is lost. It uploads first (an update with the known `rev`, retried on conflict) and then applies only the difference locally, so galleries opened during a sync are kept. Triggers: list changes (debounced `alarms`), a 10-minute alarm, browser start, and the `dropbox-sync` runtime message from the options page (connect, *Sync now*).

Content script details:

- **Storage:** `browser.storage.local`, one key per gallery: `"g:<id>": true`. Using one key per gallery (not a single array) avoids read-modify-write races between tabs. `storage.onChanged` keeps open tabs and the options page in sync.
- **Recording:** any path matching `/g/<id>/…` (overview or reader page) records `<id>`.
- **Marking:** links whose path is exactly `/g/<id>/` and that contain an `<img>` get the class `read-marker-viewed` (the frame is an absolutely positioned `::after` border inside the link, with `pointer-events: none`, so the layout does not shift; an `outline` does not work because the site's `.gallery a img { position: absolute }` paints the cover over it). Links to the currently open gallery are never marked. Reader links `/g/<id>/<page>/` (the cover and page thumbnails on a gallery page) intentionally do not match.
- **SPA handling:** nhentai.net is a SvelteKit single-page app, so navigation does not reload the page. A debounced `MutationObserver` (plus `popstate`) re-checks `location.href` and re-marks the thumbnails. The class is toggled only when it actually changes, to avoid observer feedback loops.

Site markup for a thumbnail: `<div class="gallery …"><a href="/g/<id>/" class="cover"><img …><div class="caption">…</div></a></div>`. Check the live site when the markup may have changed.

## Constraints

- Keep to Firefox add-on policies: minimal permissions (`storage`, `identity`, `alarms`, the single content-script host match; the Dropbox API hosts are `optional_host_permissions` requested on *Connect Dropbox*), no remote code, no `eval`/`innerHTML` with site data, and no network requests except to Dropbox when the user turned on sync. `data_collection_permissions` has `required: ["none"]` and `optional: ["browsingActivity"]` (requested together with the Dropbox hosts). The README's privacy section, `docs/privacy.md` and the manifest must stay accurate if storage or sync behavior changes.
- Dropbox app (key `9v2o51bmx3zhc7q`, "App folder" access, scopes `files.content.read`/`files.content.write`). Its OAuth redirect URI must be `browser.identity.getRedirectURL()`, which derives from the gecko `id`: `https://1ca24fd52d9b62b6348cda47d89d6622e7594bc2.extensions.allizom.org/`.
- The gecko `id` in the manifest becomes permanent after the first upload to addons.mozilla.org.
- Keep the README short and aimed at end users. It must keep the AI-tools note, the license reference, the "not affiliated with nhentai" disclaimer and the data-usage section.
- Releases: `.github/workflows/release.yml` runs on pushes to `main` that touch `src/manifest.json`. If no tag `v<version>` exists, it checks that `package.json` has the same version, lints with warnings as errors, builds the `.xpi`, submits the version to addons.mozilla.org (`web-ext sign --channel listed`, without waiting for review; repository secrets `AMO_JWT_ISSUER` and `AMO_JWT_SECRET`), and then creates a GitHub release. Both get the `CHANGELOG.md` section for that version as notes (for AMO with `###` headings turned into bold text, as `en-US`). A missing changelog section fails the run. Changing the version and pushing therefore publishes to AMO and GitHub, so the changelog section must be ready first, and a version number sent to AMO can never be reused. The GitHub release `.xpi` is unsigned.
- Versioning: the project is pre-release (0.x). `src/manifest.json` is the source of truth for the version. Keep `package.json` and `package-lock.json` in sync with it. Record user-facing changes in `CHANGELOG.md` (Keep a Changelog format) directly in a `## [<version>] - <YYYY-MM-DD>` section for the next version, never under `[Unreleased]`: work happens on feature branches, and merging a branch into `main` releases it, so every branch must be release-ready when merged (changelog section, version bump, README and `docs/privacy.md` accurate). Set the date to the merge date. Versions already published (tags `v<version>`) must never be reused. As soon as anything in `src/` changes after a release, bump the version (manifest, `package.json`, `package-lock.json`) before building, so a local `.xpi` never overwrites a published version's file with different content. Pushing that bump publishes the version (see Releases), so push only when the user asks.
- The git remote `origin` is https://github.com/DonGrobione/Read-Marker-for-nHentai. Push only when the user asks.
