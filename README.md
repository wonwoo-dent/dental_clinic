# 3사단 의무대대 치과 홈페이지

주소: https://wonwoo-dent.github.io/dental_clinic/

| 파일 | 내용 |
| --- | --- |
| `index.html` | 홈: 첫 화면, 의료진, 진료 과목, 진료 시간, 자주 묻는 질문, 의견함 |
| `clinic.html` | 진료 안내 |
| `hours.html` | 진료 시간과 예약 방법 |
| `care.html` | 치료 전후 주의사항 |
| `style.css` | 글꼴, 색, 크기 등 모양 전부 |
| `site.js` | 안내판 실시간 상태, 그림 전환, 의견함 전송 |
| `mark.svg` | 3사단 부대 마크 |
| `photos/` | 홈에 쓰는 사진. `caries-*`는 본원 치료 전후 사진, 나머지는 자유 이용 자료 사진 (출처는 홈 맨 아래) |

## 글을 직접 고치는 법 (GitHub 화면에서)
1. 위 표에서 고칠 파일을 클릭한 뒤, 오른쪽 위 **연필(✏️) 아이콘**을 누릅니다.
2. 글자를 찾아 고칩니다. 찾기는 Ctrl+F (Mac은 Cmd+F). `<p>`, `<li>` 같은 꺾쇠 안의 내용은 건드리지 말고, 꺾쇠 사이의 한글만 바꾸면 안전합니다.
3. 오른쪽 위 초록색 **Commit changes...** → 다시 **Commit changes** 를 누릅니다.
4. 1~2분 뒤 홈페이지를 새로고침하면 바뀌어 있습니다.

## 글꼴을 바꾸는 법
`style.css` 맨 위쪽의 `--font:` 줄에서 맨 앞 글꼴 이름을 바꿉니다. 지금은 Pretendard(없으면 Noto Sans KR)입니다.
예를 들어 Google Fonts 의 `Nanum Gothic` 을 쓰려면, 네 HTML 파일의 `<head>` 안 `fonts.googleapis.com` 줄의 `Noto+Sans+KR` 을 `Nanum+Gothic` 으로 바꾸고, `--font:` 줄의 `"Noto Sans KR"` 을 `"Nanum Gothic"` 으로 바꿉니다.

## 사진을 바꾸는 법
`photos/` 폴더에 같은 이름으로 사진을 올리면 바로 바뀝니다 (GitHub 화면에서 **Add file → Upload files**).
- `room-chair.jpg` (세로 960×1080): 홈 맨 아래 "전화 한 통이면 됩니다" 옆 사진
- `room-unit.jpg` (가로 960×640): "오시는 길" 사진
- `wisdom-pano.jpg`, `crown-zirconia.jpg`, `exam-mirror.jpg` (가로 1400×875): 진료 과목 사진
실제 진료실 사진으로 바꾸면 홈 맨 아래 "진료실 사진은 참고용 자료 사진입니다" 줄도 지우세요.

## 자주 바꾸는 값
- 진료 시간: `site.js` 맨 위 `HOURS` (9, 12, 13, 16), `index.html`·`hours.html` 본문, 안내판 그림의 막대 높이
- 전화번호: 네 파일에서 `033-450-7119` 찾기
- 의견함: `index.html` 의 `formResponse` 주소와 `entry.` 번호 (구글 폼을 새로 만들면 둘 다 바꿔야 합니다)
