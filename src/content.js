"use strict";

/*
 * nHentai Gallery Remember - content script
 *
 * 1. When a gallery page (/g/<id>/...) is shown, its ID is stored in
 *    browser.storage.local (one key per gallery: "g:<id>").
 * 2. Every thumbnail link to a stored gallery (/g/<id>/ containing an <img>)
 *    gets the CSS class "ngr-viewed", which draws a green frame.
 *
 * nhentai.net is a single-page app: navigation does not reload the page, so a
 * MutationObserver re-checks the URL and the thumbnails after DOM updates.
 */
(() => {
  const KEY_PREFIX = "g:";
  const VIEWED_CLASS = "ngr-viewed";
  // Any page of a gallery (overview or reader) counts as "opened".
  const GALLERY_PAGE = /^\/g\/(\d+)(?:\/|$)/;
  // Thumbnails link to the gallery overview only; reader links (/g/<id>/<page>/)
  // are page thumbnails inside a gallery and must not be framed.
  const THUMBNAIL_LINK = /^\/g\/(\d+)\/?$/;
  const UPDATE_DELAY_MS = 100;

  const viewed = new Set();
  let lastUrl = null;
  let currentGalleryId = null;
  let updateTimer = null;

  function galleryIdFromPath(pathname) {
    const match = GALLERY_PAGE.exec(pathname);
    return match ? match[1] : null;
  }

  async function loadViewed() {
    const items = await browser.storage.local.get(null);
    for (const key of Object.keys(items)) {
      if (key.startsWith(KEY_PREFIX)) {
        viewed.add(key.slice(KEY_PREFIX.length));
      }
    }
  }

  function recordCurrentGallery() {
    currentGalleryId = galleryIdFromPath(location.pathname);
    if (!currentGalleryId || viewed.has(currentGalleryId)) {
      return;
    }
    viewed.add(currentGalleryId);
    browser.storage.local
      .set({ [KEY_PREFIX + currentGalleryId]: true })
      .catch((error) => console.error("nHentai Gallery Remember: saving failed", error));
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

  // Keep this tab in sync when galleries are opened in other tabs.
  function onStorageChanged(changes, areaName) {
    if (areaName !== "local") {
      return;
    }
    for (const [key, change] of Object.entries(changes)) {
      if (!key.startsWith(KEY_PREFIX)) {
        continue;
      }
      const id = key.slice(KEY_PREFIX.length);
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
      await loadViewed();
    } catch (error) {
      console.error("nHentai Gallery Remember: loading failed", error);
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
