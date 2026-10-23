# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트

보금 — 빌드 도구와 의존성이 없는 한국어 임대차 안전 웹앱. 빌라 AI 시세, HUG 126% 전세보증 판정, 에스크로 직거래, 입주·퇴거 사진 금고에 더해 OpenAI 기반 상담과 계약 문구 검토를 제공한다. 매물·등기·실거래 데이터는 목업이고, 본인인증·에스크로·결제는 시뮬레이션이다. UI 문구와 코드 주석은 한국어로 쓴다.

## 명령어

- 실행: `node server.js` → http://localhost:5180 (`.claude/launch.json`의 `bogeum`). `.env`는 `process.loadEnvFile`로 읽는다.
- 문법 검사 (린터·번들러·테스트 없음): `node --check js/*.js api/ai.js server.js`
- 엔진만 Node에서 실행: `node -e "global.window=global; require('./js/data.js'); require('./js/engines.js'); console.log(BG.eng.diagnose(BG.LISTINGS[2]))"`
- 배포 = **공개** 저장소 https://github.com/ultraJH-collab/bogeum 의 `main`에 push → Vercel(팀 `imsi`, 프로젝트 `bogeum`, 프리셋 "Other", 빌드 없음)이 https://bogeum.vercel.app 에 자동 배포. 배포별 주소(`bogeum-*-imsi.vercel.app`)는 Vercel 인증으로 막혀 있으니 운영 주소로 테스트한다.
- Vercel 환경변수(`OPENAI_API_KEY`, 선택 `OPENAI_MODEL`)는 대시보드에서 관리. 배포 후 확인: `curl https://bogeum.vercel.app/api/ai` → `{"ok":true,"ready":true}`, 로그인 없는 POST는 401이어야 한다.
- 이 PC의 Vercel CLI: 윈도우 호스트명이 한글이라 `vercel login`이 "Cannot convert argument to a ByteString"으로 죽는다. 영문 경로에 둔 preload(`os.hostname`/`os.userInfo`를 ASCII로 바꿈)를 `NODE_OPTIONS=--require <shim>.cjs`로 넣어 우회. 기기 로그인은 이메일 코드도 요구하므로 사용자 Chrome에 로그인된 대시보드를 쓰는 편이 낫다. PowerShell에서는 실행 정책 때문에 `npx`가 막히니 `npx.cmd`나 Git Bash를 쓴다.
- 커밋 작성자는 GitHub noreply(`345055406+ultraJH-collab@users.noreply.github.com`, 로컬 git config). `gh`는 미설치 — GitHub API는 `git credential fill`의 토큰으로 호출한다.
- Git Bash에서 `curl -d`로 한글 JSON을 보내면 깨진다(GitHub API "Problems parsing JSON") → node로 UTF-8 파일에 쓰고 `--data-binary @파일`로 보낸다.
- 앱 내 브라우저 창은 데스크톱 에뮬레이션 화면을 잘못 캡처한다(DPR 1.25). 데스크톱 폭 스크린샷은 Playwright MCP로 찍고, 프로젝트에 생기는 `.playwright-mcp/` 폴더는 지운다.
- Playwright에서 해시 경로(`#/…`)만 바꾸면 문서가 다시 로드되지 않아 고친 JS가 반영되지 않는다 → JS 수정 후에는 `location.reload()` 하고 확인.
- 기능 확인(E2E): 아이디 가입 → `#/check/<id>`에서 "예시 넣기" → 검토하기 → 답변 확인. 끝나면 테스트 계정 삭제: `delete from private.members where username = '<id>'`.
- 스키마 변경: `supabase/migrations/`에 파일을 추가하고 프로젝트 `vvngpbhapjdhcchyetxc`에 적용(Supabase MCP `apply_migration`).

## 구조

`window.BG`를 공유하는 일반 `<script>` 태그를 `config → data → engines → account → app → ai` 순서로 로드한다.

