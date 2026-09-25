# 큰아빠가 만든 게임들

컴퓨터와 모바일 브라우저에서 바로 즐기는 게임 모음집입니다.

- 모음집 첫 화면: `index.html`
- 첫 번째 게임: `games/dinosaur-rescue/index.html`

## 로컬 실행

이 폴더에서 정적 파일 서버를 열고 `http://localhost:8765/`로 접속하세요. 예를 들어 Python이 있으면 `python -m http.server 8765`를 사용할 수 있습니다.

모바일에서는 모음집이나 공룡 게임의 **앱 설치** 버튼을 누르면 기기에 맞는 설치창 또는 홈 화면 추가 안내를 볼 수 있습니다. 설치 후 아이콘으로 열면 브라우저 탭 대신 전체 화면형 웹앱으로 실행됩니다. 접속만으로 사용자의 승인 없이 자동 설치할 수는 없습니다. 브라우저에서 바로 게임을 시작할 때도 지원되는 기기에서는 전체 화면을 요청합니다. 다만 주소창·상태 표시줄을 숨길 수 있는 범위는 모바일 브라우저의 정책에 따릅니다.

## GitHub Pages 공개

이 저장소의 **Settings → Pages → Build and deployment**에서 **Deploy from a branch**를 선택하고, `main` 브랜치의 `/(root)`를 게시 소스로 지정하세요. 배포가 끝나면 모음집은 `https://usesang.github.io/games-uncle-made/`, 공룡 게임은 `https://usesang.github.io/games-uncle-made/games/dinosaur-rescue/`에서 열립니다.

새 게임은 `games/새-게임-이름/` 폴더에 넣고 루트 `index.html`에 카드 링크를 추가하면 됩니다. 이 저장소에는 어린이의 원본 사진을 넣지 마세요. 공개용 캐릭터 그림과 게임 파일만 배포합니다.
