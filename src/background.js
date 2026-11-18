"use strict";

// Toolbar button opens the list management page.
browser.action.onClicked.addListener(() => {
  browser.runtime.openOptionsPage();
});

/*
 * Optional Dropbox sync. Runs only here, so there is never more than one sync at
 * a time. Triggers: local list changes (debounced), a periodic alarm, browser
 * start, and "Sync now" / connecting on the options page (runtime message).
 */
const SYNC_SOON_ALARM = "dropbox-sync-soon";
const SYNC_PERIODIC_ALARM = "dropbox-sync-periodic";
const SYNC_DELAY_MINUTES = 0.1;
const SYNC_PERIOD_MINUTES = 10;
const MAX_ATTEMPTS = 3;

let running = null;
let runAgain = false;

/**
 * Three-way merge against the list of the last sync (base), so that removals
 * on either side are kept. Without a base (first sync), the lists are combined.
 */
function mergeIds(local, remote, base) {
  if (base === null) {
    return new Set([...local, ...remote]);
  }
  const merged = new Set();
  for (const id of local) {
    // On both sides, or added locally (a removal in Dropbox wins otherwise).
    if (remote.has(id) || !base.has(id)) {
      merged.add(id);
    }
  }
  for (const id of remote) {
    // Added in Dropbox.
    if (!base.has(id)) {
      merged.add(id);
    }
  }
  return merged;
}

function sameIds(a, b) {
  return a.size === b.size && [...a].every((id) => b.has(id));
}

async function syncOnce() {
  if (!(await ReadMarkerDropbox.hasPermissions())) {
    throw new Error("Permission to access Dropbox is missing. Disconnect and connect again.");
  }
  const file = await ReadMarkerDropbox.download();
  let remote = new Set();
  if (file !== null) {
    const { ids, invalid } = ReadMarker.parseIdList(file.text);
    if (invalid.length > 0) {
      throw new Error("The file galleries.json in your Dropbox is invalid. Delete it to upload your list again.");
    }
    remote = new Set(ids);
  }
  const local = await ReadMarker.loadIds();
  const state = await ReadMarkerDropbox.loadState();
  // A missing file (first sync, or deleted in Dropbox) never removes local entries.
  const base = file !== null && state !== null ? new Set(state.base) : null;
  const merged = mergeIds(local, remote, base);

  let rev = file?.rev ?? null;
  if (file === null || !sameIds(merged, remote)) {
    // Upload first: on a conflict nothing has been changed locally yet.
    rev = await ReadMarkerDropbox.upload(ReadMarker.exportJson(merged), rev);
  }
  if (!(await ReadMarkerDropbox.isConnected())) {
    return;
  }
  // Apply only the difference, so galleries opened during the sync are kept.
  await ReadMarker.removeIds([...local].filter((id) => !merged.has(id)));
  await ReadMarker.addIds([...merged].filter((id) => !local.has(id)));
  await ReadMarkerDropbox.saveState({ rev, base: ReadMarker.sortIds(merged) });
}

async function syncWithRetries() {
  if (!(await ReadMarkerDropbox.isConnected())) {
    return;
  }
  await ReadMarkerDropbox.updateStatus({ state: "syncing" });
  for (let attempt = 1; ; attempt++) {
    try {
      await syncOnce();
      if (await ReadMarkerDropbox.isConnected()) {
        await ReadMarkerDropbox.updateStatus({ state: "ok", lastSync: new Date().toISOString(), message: "" });
      }
      return;
    } catch (error) {
      // The file was changed by another device meanwhile: download and merge again.
      if (ReadMarkerDropbox.isConflict(error) && attempt < MAX_ATTEMPTS) {
        continue;
      }
      console.error("Read Marker for nHentai: Dropbox sync failed:", error);
      if (error.summary === "revoked" || (await ReadMarkerDropbox.isConnected())) {
        await ReadMarkerDropbox.updateStatus({ state: "error", message: error.message });
      }
      return;
    }
  }
}

/** Runs a sync; a request during a running sync runs one more afterwards. */
function requestSync() {
  if (running !== null) {
    runAgain = true;
    return running;
  }
  running = (async () => {
    try {
      do {
        runAgain = false;
        await syncWithRetries();
      } while (runAgain);
    } finally {
      running = null;
    }
  })();
  return running;
}

async function updatePeriodicAlarm() {
  if (await ReadMarkerDropbox.isConnected()) {
    if (!(await browser.alarms.get(SYNC_PERIODIC_ALARM))) {
      browser.alarms.create(SYNC_PERIODIC_ALARM, { periodInMinutes: SYNC_PERIOD_MINUTES });
    }
  } else {
    await browser.alarms.clear(SYNC_PERIODIC_ALARM);
    await browser.alarms.clear(SYNC_SOON_ALARM);
  }
}

browser.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === SYNC_SOON_ALARM || alarm.name === SYNC_PERIODIC_ALARM) {
    requestSync();
  }
});

browser.storage.onChanged.addListener(async (changes, areaName) => {
  if (areaName !== "local") {
    return;
  }
  if (ReadMarkerDropbox.AUTH_KEY in changes) {
    updatePeriodicAlarm();
  }
  if (Object.keys(changes).some((key) => ReadMarker.idFromKey(key) !== null) && (await ReadMarkerDropbox.isConnected())) {
    // Re-creating the alarm restarts the delay, so a burst of changes syncs once.
    browser.alarms.create(SYNC_SOON_ALARM, { delayInMinutes: SYNC_DELAY_MINUTES });
  }
});

browser.runtime.onMessage.addListener((message, sender) => {
  if (sender.id === browser.runtime.id && message?.type === "dropbox-sync") {
    return requestSync();
  }
  return undefined;
});

browser.runtime.onStartup.addListener(() => {
  updatePeriodicAlarm();
  requestSync();
});

browser.runtime.onInstalled.addListener(() => {
  updatePeriodicAlarm();
});
