
let popupWindowId = null;

// Create the context menu item when the extension is installed
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "scan-qr-code",
    title: "Scan QR Code",
    contexts: ["image"]
  });
});

// Helper to open the popup or focus it if already open
function openAppWindow(queryString = '') {
  const url = 'popup.html' + queryString;

  if (popupWindowId !== null) {
    // Check if window still exists
    chrome.windows.get(popupWindowId, {}, (window) => {
      if (chrome.runtime.lastError || !window) {
        // Window was closed externally, create new
        createWindow(url);
      } else {
        // Window exists: Bring to front
        chrome.windows.update(popupWindowId, { focused: true, drawAttention: true });
        
        // If we have a new query string (new scan), reload the tab inside the window
        if (queryString) {
           chrome.tabs.query({ windowId: popupWindowId }, (tabs) => {
             if (tabs.length > 0) {
               chrome.tabs.update(tabs[0].id, { url: url });
             }
           });
        }
      }
    });
  } else {
    createWindow(url);
  }
}

function createWindow(url) {
  chrome.windows.create({
    url: url,
    type: 'popup',
    width: 400,
    height: 600
  }, (win) => {
    popupWindowId = win.id;
  });
}

// Reset ID when window is closed
chrome.windows.onRemoved.addListener((winId) => {
  if (winId === popupWindowId) {
    popupWindowId = null;
  }
});

// Handle the context menu click
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "scan-qr-code" && info.srcUrl) {
    // Pass the image URL to the popup
    openAppWindow(`?src=${encodeURIComponent(info.srcUrl)}`);
  }
});

// Handle the extension icon click (toolbar)
chrome.action.onClicked.addListener((tab) => {
  openAppWindow();
});
