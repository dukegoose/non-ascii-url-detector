const params = new URLSearchParams(location.search);
const originalUrl = params.get('original');

// Punycode decoder (public domain implementation based on RFC 3492)
var punycode = (function() {
  var maxInt = 2147483647,
      base = 36,
      tMin = 1,
      tMax = 26,
      skew = 38,
      damp = 700,
      initialBias = 72,
      initialN = 128,
      delimiter = '-',
      regexPunycode = /^xn--/,
      regexNonASCII = /[^\x20-\x7E]/,
      regexSeparators = /[\x2E\u3002\uFF0E\uFF61]/g;

  function error(type) {
    throw new RangeError('Invalid punycode: ' + type);
  }

  function map(array, fn) {
    var length = array.length;
    var result = [];
    while (length--) {
      result[length] = fn(array[length]);
    }
    return result;
  }

  function mapDomain(string, fn) {
    var parts = string.split('@');
    var result = '';
    if (parts.length > 1) {
      result = parts[0] + '@';
      string = parts[1];
    }
    string = string.replace(regexSeparators, '\x2E');
    var labels = string.split('.');
    var encoded = map(labels, fn).join('.');
    return result + encoded;
  }

  function ucs2decode(string) {
    var output = [],
        counter = 0,
        length = string.length,
        value,
        extra;
    while (counter < length) {
      value = string.charCodeAt(counter++);
      if (value >= 0xD800 && value <= 0xDBFF && counter < length) {
        extra = string.charCodeAt(counter++);
        if ((extra & 0xFC00) == 0xDC00) {
          output.push(((value & 0x3FF) << 10) + (extra & 0x3FF) + 0x10000);
        } else {
          output.push(value);
          counter--;
        }
      } else {
        output.push(value);
      }
    }
    return output;
  }

  function basicToDigit(codePoint) {
    if (codePoint - 48 < 10) return codePoint - 22;
    if (codePoint - 65 < 26) return codePoint - 65;
    if (codePoint - 97 < 26) return codePoint - 97;
    return base;
  }

  function digitToBasic(digit, flag) {
    return digit + 22 + 75 * (digit < 26) - ((flag != 0) << 5);
  }

  function adapt(delta, numPoints, firstTime) {
    var k = 0;
    delta = firstTime ? Math.floor(delta / damp) : delta >> 1;
    delta += Math.floor(delta / numPoints);
    for (; delta > base * tMin / 2; k += base) {
      delta = Math.floor(delta / (base - tMin));
    }
    return Math.floor(k + (base - tMin + 1) * delta / (delta + skew));
  }

  function decode(input) {
    var output = [],
        basic = input.lastIndexOf(delimiter),
        i = 0,
        n = initialN,
        bias = initialBias,
        oldi, w, k, digit, t, baseMinusT;

    if (basic < 0) { basic = 0; }

    for (; i < basic; ++i) {
      if (input.charCodeAt(i) >= 0x80) {
        error('not-basic');
      }
      output.push(input.charCodeAt(i));
    }

    for (i = basic > 0 ? basic + 1 : 0; i < input.length; ) {
      oldi = output.length;
      w = 1;
      for (k = base; ; k += base) {
        if (i >= input.length) { error('invalid-input'); }

        digit = basicToDigit(input.charCodeAt(i++));

        if (digit >= base || digit > Math.floor((maxInt - output.length) / w)) { error('overflow'); }

        output.length += digit * w;
        t = k <= bias ? tMin : (k >= bias + tMax ? tMax : k - bias);

        if (digit < t) { break; }

        baseMinusT = base - t;
        if (w > Math.floor(maxInt / baseMinusT)) { error('overflow'); }

        w *= baseMinusT;
      }

      bias = adapt(output.length - oldi, oldi + 1, oldi == 0);
      n += Math.floor((output.length - oldi) / (oldi + 1));
      for (; oldi < output.length; oldi++) {
        output[oldi] += n % base;
      }
      n = Math.floor(n / base);
    }

    return String.fromCharCode.apply(null, output);
  }

  function toUnicode(input) {
    return mapDomain(input, function(string) {
      return regexPunycode.test(string)
        ? decode(string.slice(4).toLowerCase())
        : string;
    });
  }

  return {
    decode: decode,
    toUnicode: toUnicode
  };
})();

// Function to get the displayed (decoded) URL
function getDisplayedUrl(punyUrl) {
  try {
    const urlObj = new URL(punyUrl);
    const decodedHostname = punycode.toUnicode(urlObj.hostname);
    urlObj.hostname = decodedHostname;
    return urlObj.toString();
  } catch (e) {
    return punyUrl; // Fallback if not a valid URL
  }
}

// Function to create and append highlighted content safely
function displayHighlightedUrl(url, container) {
  const decoded = decodeURI(url); // Decode path/query if needed
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

// Get the displayed URL and container
const displayedUrl = getDisplayedUrl(originalUrl);
console.log('Original:', originalUrl); console.log('Displayed:', displayedUrl);
const urlContainer = document.getElementById('url');
displayHighlightedUrl(displayedUrl, urlContainer);

document.getElementById('proceed').addEventListener('click', () => {
  browser.runtime.sendMessage({ action: 'allow', url: originalUrl });
  location.href = originalUrl;
});

document.getElementById('cancel').addEventListener('click', () => {
  browser.runtime.sendMessage({ action: 'closeTab' });
});