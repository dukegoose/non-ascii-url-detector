const params = new URLSearchParams(location.search);
const originalUrl = params.get('original');

// Function to highlight non-ASCII characters by wrapping them in <strong>
function highlightNonAscii(url) {
  // Decode to show actual characters
  const decoded = decodeURI(url);
  return decoded.replace(/[^\x00-\x7F]/g, '<strong>$&</strong>');
}

// Display the highlighted URL in the address bar
document.getElementById('url').innerHTML = highlightNonAscii(originalUrl);

document.getElementById('proceed').addEventListener('click', () => {
  browser.runtime.sendMessage({ action: 'allow', url: originalUrl });
  location.href = originalUrl;
});

document.getElementById('cancel').addEventListener('click', () => {
  browser.runtime.sendMessage({ action: 'closeTab' });
});