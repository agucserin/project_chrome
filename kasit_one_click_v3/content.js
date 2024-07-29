console.log("Content script loaded");

function initialize() {
  console.log("DOM 초기화 시도");

  // 현재 URL이 매칭되는지 확인
  const currentUrl = window.location.href;
  console.log("현재 URL:", currentUrl);

  const matchPattern = "https://iam2.kaist.ac.kr/*";
  const regex = new RegExp(matchPattern.replace("*", ".*"));
  const isMatch = regex.test(currentUrl);
  console.log("URL 매칭 여부:", isMatch);

  if (isMatch) {
    console.log("페이지가 매칭됩니다.");

    // 비밀번호 인증 버튼을 찾기
    const passwordAuthButton = document.querySelector('input[type="submit"][value="비밀번호 인증"]');

    // 콘솔에 버튼 객체를 출력하여 존재 여부 확인
    console.log("비밀번호 인증 버튼 객체:", passwordAuthButton);

    if (passwordAuthButton) {
      console.log("비밀번호 인증 버튼이 존재합니다.");
      passwordAuthButton.addEventListener('click', () => {
        console.log("비밀번호 인증 버튼 클릭됨"); // 버튼 클릭 시 로그 출력
        chrome.runtime.sendMessage({ action: "startAuthProcess" });
      });
    } else {
      console.log("비밀번호 인증 버튼을 찾을 수 없습니다.");
    }
  } else {
    console.log("페이지가 매칭되지 않습니다.");
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log("DOMContentLoaded 이벤트 발생");
    initialize();
  });
} else {
  console.log("이미 DOM이 로드됨");
  initialize();
}
