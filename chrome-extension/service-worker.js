// Minimal background for identity and future alarms/storage
chrome.runtime.onInstalled.addListener(() => {
  console.log('Job Tracker (Chrome) installed');
});

// Placeholder for future message-based APIs
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'getToken') {
    chrome.identity.getAuthToken({ interactive: message.interactive === true }, (token) => {
      if (chrome.runtime.lastError || !token) {
        sendResponse({ ok: false, error: chrome.runtime.lastError?.message || 'No token' });
      } else {
        sendResponse({ ok: true, token });
      }
    });
    return true;
  }

  if (message?.type === 'removeToken' && message.token) {
    chrome.identity.removeCachedAuthToken({ token: message.token }, () => {
      sendResponse({ ok: true });
    });
    return true;
  }
});


