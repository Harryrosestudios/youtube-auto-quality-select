// Background service worker for YouTube Auto Quality Select extension

// Initialize default settings when extension is installed
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.set({
    autoHighest: false,
    autoPreferred: true,
    preferredQuality: '1080',
    autoFallback: false,
    fallbackQuality: '720'
  });
});

// Handle messages from content script and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'getSettings':
      chrome.storage.sync.get([
        'autoHighest',
        'autoPreferred', 
        'preferredQuality',
        'autoFallback',
        'fallbackQuality'
      ], (result) => {
        sendResponse(result);
      });
      return true; // Keep message channel open for async response
      
    case 'saveSettings':
      chrome.storage.sync.set(request.settings, () => {
        sendResponse({ success: true });
      });
      return true;
      
    case 'logError':
      console.error('YouTube Auto Quality Select Error:', request.error);
      break;
      
    case 'logInfo':
      console.log('YouTube Auto Quality Select:', request.message);
      break;
  }
});


// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  chrome.action.openPopup();
});
