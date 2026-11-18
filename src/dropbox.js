"use strict";

/*
 * Dropbox helpers for the optional cloud sync, loaded by the background page and
 * the options page. Sign-in uses OAuth 2 with PKCE (no client secret). The app
 * has "App folder" access, so the gallery list is stored as /galleries.json in
 * Apps/Read Marker for nHentai/ and no other files are accessible.
 *
 * Storage keys (browser.storage.local):
 *   "dropbox:auth"   { refreshToken, accessToken, expiresAt }
 *   "dropbox:state"  { rev, base: [ids] }   file revision and list at the last sync
 *   "dropbox:status" { state: "syncing" | "ok" | "error", lastSync, message }
 */
// eslint-disable-next-line no-unused-vars
const ReadMarkerDropbox = (() => {
  const APP_KEY = "9v2o51bmx3zhc7q";
  const FILE_PATH = "/galleries.json";
  const API = "https://api.dropboxapi.com";
  const CONTENT = "https://content.dropboxapi.com";
  const ORIGINS = [`${API}/*`, `${CONTENT}/*`];
  const DATA_COLLECTION = ["browsingActivity"];
  const AUTH_KEY = "dropbox:auth";
  const STATE_KEY = "dropbox:state";
  const STATUS_KEY = "dropbox:status";
  // Refresh the access token this long before it expires.
  const EXPIRY_MARGIN_MS = 60 * 1000;

  class DropboxError extends Error {
    constructor(message, status = 0, summary = "") {
      super(message);
      this.status = status;
      this.summary = summary;
    }
  }

  /** Firefox for Android has no browser.identity, so sign-in is not possible there. */
  function isAvailable() {
    return typeof browser.identity?.launchWebAuthFlow === "function";
  }

  /** Must be called directly in a click handler, before any await. */
  function requestPermissions() {
    try {
      return browser.permissions.request({ origins: ORIGINS, data_collection: DATA_COLLECTION });
    } catch {
      // Firefox versions without data collection permissions reject the key.
      return browser.permissions.request({ origins: ORIGINS });
    }
  }

  async function removePermissions() {
    try {
      await browser.permissions.remove({ origins: ORIGINS, data_collection: DATA_COLLECTION });
    } catch {
      await browser.permissions.remove({ origins: ORIGINS });
    }
  }

  function hasPermissions() {
    return browser.permissions.contains({ origins: ORIGINS });
  }

  async function getItem(key) {
    return (await browser.storage.local.get(key))[key];
  }

  async function isConnected() {
    return (await getItem(AUTH_KEY)) !== undefined;
  }

  function base64Url(bytes) {
    return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  function randomString(byteCount) {
    return base64Url(crypto.getRandomValues(new Uint8Array(byteCount)));
  }

  async function pkceChallenge(verifier) {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
    return base64Url(new Uint8Array(digest));
  }

  async function tokenRequest(params) {
    const response = await fetch(`${API}/oauth2/token`, {
      method: "POST",
      body: new URLSearchParams({ ...params, client_id: APP_KEY }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = data.error_description || data.error || `HTTP ${response.status}`;
      throw new DropboxError(`Dropbox sign-in failed: ${message}`, response.status, data.error || "");
    }
    return data;
  }

  function authFrom(data, refreshToken) {
    return {
      refreshToken,
      accessToken: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000 - EXPIRY_MARGIN_MS,
    };
  }

  /** Opens the Dropbox sign-in window and stores the tokens. */
  async function connect() {
    const redirectUri = browser.identity.getRedirectURL();
    const verifier = randomString(48);
    const state = randomString(16);
    const url = new URL("https://www.dropbox.com/oauth2/authorize");
    url.search = new URLSearchParams({
      client_id: APP_KEY,
      response_type: "code",
      redirect_uri: redirectUri,
      code_challenge: await pkceChallenge(verifier),
      code_challenge_method: "S256",
      token_access_type: "offline",
      state,
    }).toString();

    const params = new URL(await browser.identity.launchWebAuthFlow({ url: url.href, interactive: true })).searchParams;
    if (params.get("state") !== state) {
      throw new DropboxError("Dropbox sign-in failed: unexpected response.");
    }
    if (params.has("error")) {
      throw new DropboxError(`Dropbox sign-in failed: ${params.get("error_description") || params.get("error")}`);
    }
    const data = await tokenRequest({
      grant_type: "authorization_code",
      code: params.get("code"),
      code_verifier: verifier,
      redirect_uri: redirectUri,
    });
    await browser.storage.local.remove([STATE_KEY, STATUS_KEY]);
    await browser.storage.local.set({ [AUTH_KEY]: authFrom(data, data.refresh_token) });
  }

  async function getAccessToken(forceRefresh = false) {
    const auth = await getItem(AUTH_KEY);
    if (auth === undefined) {
      throw new DropboxError("Not connected to Dropbox.", 0, "not_connected");
    }
    if (!forceRefresh && auth.expiresAt > Date.now()) {
      return auth.accessToken;
    }
    let data;
    try {
      data = await tokenRequest({ grant_type: "refresh_token", refresh_token: auth.refreshToken });
    } catch (error) {
      if (error.summary === "invalid_grant") {
        await browser.storage.local.remove([AUTH_KEY, STATE_KEY]);
        throw new DropboxError("Dropbox access was revoked. Connect again to sync.", error.status, "revoked");
      }
      throw error;
    }
    const updated = authFrom(data, auth.refreshToken);
    // Do not bring back the tokens if the user disconnected meanwhile.
    if (await isConnected()) {
      await browser.storage.local.set({ [AUTH_KEY]: updated });
    }
    return updated.accessToken;
  }

  /** POST to the Dropbox API; refreshes the access token once on 401. */
  async function call(url, headers = {}, body = undefined) {
    for (let attempt = 0; ; attempt++) {
      const token = await getAccessToken(attempt > 0);
      const response = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, ...headers },
        body,
      });
      if (response.status === 401 && attempt === 0) {
        continue;
      }
      if (!response.ok) {
        const text = await response.text().catch(() => "");
        let summary = "";
        try {
          summary = JSON.parse(text).error_summary || "";
        } catch {
          // Not JSON (e.g. a plain-text error message).
        }
        const detail = summary || text.slice(0, 200);
        throw new DropboxError(`Dropbox error ${response.status}${detail ? `: ${detail}` : ""}`, response.status, summary);
      }
      return response;
    }
  }

  /** Returns { text, rev } of the gallery list file, or null if it does not exist. */
  async function download() {
    try {
      const response = await call(`${CONTENT}/2/files/download`, {
        "Dropbox-API-Arg": JSON.stringify({ path: FILE_PATH }),
      });
      const metadata = JSON.parse(response.headers.get("Dropbox-API-Result"));
      return { text: await response.text(), rev: metadata.rev };
    } catch (error) {
      if (error.status === 409 && error.summary.startsWith("path/not_found")) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Writes the gallery list file and returns its new revision. With a revision,
   * the upload fails with a conflict (see isConflict) if the file was changed
   * since; without one, it fails if the file already exists.
   */
  async function upload(text, rev) {
    const mode = rev ? { ".tag": "update", update: rev } : { ".tag": "add" };
    const response = await call(
      `${CONTENT}/2/files/upload`,
      {
        "Content-Type": "application/octet-stream",
        "Dropbox-API-Arg": JSON.stringify({ path: FILE_PATH, mode, autorename: false, mute: true }),
      },
      text
    );
    return (await response.json()).rev;
  }

  function isConflict(error) {
    return error instanceof DropboxError && error.status === 409 && error.summary.includes("conflict");
  }

  /** Revokes the tokens at Dropbox (best effort) and forgets them locally. */
  async function disconnect() {
    try {
      const token = await getAccessToken();
      await fetch(`${API}/2/auth/token/revoke`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
    } catch (error) {
      console.warn("Read Marker for nHentai: could not revoke the Dropbox token:", error);
    }
    await browser.storage.local.remove([AUTH_KEY, STATE_KEY, STATUS_KEY]);
  }

  async function loadState() {
    return (await getItem(STATE_KEY)) ?? null;
  }

  async function saveState(state) {
    await browser.storage.local.set({ [STATE_KEY]: state });
  }

  async function loadStatus() {
    return (await getItem(STATUS_KEY)) ?? null;
  }

  /** Merges the given fields into the stored sync status. */
  async function updateStatus(fields) {
    const status = { ...(await loadStatus()), ...fields };
    await browser.storage.local.set({ [STATUS_KEY]: status });
  }

  return {
    AUTH_KEY,
    STATUS_KEY,
    isAvailable,
    requestPermissions,
    removePermissions,
    hasPermissions,
    isConnected,
    connect,
    disconnect,
    download,
    upload,
    isConflict,
    loadState,
    saveState,
    loadStatus,
    updateStatus,
  };
})();
