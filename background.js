let allowedUrls = new Set();

function isSuspicious(url) {
  try {
    const urlObj = new URL(url);
    
    // Check for IDN (Punycode) domains, which indicate non-ASCII in the displayed hostname
    const hasIdn = urlObj.hostname.split('.').some(part => part.toLowerCase().startsWith('xn--'));
    
    // Decode the full URL (affects path/query) and check for non-ASCII characters
    const decoded = decodeURI(url);
    const hasNonAscii = /[^\x00-\x7F]/.test(decoded);
    
    return hasIdn || hasNonAscii;
  } catch (e) {
    return false;
  }
}

browser.webRequest.onBeforeRequest.addListener(
  details => {
    if (details.type === 'main_frame') {  // Only check top-level page loads
      const url = details.url;
      if (allowedUrls.has(url)) {
        allowedUrls.delete(url);
        return;  // Allow this time
      }
      if (isSuspicious(url)) {
        return { redirectUrl: browser.runtime.getURL(`warning.html?original=${encodeURIComponent(url)}`) };
      }
    }
  },
  { urls: ['<all_urls>'] },
  ['blocking']
);

browser.runtime.onMessage.addListener((message, sender) => {
  if (message.action === 'allow') {
    allowedUrls.add(message.url);
  } else if (message.action === 'closeTab') {
    browser.tabs.remove(sender.tab.id);
  }
});