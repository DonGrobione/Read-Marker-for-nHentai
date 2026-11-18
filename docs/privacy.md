# Privacy Policy

Last updated: 2026-11-18

This privacy policy explains how the Firefox extension **Read Marker for nHentai** ("the extension") processes data.

## Controller and contact

Questions about privacy can be asked via [GitHub Issues](https://github.com/DonGrobione/Read-Marker-for-nHentai/issues). Do not post personal data there, because issues are public.

## Summary

- The extension stores only one kind of data: the **IDs of nhentai.net galleries you opened** (the "gallery list").
- By default the gallery list is stored **only in your Firefox profile** on your device.
- **Cloud sync is optional** and off by default. If you turn it on, the gallery list is stored in your own Dropbox account, in a folder reserved for the extension.
- The developer **never receives** your gallery list, your Dropbox data or any other data. The extension has no analytics, tracking, advertising or telemetry, and it does not contact any server except Dropbox, and Dropbox only when cloud sync is turned on.

## What data is processed

| Data | Purpose | Where it is stored |
|---|---|---|
| Gallery IDs of nhentai.net galleries you opened (numbers such as `696307`) | Marking thumbnails of galleries you already viewed | Firefox profile (`browser.storage.local`); with cloud sync, also your Dropbox app folder |
| Dropbox access tokens (only with cloud sync) | Accessing the extension's Dropbox app folder on your behalf | Firefox profile (`browser.storage.local`) |
| Sync state (only with cloud sync): time of the last sync, revision of the Dropbox file, and the list as of the last sync | Merging changes from several devices correctly, including removals | Firefox profile (`browser.storage.local`) |

The extension does **not** store page contents, titles, tags, search terms, the times of your visits, your IP address or any other browsing activity. It runs only on `https://nhentai.net/*`.

**Sensitive data:** A list of the adult-content galleries you viewed can reveal information about your sex life or sexual orientation, which counts as a special category of personal data under Art. 9 GDPR. This is why cloud sync is optional and needs your explicit consent, and why the gallery list never leaves your device without it.

## Local storage (default)

Without cloud sync, the gallery list stays on your device in your Firefox profile. Nobody else receives it, including the developer. You control it completely:

- Edit or delete entries on the extension's list page.
- Export the list as a `.json` file (Backup Export). The file is saved on your device only.
- Removing the extension deletes the locally stored list.

## Cloud sync with Dropbox (optional)

### How it works

1. You click *Connect Dropbox* on the extension's list page, allow Firefox to give the extension access to Dropbox, and sign in to Dropbox. Sign-in takes place on Dropbox's own website. The extension never sees your Dropbox password.
2. Dropbox gives the extension access tokens, which are stored in your Firefox profile.
3. The extension uses **"App folder" access** only. It can read and write files only in the folder `Apps/Read Marker for nHentai/` in your Dropbox. It **cannot** see or change any other files in your Dropbox.
4. The extension stores the gallery list in that folder as the file `galleries.json` (same format as the Backup Export: a list of gallery IDs) and keeps it in sync between your devices. It syncs after changes to the list, when Firefox starts, every 10 minutes, and when you click *Sync now*.

Cloud sync is not available in Firefox for Android.

Only the gallery list is synced. No other data is uploaded.

The connection goes directly from your browser to Dropbox, encrypted with HTTPS. There is no server run by the developer in between, so the developer has no access to the synced data.

Dropbox stores and processes the synced data under its own privacy policy: https://www.dropbox.com/privacy

### Legal basis

Cloud sync is based on your **explicit consent**, which you give by clicking *Connect Dropbox*, allowing the access in Firefox, and signing in to Dropbox.

You can **withdraw your consent at any time** without giving reasons. Withdrawal does not affect the lawfulness of processing before it. To withdraw:

- Click *Disconnect* on the extension's list page. This revokes the extension's access at Dropbox and deletes the access tokens and the sync state from your Firefox profile.
- Optionally revoke the extension's access in your [Dropbox account settings](https://www.dropbox.com/account/connected_apps) (*Settings → Connected apps*).
- Delete the folder `Apps/Read Marker for nHentai/` in your Dropbox to remove the synced gallery list.

### Storage period

The synced gallery list stays in your Dropbox until you delete it or the folder, or until your Dropbox account is deleted. Disconnecting or removing the extension does **not** delete the file in your Dropbox automatically.

## No other data processing

- No analytics, telemetry, crash reports or tracking.
- No advertising and no sale or sharing of data with third parties, except Dropbox when you use cloud sync.
- No cookies are set by the extension.
- No remote code is loaded.

The installation and updates of the extension are provided by Mozilla via addons.mozilla.org. Mozilla's privacy policy applies to that: https://www.mozilla.org/privacy/

## Age restriction

nhentai.net hosts sexually explicit content. The extension is intended for adults only.

## Changes to this policy

This policy is updated when the extension's data processing changes. The current version is in this repository at [docs/privacy.md](privacy.md), and the changes can be tracked in its Git history.