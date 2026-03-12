# ysh26

등급 기반(A/B/C) 학교 포털입니다.  
민감정보(계정/비밀번호/공용 로그인 코드/건의함 데이터)를 프론트에서 제거하고 **백엔드 + DB**로 이전했습니다.

---

## 변경 요약 (DB 이전)

- 프론트 코드에 있던 비밀번호/계정 하드코딩 제거
- 로그인/권한 검증을 서버 API로 전환
- 건의함 데이터를 `localStorage` 대신 PostgreSQL 저장
- 급식/시간표/학사일정 API 키를 프론트에서 제거하고 서버에서 호출(프록시)
- HttpOnly 쿠키 기반 세션(JWT) 적용

---

## 권한 정책

- A: 관리자 전용 페이지
- B: 매니저 이상 전용 페이지
- C: 로그인 사용자 전체 페이지

기능 권한:
- 건의 등록: C 이상
- 건의 조회/수정/삭제: B 이상
- 매니저 계정 목록 조회: A 전용

NEIS 조회 기준 학교는 기본값으로 고정됩니다.
- 시도교육청코드: `B10`
- 학교코드: `7010096`

---

## 프로젝트 구조

### 프론트

- `login.html`: 로그인 방식 선택
- `login-user.html`: 일반 인원 로그인(비밀번호만)
- `login-staff.html`: 매니저/관리자 로그인(ID+PW)
- `index.html`: 메인(C), 익명건의함/급식/시간표/학사일정(1개월 조회)/공지
- `anonymous.html`: 익명 건의 등록(C), 비공개 목록관리(B+)
- `manager.html`: 매니저 전용(B)
- `admin.html`: 관리자 전용(A)
- `auth.js`: API 기반 인증/권한 처리
- `app.js`: 페이지 로직/건의함/NEIS API 호출
- `config.js`: 프론트 API 서버 주소 설정

### 백엔드

- `server/index.js`: Express 서버
- `server/routes/auth.js`: 로그인/로그아웃/현재 세션
- `server/routes/suggestions.js`: 건의 CRUD
- `server/routes/admin.js`: 관리자용 계정 조회
- `server/routes/meals.js`: NEIS 급식 API 프록시
- `server/routes/timetable.js`: NEIS 시간표 API 프록시
- `server/routes/schedules.js`: NEIS 학사일정 API 프록시
- `server/db/schema.sql`: DB 스키마
- `server/scripts/migrate.js`: 마이그레이션
- `server/scripts/seed.js`: 초기 데이터 시드

---

## DB 이전 절차 (실행 순서)

### 1) 환경 변수 준비

```bash
cp .env.example .env
```

`.env`에서 최소 필수 값:
- `DATABASE_URL`
- `JWT_SECRET`
- `FRONTEND_ORIGIN`
- `NEIS_MEAL_API_KEY`
- `NEIS_SCHOOL_API_KEY`
- `DEFAULT_ATPT_OFCDC_SC_CODE` (기본값: B10)
- `DEFAULT_SD_SCHUL_CODE` (기본값: 7010096)

> 운영 환경에서는 기본 비밀번호를 반드시 변경하세요.

### 2) 패키지 설치

```bash
npm install
```

### 3) DB 마이그레이션

```bash
npm run db:migrate
```

### 4) 초기 계정/공용코드 시드

```bash
npm run db:seed
```

기본 시드(변경 가능):
- 일반 인원 공용코드: `YEOUIDO`
- 관리자(A): `admin / ADMIN1234!`
- 매니저(B): `manager / MANAGER1234!`

### 5) 서버 실행

```bash
npm run dev
```

### 6) 프론트 실행

정적 파일 서버로 실행(예시):

```bash
python3 -m http.server 5500
```

이후 `config.js`의 `API_BASE`를 서버 주소로 설정:

```js
window.APP_CONFIG = {
  API_BASE: "http://localhost:3000"
};
```

---

## GitHub Pages + 별도 API 서버 배포 시 체크리스트

1. 백엔드 배포(Render/Railway/Fly 등)
2. `config.js`의 `API_BASE`를 백엔드 도메인으로 설정
3. 백엔드 `.env`에서:
   - `FRONTEND_ORIGIN=https://<your-github-pages-domain>`
   - `COOKIE_SAMESITE=None`
   - `COOKIE_SECURE=true`
4. HTTPS 환경에서 동작 확인

---

## NPM 스크립트

- `npm run dev` : 백엔드 개발 서버 실행
- `npm start` : 백엔드 실행
- `npm run db:migrate` : DB 스키마 적용
- `npm run db:seed` : 초기 데이터 입력/갱신
