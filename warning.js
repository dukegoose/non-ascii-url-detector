const params = new URLSearchParams(location.search);
const originalUrl = params.get('original');

// Function to create and append highlighted content safely
function displayHighlightedUrl(url, container) {
  const decoded = decodeURI(url);
  let currentText = '';
  
  for (const char of decoded) {
    if (/[^\x00-\x7F]/.test(char)) {
      // Append any accumulated ASCII text
      if (currentText) {
        container.appendChild(document.createTextNode(currentText));
        currentText = '';
      }
      // Append non-ASCII as bold
      const strong = document.createElement('strong');
      strong.textContent = char;
      container.appendChild(strong);
    } else {
      // Accumulate ASCII characters
      currentText += char;
    }
  }
  
  // Append any remaining ASCII text
  if (currentText) {
    container.appendChild(document.createTextNode(currentText));
  }
}

// Get the container and display the URL safely
const urlContainer = document.getElementById('url');
displayHighlightedUrl(originalUrl, urlContainer);

document.getElementById('proceed').addEventListener('click', () => {
  browser.runtime.sendMessage({ action: 'allow', url: originalUrl });
  location.href = originalUrl;
});

document.getElementById('cancel').addEventListener('click', () => {
  browser.runtime.sendMessage({ action: 'closeTab' });
});