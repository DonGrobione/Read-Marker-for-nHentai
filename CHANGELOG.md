# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.1] - not yet released

### Fixed

- The green frame was not visible, because the site's cover image covered it. The frame is now drawn on top of the image.

### Changed

- Thicker frame (7px instead of 4px).
- Firefox for Android now requires version 142 or newer (desktop still 140), because Android supports the data collection declaration only from 142. Fixes the AMO validation warning.
- Development: web-ext updated to 10.x, so `npm run lint` matches the checks on addons.mozilla.org.

## [0.1.0] - not yet released

Initial test version.

### Added

- Remembers the ID of every gallery opened on nhentai.net.
- Green frame around thumbnails of already opened galleries on all nhentai.net pages, except for the gallery currently open.
- List management page (toolbar button or add-on options): edit the list, export it as JSON, and import a JSON or text file (import replaces the current list).
- `build.py` to package the extension as an `.xpi` for local testing.
- Dev container with Node.js, web-ext, Python and Firefox for linting and testing.
