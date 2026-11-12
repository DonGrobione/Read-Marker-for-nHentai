# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Firefox extension (Manifest V3, plain JavaScript, no build tooling or dependencies) that stores the IDs of opened nhentai.net galleries and draws a green frame around thumbnails of already-opened galleries. Licensed AGPL-3.0 (`LICENSE`).

## Commands

- Build the installable package: `python build.py` → `dist/nhentai-gallery-remember-<version>.xpi` (version comes from `src/manifest.json`). Do not package with PowerShell `Compress-Archive`, because it can write backslash paths that Firefox rejects.
- Test: Firefox → `about:debugging#/runtime/this-firefox` → "Load Temporary Add-on…" → select the `.xpi` or `src/manifest.json`. There is no automated test suite.
- Optional lint (needs Node.js, which is not installed by default here): `npx web-ext lint --source-dir src`

## Architecture

Everything that ships lives in `src/`. There is no background script. A single content script (`src/content.js` + `src/content.css`) runs on `https://nhentai.net/*`:

- **Storage:** `browser.storage.local`, one key per gallery: `"g:<id>": true`. Using one key per gallery (not a single array) avoids read-modify-write races between tabs. `storage.onChanged` keeps open tabs in sync.
- **Recording:** any path matching `/g/<id>/…` (overview or reader page) records `<id>`.
- **Marking:** links whose path is exactly `/g/<id>/` and that contain an `<img>` get the class `ngr-viewed` (an outline with a negative offset, so the layout does not shift). Links to the currently open gallery are never marked. Reader links `/g/<id>/<page>/` (the cover and page thumbnails on a gallery page) intentionally do not match.
- **SPA handling:** nhentai.net is a SvelteKit single-page app, so navigation does not reload the page. A debounced `MutationObserver` (plus `popstate`) re-checks `location.href` and re-marks the thumbnails. The class is toggled only when it actually changes, to avoid observer feedback loops.

Site markup for a thumbnail: `<div class="gallery …"><a href="/g/<id>/" class="cover"><img …><div class="caption">…</div></a></div>`. `Example/` holds a saved copy of the home page for reference. It is git-ignored third-party content and must not be committed.

## Constraints

- Keep to Firefox add-on policies: minimal permissions (`storage` plus the single host match), no remote code, no `eval`/`innerHTML` with site data, no network requests. `data_collection_permissions` is `["none"]` in the manifest, so the README's "Data usage" section and the manifest must stay accurate if storage behavior changes.
- The gecko `id` in the manifest becomes permanent after the first upload to addons.mozilla.org.
- Keep the README short and aimed at end users. It must keep the AI-tools note, the license reference, the "not affiliated with nhentai" disclaimer and the data-usage section.
- The git repo is local only. Do not add a remote or push.
