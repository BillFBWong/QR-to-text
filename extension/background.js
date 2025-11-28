// Create the context menu item when the extension is installed
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "scan-qr-code",
    title: "Scan QR Code",
    contexts: ["image"]
  });
});

// Helper to open the popup as a detached window
// This ensures it stays open during drag-and-drop operations
function openAppWindow(queryString = '') {
  chrome.windows.create({
    url: 'popup.html' + queryString,
    type: 'popup',
    width: 400,
    height: 600
  });
}

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