- `js/engines.js` — `BG.eng`의 순수 함수. 시드 기반 비교 실거래 → 헤도닉 `estimate`. `hug` = 보증금 + 선순위 채권최고액 + (다가구) 선순위 임차보증금 ≤ 공시가 × 1.26, 위반건축물은 항상 탈락. `diagnose` → 8개 항목, 단계 0/1/2, 점수.
- `js/app.js` — IIFE 하나. 해시 라우터 `#/<page>/<arg>`(home, listing, check, contract, vault, report, my, login). 뷰는 HTML 문자열을 반환하고 `render(keepScroll)`이 `#view`를 교체하며 창 스크롤을 다룬다. 이벤트 위임: `data-act` → `actions`, `data-go` → 이동, `data-input` → `inputs`. 상호작용은 리스너가 아니라 키를 추가해서 만든다. `#hug-block`, `#manual-result`, `#fee-out`, 홈 목록은 부분 갱신. 상태는 `store`(localStorage `bg_` 접두사)에 키별로 저장하고, `store.set`은 `BG.account.push`도 호출한다.
- `js/account.js` — **이메일 없는** 아이디/비밀번호 계정. Supabase 프로젝트 `bogeum`(ref `vvngpbhapjdhcchyetxc`, ap-northeast-2). Supabase Auth는 쓰지 않는다. 테이블은 API에 노출되지 않는 `private` 스키마에 있고, 브라우저는 publishable 키로 `public.bg_*` SECURITY DEFINER RPC만 호출한다: `bg_signup`, `bg_login`(bcrypt, 5회 실패 시 10분 잠금), `bg_logout`, `bg_me`, `bg_state_get/put/clear`(키는 CHECK 제약으로 화이트리스트), `bg_ai_use`(하루 60회). 세션 토큰은 32바이트 난수로, 서버에는 sha256 해시로 저장하고 30일 뒤 만료되며 `localStorage.bg_session`에 둔다. 로그인 시 `pull()`이 서버 값을 받고, 로컬에만 있는 키를 올린 뒤 `BG.app.reloadState()`. anon이 SECURITY DEFINER 함수를 실행할 수 있다는 advisor 경고는 의도된 것이다.
- `js/ai.js` + `api/ai.js` — `GET /api/ai`가 `ready`를 알려 줄 때만 상담 버튼을 그린다. `POST /api/ai`는 `bg_` 세션 토큰을 Bearer로 요구하고, OpenAI 호출 전에 `bg_ai_use`로 사용량을 차감한 뒤 Chat Completions를 plain text로 스트리밍한다. `mode: 'chat'`은 앱 안내서와 현재 화면 맥락(매물 진단)을 넣고, `mode: 'review'`는 붙여넣은 글을 정해진 형식으로 위험 검토한다. OpenAI 키는 `.env`와 Vercel 환경변수에만 있고 브라우저 코드에는 없다.
- `css/app.css` — 토큰은 `:root`에. 디자인: 차가운 종이 `#F1F4F1`, 먹 `#16262E`, 소나무 `#1D6A50`. 제목·큰 숫자는 Gowun Batang, 본문은 IBM Plex Sans KR. 안심점수는 기울어진 도장(app.js의 `stamp()`)으로 그리는 유일한 강한 요소이고 나머지는 차분하게 둔다. ≥1024px에서는 왼쪽 레일이 탭바를 대신하고, 홈은 목록|지도, 매물 상세는 2단이다(1024px 미만에서 `.d-side`는 `display: contents`이고 자식에 `order`를 준다 — 둘 다 유지).
- `sw.js` — 네트워크 우선 앱 셸 캐시, https에서만 등록. 셸 파일을 바꾸면 `CACHE` 버전을 올린다.

## 규칙

- 데이터·엔진의 금액 단위는 만원. 표시는 `E.fmtMan` / `E.fmtWon`으로.
- 여러 곳에 중복된 값은 함께 바꾼다:
  - 동기화 상태 키: `js/account.js`의 `SYNC_KEYS`와 마이그레이션의 `member_state.key` CHECK 제약.
  - AI 하루 60회 한도: SQL의 `bg_ai_use`, `api/ai.js`의 한도 초과 오류 문구와 `GUIDE`, `viewMy`의 요금 목록.
- `js/config.js`의 Supabase publishable 키와 `api/ai.js`의 기본값은 공개해도 되는 값이다. OpenAI 키는 `.env`(gitignore, 로컬)와 Vercel 환경변수에만 둔다.
- 법률·금융 문구는 데모 텍스트이며 데모임을 계속 표시한다.
