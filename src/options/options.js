"use strict";

/* Options page: edit, import (replaces the list) and export viewed gallery IDs. */
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
    countEl.textContent = String(ids.length);
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
    setStatus(`Saved ${ids.length} galleries.`);
  }

  async function exportList() {
    const ids = ReadMarker.sortIds(await ReadMarker.loadIds());
    const data = {
      format: EXPORT_FORMAT,
      version: EXPORT_VERSION,
      exported: new Date().toISOString(),
      galleries: ids,
    };
    const blob = new Blob([JSON.stringify(data, null, 2) + "\n"], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `read-marker-for-nhentai-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    setStatus(`Exported ${ids.length} galleries.`);
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
    importSummaryEl.textContent =
      `"${file.name}" contains ${ids.length} galleries. Importing replaces the current list ` +
      `of ${currentCount} galleries.`;
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
    setStatus(`Imported ${ids.length} galleries. The previous list was replaced.`);
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
