"use strict";

/*
 * Read Marker for nHentai - content script (uses ReadMarker from storage.js)
 *
 * 1. When a gallery page (/g/<id>/...) is shown, its ID is stored.
 * 2. Every thumbnail link to a stored gallery (/g/<id>/ containing an <img>)
 *    gets the CSS class "read-marker-viewed", which draws a green frame. The gallery
 *    that is currently open is never framed.
 *
 * nhentai.net is a single-page app: navigation does not reload the page, so a
 * MutationObserver re-checks the URL and the thumbnails after DOM updates.
 */
(() => {
  const VIEWED_CLASS = "read-marker-viewed";
  // Any page of a gallery (overview or reader) counts as "opened".
  // IDs use the same rule as the options page (no leading zero), so nothing is
  // recorded that the list editor would reject.
  const GALLERY_PAGE = new RegExp(`^/g/(${ReadMarker.ID_DIGITS})(?:/|$)`);
  // Thumbnails link to the gallery overview only; reader links (/g/<id>/<page>/)
  // are page thumbnails inside a gallery and must not be framed.
  const THUMBNAIL_LINK = new RegExp(`^/g/(${ReadMarker.ID_DIGITS})/?$`);
  const UPDATE_DELAY_MS = 100;

  let viewed = new Set();
  let lastUrl = null;
  let currentGalleryId = null;
  let updateTimer = null;

  function recordCurrentGallery() {
    const match = GALLERY_PAGE.exec(location.pathname);
    currentGalleryId = match ? match[1] : null;
    if (!currentGalleryId || viewed.has(currentGalleryId)) {
      return;
    }
    viewed.add(currentGalleryId);
    ReadMarker.addId(currentGalleryId).catch((error) =>
      console.error("Read Marker for nHentai: saving failed", error)
    );
  }

  function markThumbnails() {
    for (const link of document.querySelectorAll('a[href*="/g/"]')) {
      let id = null;
      if (link.hostname === location.hostname && link.querySelector("img")) {
        const match = THUMBNAIL_LINK.exec(link.pathname);
        id = match ? match[1] : null;
      }
      const shouldMark = id !== null && id !== currentGalleryId && viewed.has(id);
      // Only touch the DOM when something changes, so our own class changes
      // do not keep re-triggering the MutationObserver.
      if (link.classList.contains(VIEWED_CLASS) !== shouldMark) {
        link.classList.toggle(VIEWED_CLASS, shouldMark);
      }
    }
  }

  function update() {
    updateTimer = null;
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      recordCurrentGallery();
    }
    markThumbnails();
  }

  function scheduleUpdate() {
    if (updateTimer === null) {
      updateTimer = setTimeout(update, UPDATE_DELAY_MS);
    }
  }

  // Keep this tab in sync with other tabs and with edits/imports on the options page.
  function onStorageChanged(changes, areaName) {
    if (areaName !== "local") {
      return;
    }
    for (const [key, change] of Object.entries(changes)) {
      const id = ReadMarker.idFromKey(key);
      if (id === null) {
        continue;
      }
      if ("newValue" in change) {
        viewed.add(id);
      } else {
        viewed.delete(id);
      }
    }
    scheduleUpdate();
  }

  async function init() {
    try {
      viewed = await ReadMarker.loadIds();
    } catch (error) {
      console.error("Read Marker for nHentai: loading failed", error);
    }
    update();
    browser.storage.onChanged.addListener(onStorageChanged);
    window.addEventListener("popstate", scheduleUpdate);
    new MutationObserver(scheduleUpdate).observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["href", "class"],
    });
  }

  init();
})();
