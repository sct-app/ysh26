# ysh26

GitHub Pages에서 동작하는 **등급 기반(A/B/C) 학교 포털** 정적 웹앱입니다.

## 주요 기능

- **모든 서비스 페이지 로그인 필수**
  - 미로그인 접근 시 `login.html`로 이동
- **로그인 페이지 분리**
  - 일반 인원: `login-user.html` (비밀번호만 입력)
  - 매니저 이상: `login-staff.html` (아이디 + 비밀번호)
- **페이지 등급**
  - A: 관리자 전용 (`admin.html`)
  - B: 매니저 이상 (`manager.html`)
  - C: 로그인 사용자 전체 (`index.html`, `anonymous.html`)
- **익명 건의함**
  - 로그인 사용자 전체: 익명 건의 등록 가능
  - 매니저 이상: 건의 내용 조회/수정/삭제 가능 (비공개 게시판 영역)
- **학급 공지사항 (DB 저장)**
  - 공지사항은 SQLite DB에 저장되어 다른 디바이스에서도 동일하게 조회됩니다.
  - 매니저 이상(B/A)만 등록/삭제 가능
- **오늘의 급식**
  - NEIS 급식 API 연동
  - 인증키: `24c8cc27be96460fa3a0f648dc6d0af5`

## 기본 로그인 정보

### 일반 인원 (C)

- 비밀번호: `YEOUIDO`

### 매니저 이상

- 매니저(B): `manager / MANAGER1234!`
- 관리자(A): `admin / ADMIN1234!`

> 계정 정보는 `auth.js`에서 수정할 수 있습니다.

## GitHub Pages 배포

1. 이 저장소를 GitHub에 푸시
2. GitHub 저장소 설정 → **Pages**
3. **Deploy from a branch** 선택
4. 브랜치(예: `main`)와 `/ (root)` 선택 후 저장
5. 배포 URL 접속

> 학급 공지사항 DB 저장 기능은 백엔드 서버(`npm start`)가 실행 중이어야 동작합니다.

## 파일 구조

- `login.html`: 로그인 방식 선택
- `login-user.html`: 일반 로그인 (YEOUIDO)
- `login-staff.html`: 매니저/관리자 로그인
- `index.html`: 기본 메인 페이지 (익명건의함, 오늘의 급식, 공지사항)
- `anonymous.html`: 익명 건의함
- `manager.html`: 매니저 이상 전용 페이지(B)
- `admin.html`: 관리자 전용 페이지(A)
- `auth.js`: 인증/권한 처리
- `app.js`: 급식 API/건의함 로직
- `styles.css`: 공통 스타일
- `server/index.js`: 학급 공지사항 API 서버
- `server/db.js`: SQLite 초기화/접근

## 로컬 실행 (공지사항 DB 포함)

1. 의존성 설치
   - `npm install`
2. 서버 실행
   - `npm start`
3. 브라우저에서 사이트 접속
   - 서버가 제공하는 정적 파일 경로(예: `http://localhost:3000/index.html`)

## 참고

- 현재 구조는 GitHub Pages용 **프론트엔드 단독 구현**입니다.
- 실제 운영에서는 아이디/비밀번호와 게시글 데이터 저장을 서버(DB + 안전한 인증)로 이전하는 것을 권장합니다.
