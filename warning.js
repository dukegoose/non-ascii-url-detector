const params = new URLSearchParams(location.search);
const originalUrl = params.get('original');

document.getElementById('url').textContent = originalUrl;

document.getElementById('proceed').addEventListener('click', () => {
  browser.runtime.sendMessage({ action: 'allow', url: originalUrl });
  location.href = originalUrl;
});

document.getElementById('cancel').addEventListener('click', () => {
  browser.runtime.sendMessage({ action: 'closeTab' });
});