const MENU_ID = "ask-wibu";

// Create the right-click menu when the extension is installed or refreshed.
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: MENU_ID,
      title: "Ask Wibu",
      contexts: ["selection"]
    });
  });

  // Also let users open the panel by clicking the extension icon.
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== MENU_ID || !tab?.windowId) {
    return;
  }

  const selectedText = (info.selectionText || "").trim();

  console.log("Ask Wibu clicked");
  console.log("Selected text:", selectedText);

  // Open side panel FIRST.
  // Do not await anything before this.
  chrome.sidePanel.open({ windowId: tab.windowId })
    .then(() => {
      console.log("Side panel opened");
    })
    .catch((error) => {
      console.error("Side panel failed to open:", error);
    });

  // Store selected text AFTER trying to open the panel.
  chrome.storage.local.set({
    selectedText: selectedText,
    selectedAt: Date.now(),
    selectedSource: "context-menu"
  }).then(() => {
    console.log("Selected text stored");
  }).catch((error) => {
    console.error("Failed to store selected text:", error);
  });
});
