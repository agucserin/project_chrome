chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "startAuthProcess") {
    console.log("Received message to start auth process");

    chrome.storage.local.get('mailOption', (data) => {
      const mailOption = data.mailOption || 'naver';
      console.log("Selected mail option:", mailOption);

      chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
        const currentTabId = tabs[0].id;

        const startMailAuthProcess = async () => {
          let mailUrl;
          if (mailOption === 'naver') {
            await new Promise(resolve => setTimeout(resolve, 1300));
            mailUrl = "https://mail.naver.com/v2/folders/0/all";
          } else if (mailOption === 'google') {
            await new Promise(resolve => setTimeout(resolve, 2200));
            mailUrl = "https://mail.google.com/mail/u/0/?tab=rm&ogbl#inbox";
          }

          chrome.tabs.create({ url: mailUrl, active: false }, (tab) => {
            const mailTabId = tab.id;
            const extractAuthCode =  () => {
              chrome.scripting.executeScript({
                target: { tabId: mailTabId },
                func: (mailOption) => {
                  return new Promise((resolve) => {
                    const findMailLinks = () => {
                      let mailLinks;
                      if (mailOption === 'naver') {
                        mailLinks = document.querySelectorAll('.mail_title_link');
                      } else if (mailOption === 'google') {
                        mailLinks = document.querySelectorAll('.zA');
                      }
              
                      if (mailLinks && mailLinks.length > 0) {
                        console.log("found mail",mailLinks[0]);
                        mailLinks[0].click();
                        
                        const checkMailContent = () => {
                          let contentElement;
                          if (mailOption === 'naver') {
                            contentElement = document.querySelector('.mail_view_contents_inner');
                          } else if (mailOption === 'google') {
                            new_mail = document.querySelector('ata-asJ');
                            if (new_mail){
                              new_mail.click();
                            }
                            contentElement = document.querySelectorAll('.a3s.aiL');
                            contentElement = contentElement[contentElement.length-1];
                          }
              
                          if (contentElement) {
                            const content = contentElement.innerText;
                            const match = content.match(/\b\d{6}\b/);
                            resolve(match ? match[0] : 'No auth code found');
                          } else {
                            setTimeout(checkMailContent, 100);
                          }
                        };
              
                        setTimeout(checkMailContent, 100);
                      } else {
                        setTimeout(findMailLinks, 100);
                      }
                    };
              
                    findMailLinks();
                  });
                },
                args: [mailOption]
              }).then(results => {
                const authCode = results[0].result || 'Auth code not found.';
                console.log("Auth code extracted:", authCode);

                if (authCode !== 'Auth code not found.' && authCode !== 'No mails found') {
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
              chrome.scripting.executeScript({
                target: { tabId: currentTabId },
                func: (code) => {
                  const results = {
                    authInputFound: false,
                    submitButtonFound: false,
                    submitButtonClicked: false
                  };

                  const authInput = document.querySelector('.pass input[type="password"]');
                  if (authInput) {
                    console.log("Auth input field found.");
                    authInput.value = code;
                    results.authInputFound = true;

                    const event = new Event('input', { bubbles: true });
                    authInput.dispatchEvent(event);

                    const submitButton = document.querySelector('.log input[type="submit"][value="로그인"][data-v-2b5faeb0]');
                    console.log(submitButton);
                    if (submitButton) {
                      console.log("Submit button found.");
                      submitButton.click();
                      results.submitButtonFound = true;
                      results.submitButtonClicked = true;
                      return results;
                    } else {
                      console.log("#Submit button not found.");
                      return results;
                    }
                  } else {
                    console.log("@ Auth input field not found.");
                    return results;
                  }
                },
                args: [authCode]
              }).then(results => {
                console.log(results[0].result);
                sendResponse({ status: "success", results: results[0].result });
              }).catch(error => {
                console.error("Scripting error during auth code entry:", error.message);
                sendResponse({ status: "error", message: error.message });
              });
            };

            chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo) {
              if (tabId === mailTabId && changeInfo.status === 'complete') {
                console.log("Mail page loaded");
                chrome.tabs.onUpdated.removeListener(listener);
                extractAuthCode();
              }
            });
          });
        };

        const clickButton = async (selector, tabId, nextFunc) => {
          await new Promise(resolve => setTimeout(resolve, 300));

          chrome.scripting.executeScript({
            target: { tabId: tabId },
            func: (selector) => {
              const button = document.querySelector(selector);
              console.log(`Attempting to click button: ${selector}`);
              if (button) {
                console.log(`Button found: ${button}`);
                button.click();
                return { clicked: true, url: window.location.href };
              } else {
                console.log(`Button not found: ${selector}`);
                return { clicked: false };
              }
            },
            args: [selector]
          }).then(results => {
            console.log(results[0].result);
            if (results[0].result.clicked) {
              const initialUrl = results[0].result.url;
              chrome.tabs.get(tabId, (tab) => {
                if (tab.url !== initialUrl) {
                  chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo, tab) {
                    if (tabId === currentTabId && changeInfo.status === 'complete' && tab.url !== initialUrl) {
                      console.log(`${selector} button click complete and page loaded`);
                      chrome.tabs.onUpdated.removeListener(listener);
                      nextFunc();
                    }
                  });
                } else {
                  nextFunc();
                }
              });
            } else {
              sendResponse({ status: "error", message: "Button not found: " + selector });
            }
          }).catch(error => {
            console.error("Scripting error:", error.message);
            sendResponse({ status: "error", message: error.message });
          });
        };

        const step3 = async () => {
          console.log("Entering step 3: Navigating to external mail authentication");
          await clickButton('input[type="submit"][id="email"]', currentTabId, () => {
            console.log("Step 3 completed. Starting mail auth process");
            startMailAuthProcess();
          });
        };

        const step2 = async () => {
          console.log("Entering step 2: Clicking login button");
          await clickButton('input.loginbtn', currentTabId, step3);
        };

        await step2();
      });

      return true;
    });
  } else if (message.action === "saveMailOption") {
    chrome.storage.local.set({ mailOption: message.mailOption }, () => {
      console.log("Mail option saved:", message.mailOption);
      sendResponse({ status: "success" });
    });
    return true;
  }
});
