document.getElementById('extractBtn').addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: "extractAuthCode" }, (response) => {
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError.message);
        document.getElementById('output').innerText = 'Error: ' + chrome.runtime.lastError.message;
      } else {
        if (response && response.authCode) {
          document.getElementById('output').innerText = response.authCode;
        } else {
          document.getElementById('output').innerText = 'Auth code not found.';
        }
      }
    });
  });