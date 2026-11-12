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
- Without VS Code: `docker build -t read-marker-dev .devcontainer`, then run commands with the repo mounted at `/work`.

## Architecture

Everything that ships lives in `src/`:

- `storage.js` holds the shared helpers (global `ReadMarker`: load, add and replace IDs, and parse ID lists from JSON exports or plain text/URLs). It is loaded before `content.js` (manifest `js` array) and before `options/options.js` (a `<script>` tag). The extension uses no modules.
- `content.js` + `content.css` run on `https://nhentai.net/*`. They record gallery IDs and frame thumbnails.
- `options/` is the list-management page (edit, import, export). It opens in a tab. Import replaces the whole list via `ReadMarker.replaceIds` after an inline confirmation, not `confirm()`. Export uses a Blob download, so it needs no `downloads` permission. The JSON format is `{format, version, exported, galleries: [ids]}`.
- `background.js` is a non-persistent event page. Its only job is to open the options page when the toolbar button is clicked.

Content script details:

- **Storage:** `browser.storage.local`, one key per gallery: `"g:<id>": true`. Using one key per gallery (not a single array) avoids read-modify-write races between tabs. `storage.onChanged` keeps open tabs and the options page in sync.
- **Recording:** any path matching `/g/<id>/…` (overview or reader page) records `<id>`.
- **Marking:** links whose path is exactly `/g/<id>/` and that contain an `<img>` get the class `read-marker-viewed` (the frame is an absolutely positioned `::after` border inside the link, with `pointer-events: none`, so the layout does not shift; an `outline` does not work because the site's `.gallery a img { position: absolute }` paints the cover over it). Links to the currently open gallery are never marked. Reader links `/g/<id>/<page>/` (the cover and page thumbnails on a gallery page) intentionally do not match.
- **SPA handling:** nhentai.net is a SvelteKit single-page app, so navigation does not reload the page. A debounced `MutationObserver` (plus `popstate`) re-checks `location.href` and re-marks the thumbnails. The class is toggled only when it actually changes, to avoid observer feedback loops.

Site markup for a thumbnail: `<div class="gallery …"><a href="/g/<id>/" class="cover"><img …><div class="caption">…</div></a></div>`. Check the live site when the markup may have changed.

## Constraints

- Keep to Firefox add-on policies: minimal permissions (`storage` plus the single host match), no remote code, no `eval`/`innerHTML` with site data, no network requests. `data_collection_permissions` is `["none"]` in the manifest, so the README's "Data usage" section and the manifest must stay accurate if storage behavior changes.
- The gecko `id` in the manifest becomes permanent after the first upload to addons.mozilla.org.
- Keep the README short and aimed at end users. It must keep the AI-tools note, the license reference, the "not affiliated with nhentai" disclaimer and the data-usage section.
- Versioning: the project is pre-release (0.x). `src/manifest.json` is the source of truth for the version. Keep `package.json` and `package-lock.json` in sync with it. Record user-facing changes in `CHANGELOG.md` (Keep a Changelog format) under `[Unreleased]`, or under the current unreleased version.
- The git remote `origin` is https://github.com/DonGrobione/Read-Marker-for-nHentai. Push only when the user asks.
