chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "extractAuthCode") {
      console.log("Received message to extract auth code");
      chrome.tabs.create({ url: "https://mail.naver.com/v2/folders/0/all", active: false }, (tab) => {
        chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo) {
          if (tabId === tab.id && changeInfo.status === 'complete') {
            console.log("Naver mail page loaded");
  
            chrome.scripting.executeScript({
              target: { tabId: tab.id },
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
              let authCode = results[0].result || 'Auth code not found.';
              console.log("Auth code extracted:", authCode);
              sendResponse({ authCode: authCode });
  
              if (authCode !== 'Auth code not found.' && authCode !== 'No mails found') {
                // 성공적으로 인증 코드를 추출했을 때만 메시지 전송
                chrome.runtime.sendMessage({ status: "success" });
              }
  
              // 탭을 닫고 이벤트 리스너를 제거합니다.
              return chrome.tabs.remove(tab.id);
            }).catch(error => {
              console.error("Scripting error:", error.message);
              sendResponse({ authCode: 'Error: ' + error.message });
            }).finally(() => {
              chrome.tabs.onUpdated.removeListener(listener);
            });
          }
        });
      });
  
      // 포트가 닫히지 않도록 비동기 작업이 끝날 때까지 true 반환
      return true; // Indicate that the response will be sent asynchronously
    }
  });
  