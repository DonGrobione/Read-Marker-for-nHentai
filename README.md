# Read Marker for nHentai

A Firefox extension that remembers which galleries you opened on [nhentai.net](https://nhentai.net) and puts a **green frame** around their thumbnails, so you can see what you have already viewed.

- Opening a gallery (e.g. `https://nhentai.net/g/696307/`) saves its ID (`696307`).
- Thumbnails of saved galleries get a green frame on all list pages (home, search, tags, …).
- The gallery you are currently viewing is never framed.

## Managing the list

Click the toolbar button (or *Add-ons → Read Marker for nHentai → Options*) to open the list:

- **Edit:** one gallery ID per line. Add, remove or paste gallery URLs, then *Save list*.
- **Export:** saves the list as a `.json` file.
- **Import:** loads a `.json` export or a text file with one ID/URL per line. **Import replaces the current list** (you are asked to confirm).

## Install (local testing)

1. Build the package: `python build.py` → creates `dist/read-marker-for-nhentai-<version>.xpi`
2. In Firefox open `about:debugging#/runtime/this-firefox` → **Load Temporary Add-on…** → select the `.xpi` (or `src/manifest.json`).

Temporary add-ons are removed when Firefox restarts. Permanent installation requires a version signed by Mozilla.

Requires Firefox 140 or newer.

**Development:** open the folder in VS Code → *Reopen in Container*. Then `npm run lint`, `npm run build`, or `npm start` (Firefox with the extension, shown at http://localhost:6080, password `vscode`).

## Data usage

- **What is saved:** only the numeric IDs of galleries you opened. Nothing else (no titles, images, browsing history or personal data).
- **Where:** locally in your Firefox profile (`browser.storage.local`).
- **Shared with:** nobody. The extension makes no network requests and sends no data anywhere.
- **Access:** the extension only runs on `https://nhentai.net`.
- **Export files** are only created when you click *Export* and are saved where you choose.
- **Deleting:** remove IDs on the list page, or remove the extension to delete all saved IDs.

## Disclaimer

This project is not affiliated with, endorsed by, or connected to nhentai.

This extension was created with the help of AI tools.

## License

Licensed under the GNU Affero General Public License v3.0. See [LICENSE](LICENSE).
