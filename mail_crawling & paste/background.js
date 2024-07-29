chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "extractAuthCode") {
    console.log("Received message to extract auth code");

    chrome.tabs.create({ url: "https://mail.naver.com/v2/folders/0/all", active: false }, (tab) => {
      const mailTabId = tab.id;

      const extractAuthCode = () => {
        chrome.scripting.executeScript({
          target: { tabId: mailTabId },
          func: () => {
            return new Promise((resolve) => {
              const mailLinks = document.querySelectorAll('.mail_title_link');
              if (mailLinks.length > 0) {
                mailLinks[0].click();

                const checkMailContent = () => {
                  const contentElement = document.querySelector('.mail_view_contents_inner');
                  if (contentElement) {
                    const content = contentElement.innerText;
                    const match = content.match(/\b\d{6}\b/);
                    resolve(match ? match[0] : 'No auth code found');
                  } else {
                    setTimeout(checkMailContent, 100); // 빠르게 다시 시도
                  }
                };

                setTimeout(checkMailContent, 100);
              } else {
                resolve('No mails found');
              }
            });
          }
        }).then(results => {
          const authCode = results[0].result || 'Auth code not found.';
          console.log("Auth code extracted:", authCode);

          if (authCode !== 'Auth code not found.' && authCode !== 'No mails found') {
            // 현재 윈도우의 활성 탭을 가져옴
            chrome.windows.getCurrent((currentWindow) => {
              chrome.tabs.query({ active: true, windowId: currentWindow.id }, (tabs) => {
                if (tabs.length === 0) {
                  console.error("No active tab found.");
                  sendResponse({ status: "error", message: "No active tab found." });
                  chrome.tabs.remove(mailTabId);
                  return;
                }

                const currentTabId = tabs[0].id;
                console.log("Current tab ID:", currentTabId);

                chrome.tabs.update(currentTabId, { active: true }, () => {
                  chrome.tabs.remove(mailTabId, () => {
                    enterAuthCode(authCode, currentTabId, sendResponse);
                  });
                });
              });
            });
          } else {
            sendResponse({ authCode: authCode });
            chrome.tabs.remove(mailTabId);
          }
        }).catch(error => {
          console.error("Scripting error:", error.message);
          sendResponse({ authCode: 'Error: ' + error.message });
          chrome.tabs.remove(mailTabId);
        });
      };

      const enterAuthCode = (authCode, currentTabId, sendResponse) => {
        console.log("함수 진입1");
        chrome.scripting.executeScript({
          target: { tabId: currentTabId },
          func: (code) => {
            console.log("함수 진입2");
            const authInput = document.querySelector('.pass input[type="password"]');
            if (authInput) {
              console.log("Auth input field found.");
              authInput.value = code;

              // 입력 이벤트 트리거
              const event = new Event('input', { bubbles: true });
              authInput.dispatchEvent(event);

              const submitButton = document.querySelector('.log input[type="submit"][value="로그인"][data-v-2b5faeb0]');
              console.log(submitButton);
              console.log("##");
              if (submitButton) {
                console.log("Submit button found.");
                submitButton.click();
                return "Auth code entered and submitted.";
              } 
              else {
                console.log("#Submit button not found.");
                return "@Submit button not found.";
              }
            } else {
              console.log("@ Auth input field not found.");
              return "#Auth input field not found.";
            }
          },
          args: [authCode]
        }).then(results => {
          console.log(results[0].result);
          sendResponse({ status: "success" });
        }).catch(error => {
          console.error("Scripting error during auth code entry:", error.message);
          sendResponse({ status: "error", message: error.message });
        });
      };

      chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo) {
        if (tabId === mailTabId && changeInfo.status === 'complete') {
          console.log("Naver mail page loaded");
          chrome.tabs.onUpdated.removeListener(listener);
          extractAuthCode();
        }
      });
    });

    return true; // Indicate that the response will be sent asynchronously
  }
});
