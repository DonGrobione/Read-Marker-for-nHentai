"use strict";

/* Options page: edit, import (overwrites the list) and export viewed gallery IDs. */
(() => {
  const EXPORT_FORMAT = "read-marker-for-nhentai";
  const EXPORT_VERSION = 1;

  const listEl = document.getElementById("list");
  const countEl = document.getElementById("count");
  const statusEl = document.getElementById("status");
  const importFileEl = document.getElementById("import-file");
  const importConfirmEl = document.getElementById("import-confirm");
  const importSummaryEl = document.getElementById("import-summary");

  let savedText = "";
  let pendingImport = null;

  function setStatus(message, isError = false) {
    statusEl.textContent = message;
    statusEl.classList.toggle("error", isError);
  }

  function isDirty() {
    return listEl.value !== savedText;
  }

  async function refresh() {
    const ids = ReadMarker.sortIds(await ReadMarker.loadIds());
    savedText = ids.join("\n");
    listEl.value = savedText;
    countEl.textContent = `${galleryCount(ids.length)} saved.`;
  }

  function galleryCount(count) {
    return `${count} galler${count === 1 ? "y" : "ies"}`;
  }

  function describeInvalid(invalid) {
    const sample = invalid.slice(0, 5).join(", ");
    return `${invalid.length} invalid entr${invalid.length === 1 ? "y" : "ies"}: ${sample}${invalid.length > 5 ? ", …" : ""}`;
  }

  async function save() {
    const { ids, invalid } = ReadMarker.parseIdList(listEl.value);
    if (invalid.length > 0) {
      setStatus(`Not saved. ${describeInvalid(invalid)}`, true);
      return;
    }
    await ReadMarker.replaceIds(ids);
    await refresh();
    setStatus(`Saved ${galleryCount(ids.length)}.`);
  }

  function idCount(count) {
    return `${count} gallery ID${count === 1 ? "" : "s"}`;
  }

  // Local date and time, e.g. read-marker-for-nhentai_2026-11-12_19-18.json
  function exportFileName(date) {
    const pad = (value) => String(value).padStart(2, "0");
    const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    const time = `${pad(date.getHours())}-${pad(date.getMinutes())}`;
    return `read-marker-for-nhentai_${day}_${time}.json`;
  }

  async function exportList() {
    const ids = ReadMarker.sortIds(await ReadMarker.loadIds());
    const now = new Date();
    const data = {
      format: EXPORT_FORMAT,
      version: EXPORT_VERSION,
      exported: now.toISOString(),
      galleries: ids,
    };
    const blob = new Blob([JSON.stringify(data, null, 2) + "\n"], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = exportFileName(now);
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    setStatus(`Exported ${galleryCount(ids.length)}.`);
  }

  async function readImportFile() {
    const file = importFileEl.files[0];
    importFileEl.value = "";
    if (!file) {
      return;
    }
    const { ids, invalid } = ReadMarker.parseIdList(await file.text());
    if (invalid.length > 0) {
      pendingImport = null;
      importConfirmEl.hidden = true;
      setStatus(`Import aborted, "${file.name}" contains ${describeInvalid(invalid)}`, true);
      return;
    }
    const currentCount = (await ReadMarker.loadIds()).size;
    pendingImport = ids;
    importSummaryEl.replaceChildren(
      `${file.name} contains ${idCount(ids.length)}.`,
      document.createElement("br"),
      document.createElement("br"),
      `Importing will overwrite your current list of ${currentCount} ID${currentCount === 1 ? "" : "s"}.`
    );
    importConfirmEl.hidden = false;
    setStatus("");
  }

  async function applyImport() {
    if (pendingImport === null) {
      return;
    }
    const ids = pendingImport;
    pendingImport = null;
    importConfirmEl.hidden = true;
    await ReadMarker.replaceIds(ids);
    await refresh();
    setStatus(`Imported ${galleryCount(ids.length)}. The previous list was overwritten.`);
  }

  function cancelImport() {
    pendingImport = null;
    importConfirmEl.hidden = true;
    setStatus("Import cancelled.");
  }

  function guard(action) {
    return () =>
      action().catch((error) => {
        console.error("Read Marker for nHentai:", error);
        setStatus(`Error: ${error.message}`, true);
      });
  }

  document.getElementById("save").addEventListener("click", guard(save));
  document.getElementById("revert").addEventListener("click", guard(async () => {
    await refresh();
    setStatus("Changes discarded.");
  }));
  document.getElementById("export").addEventListener("click", guard(exportList));
  document.getElementById("import").addEventListener("click", () => importFileEl.click());
  importFileEl.addEventListener("change", guard(readImportFile));
  document.getElementById("import-apply").addEventListener("click", guard(applyImport));
  document.getElementById("import-cancel").addEventListener("click", cancelImport);

  // Galleries opened in other tabs: update the list unless the user is editing it.
  browser.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local" || !Object.keys(changes).some((key) => ReadMarker.idFromKey(key) !== null)) {
      return;
    }
    if (isDirty()) {
      setStatus("The list was changed elsewhere. Save to overwrite, or discard to reload.");
    } else {
      guard(refresh)();
    }
  });

  window.addEventListener("beforeunload", (event) => {
    if (isDirty()) {
      event.preventDefault();
    }
  });

  guard(refresh)();
})();
