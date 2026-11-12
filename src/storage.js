"use strict";

/*
 * Shared storage helpers, loaded by the content script and the options page.
 * Each viewed gallery is stored as its own key "g:<id>" in browser.storage.local.
 */
// eslint-disable-next-line no-unused-vars
const ReadMarker = (() => {
  const KEY_PREFIX = "g:";
  // A gallery ID: 1 to 10 digits, no leading zero (so "0" and "0123" are invalid).
  const ID_DIGITS = "[1-9]\\d{0,9}";
  const ID_PATTERN = new RegExp(`^${ID_DIGITS}$`);
  // Only complete gallery URLs, e.g. https://nhentai.net/g/696307/ or a reader
  // page https://nhentai.net/g/696307/3/, optionally with a query or fragment.
  const URL_ID = new RegExp(`^https?://(?:www\\.)?nhentai\\.net/g/(${ID_DIGITS})(?:[/?#].*)?$`);

  function keyFor(id) {
    return KEY_PREFIX + id;
  }

  function idFromKey(key) {
    return key.startsWith(KEY_PREFIX) ? key.slice(KEY_PREFIX.length) : null;
  }

  function normalizeId(value) {
    const text = String(value).trim();
    if (ID_PATTERN.test(text)) {
      return text;
    }
    const match = URL_ID.exec(text);
    return match ? match[1] : null;
  }

  async function loadIds() {
    const items = await browser.storage.local.get(null);
    const ids = new Set();
    for (const key of Object.keys(items)) {
      const id = idFromKey(key);
      if (id !== null) {
        ids.add(id);
      }
    }
    return ids;
  }

  async function addId(id) {
    await browser.storage.local.set({ [keyFor(id)]: true });
  }

  /** Replaces the stored list with exactly the given IDs. */
  async function replaceIds(newIds) {
    const target = new Set(newIds);
    const current = await loadIds();
    const toRemove = [...current].filter((id) => !target.has(id)).map(keyFor);
    const toAdd = {};
    for (const id of target) {
      if (!current.has(id)) {
        toAdd[keyFor(id)] = true;
      }
    }
    if (toRemove.length > 0) {
      await browser.storage.local.remove(toRemove);
    }
    if (Object.keys(toAdd).length > 0) {
      await browser.storage.local.set(toAdd);
    }
  }

  /**
   * Parses a list of gallery IDs from text: either an export file (JSON) or
   * plain text with one ID or gallery URL per line. Empty lines and lines
   * starting with "#" are ignored.
   * Returns { ids: string[], invalid: string[] }.
   */
  function parseIdList(text) {
    let entries;
    try {
      const data = JSON.parse(text);
      if (Array.isArray(data)) {
        entries = data;
      } else if (data && Array.isArray(data.galleries)) {
        entries = data.galleries;
      }
    } catch {
      // Not JSON: treat as plain text below.
    }
    if (entries === undefined) {
      entries = text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line !== "" && !line.startsWith("#"));
    }

    const ids = new Set();
    const invalid = [];
    for (const entry of entries) {
      const id = typeof entry === "string" || typeof entry === "number" ? normalizeId(entry) : null;
      if (id === null) {
        invalid.push(String(entry));
      } else {
        ids.add(id);
      }
    }
    return { ids: [...ids], invalid };
  }

  function sortIds(ids) {
    return [...ids].sort((a, b) => Number(a) - Number(b));
  }

  return { KEY_PREFIX, ID_DIGITS, idFromKey, loadIds, addId, replaceIds, parseIdList, sortIds };
})();
