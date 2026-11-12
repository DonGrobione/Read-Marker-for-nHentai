"use strict";

// Toolbar button opens the list management page.
browser.action.onClicked.addListener(() => {
  browser.runtime.openOptionsPage();
});
