# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.3] - 2026-11-12

### Added

- List page: link to GitHub Issues for reporting problems and suggesting improvements.

### Changed

- List page: new heading "List of viewed gallery IDs"; the gallery count and the hint are now shown below the list.
- List page: all buttons in one row, renamed to "Save changes", "Discard changes", "Backup Export" and "Backup Import".
- Stricter list validation: gallery IDs with leading zeros (e.g. `0123`) and `0` are rejected, and only complete gallery URLs (`https://nhentai.net/g/<id>/…`) are accepted. Lines that merely contain `/g/<id>` are no longer accepted.

### Fixed

- Singular wording for one gallery: "1 gallery saved." instead of "1 galleries saved." (also in the save, import and export messages).

## [0.1.2] - 2026-11-12

### Added

- New versions are submitted to addons.mozilla.org automatically, with the changelog as version notes.

### Changed

- New icon: a read thumbnail with a green frame and a check badge in front of an unread one.
- Export file name now includes the local time: `read-marker-for-nhentai_<YYYY-MM-DD>_<hh-mm>.json`.
- Clearer import confirmation: "<file> contains n gallery IDs.", an empty line, then "Importing will overwrite your current list of n IDs." The confirm button is now "Overwrite current list".

## [0.1.1] - 2026-11-12

### Added

- GitHub releases: when the version changes on `main`, a release with the `.xpi` is created automatically.

### Fixed

- The green frame was not visible, because the site's cover image covered it. The frame is now drawn on top of the image.

### Changed

- Thicker frame (7px instead of 4px).
- Firefox for Android now requires version 142 or newer (desktop still 140), because Android supports the data collection declaration only from 142. Fixes the AMO validation warning.
- Development: web-ext updated to 10.x, so `npm run lint` matches the checks on addons.mozilla.org.

## [0.1.0] - 2026-11-12

Initial test version.

### Added

- Remembers the ID of every gallery opened on nhentai.net.
- Green frame around thumbnails of already opened galleries on all nhentai.net pages, except for the gallery currently open.
- List management page (toolbar button or add-on options): edit the list, export it as JSON, and import a JSON or text file (import replaces the current list).
- `build.py` to package the extension as an `.xpi` for local testing.
- Dev container with Node.js, web-ext, Python and Firefox for linting and testing.
