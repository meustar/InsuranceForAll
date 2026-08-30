# 기능정의서 (Functional Specification)

**프로젝트:** 모두의 보험 (Insurance For All)  
**버전:** MVP 1.4 — 2026-08-24 (Tab 허브 여정 · D3.js 차트 유형)
**마감:** 2026-08-27 **P0만**  
**관련:** [PRD.md](./PRD.md) · [FLOWCHARTS.md](./FLOWCHARTS.md) · [PUBLIC_API_PAGE_PLAN.md](./PUBLIC_API_PAGE_PLAN.md) · [DESIGN.md](./DESIGN.md) · [ERD.md](./ERD.md) · [TECH_STACK.md](./TECH_STACK.md)

기능 ID(`F-01`~`F-14`)는 유지. **수용 범위·입출력**은 MVP 1.4 기준.  
코드 대비 구현 여부·UAT 실행 기록은 [PROGRESS.md](./PROGRESS.md) (계약이 아님). P0 정의를 후퇴시키지 않는다.

---

## 1. 기능 목록

| ID | 기능 | Actor | 우선순위 | 8/27 |
|----|------|-------|----------|------|
| F-01 | 메인 소개·고지 | User | P0 | 필수 (F-02와 동일 화면 가능) |
| F-02 | 공통 입력 (비영속) | User | P0 | 필수 |
| F-03 | 통계 허브·탭 조회 (실손·자동차·생명) | User | P0 | 필수 (허브 + 최소 2스코프) |
| F-04 | 실손 상품·담보 비교 | User | P0 | 필수 (실손 페이지 내) |
| F-05 | PDF 업로드(선택) | User | P0 | 필수 |
| F-06 | 마스킹·비동기 저장 | System | P0 | 필수 |
| F-07 | 스코프(탭)별 AI 설명 | User | P0 | 필수 (스코프별 · 허브 비필수) |
| F-08 | 상담 요청 | User | P0 | 필수 |
| F-11 | 공공 API 배치 동기화 | System | P0 | 필수 |
| F-10a | GA4 이벤트 | System | P0 | 가능하면 |
| F-09 | 다건 PDF (운영) | Admin | P1 | `/ops` |
| F-10 | 운영 대시보드 | Admin | P1 | `/ops` |
| F-12~F-14 | HITL·설계사 디렉터리·OCR | — | P1/P2 | 제외 |

---

## 2. P0 상세

### F-01 메인 소개·고지

- **목적:** 신뢰·범위  
- **출력:** 소개, 프로필 처리 목적·항목·비영속 방식·`sessionStorage` 사용·거부 시 제한, 상담 전 연락처 없음, 가입 권유 아님·견적 아님, CTA
- **수용:** 동일 화면에서 F-02 입력으로 진행 가능  

### F-02 공통 입력 (비영속)

- **필수 입력:**  
  - 생년월일 (`YYYY-MM-DD` 날짜 UI). YYMMDD나 주민등록번호 형식으로 받지 않음
  - 성별 (`남자` \| `여자`)  
  - 지역 (생명 API 17개 ENUM)  
- **P0 미수집:** 직업, 유병력/관심 질환. 공공 API 필터가 아니며 민감도 대비 P0 효용이 없음
- **처리:** `asOfDate`(이용일)로 **보험나이** 산정 → API 어댑터 (실손 age / 자동차 aggr / 생명 rchnAggr). [PUBLIC_API_PAGE_PLAN.md](./PUBLIC_API_PAGE_PLAN.md) §2  
- **전달:** 통계 `POST` JSON 본문으로만 전송. URL·쿼리·분석 이벤트 금지
- **저장:** **PostgreSQL에 프로필 INSERT 금지.** 메모리/`sessionStorage` 프로필과 프로필을 담지 않는 HttpOnly 익명 쿠키는 아래 수명 표를 따른다.
- **고지:** 비영속이어도 개인정보 처리로 취급한다. 제출 전에 처리 목적·항목·처리 방식·브라우저 세션 저장·익명 쿠키·거부 시 서비스 제한을 알리고, “개인정보 미수집”으로 표현하지 않는다.
- **비수집(영속):** 이름, 연락처, 주민등록번호, 이메일, 주소. 서버는 보험나이 계산 후 생년월일을 애플리케이션 로직에서 재사용·저장·로그하지 않고 요청 처리 종료 시 참조를 해제한다. 이는 디스크 wipe나 메모리 제로화를 뜻하지 않는다.
- **수용:** 필수 누락 시 진행 불가. 완료 후 **통계 허브 `/stats`** (특정 스코프로 강제 이동하지 않음)

근거: 3API 실제 입력 축 + 최소 영속 수집(ERD v1.5).

| 저장 위치 | 담는 값 | 수명 | 갱신 이벤트 | 초기화 | PG 관계 |
|----------|---------|------|-----------|--------|---------|
| 브라우저 `sessionStorage` | `birthDate`, `sex`, `areaNm` | 브라우저 세션 종료 또는 30분 비활성 | `pointerdown`, `keydown`, 화면 재활성화 시 유효성 확인. 5초 이내 중복 갱신은 생략 | 프로필 초기화 시 즉시 삭제 | 프로필·보험나이 INSERT 없음 |
| HttpOnly `ifa_anon` 쿠키 | 프로필을 인코딩하지 않은 32바이트 이상 불투명 난수 | 30분 비활성 (`Max-Age=1800`) | 성공한 `/api/v1` 통계·문서 업로드/폴링·리포트 응답에서 같은 토큰의 Max-Age 갱신 | 프로필 초기화가 `DELETE /api/v1/session`을 호출해 만료 | 원문 토큰 없음. 선택 산출물에 pepper 기반 HMAC만 저장 |

PDF 마스킹 결과의 서버 보관 상한(`DOCUMENT_RESULT_RETENTION_HOURS`, 기본 24시간)은 서버 데이터 보유기간이다. `ifa_anon`의 30분 비활성 수명과 별개이며, 쿠키가 만료·초기화되면 보관 중인 결과도 해당 브라우저에서 조회할 수 없다.

### F-03 통계 허브 · 탭 조회 (순서 강제 없음)

| 화면 | 경로 | 데이터 | 보여줄 것 (요지) | 차트 |
|------|------|--------|------------------|------|
| 허브 | `/stats` | (요약 카피) | 스코프별 한 줄 메시지·지표 종류 카드. 탭 선택 | 차트 없음(P0) |
| 실손 | `/stats/health` | `stats_medical_rates` | 보험료 비교·분포. N=**상품/레코드 수** | D3 가로 막대·덤벨·박스 요약 |
| 자동차 | `/stats/auto` | `stats_auto_contracts` | 가입대수·경과보험료·대당평균 | D3 가로 막대(지표 분리) |
| 생명 | `/stats/life` | `stats_life_join_status` | 종류별 가입건수(**건**)·가입율 | D3 가로 막대(율) · 건수는 표/별도 |

- **입력:** F-02 프로필(`POST` JSON 본문) + 스코프 전용 필터(실손 ptrn/mog, 자동차 종목·차종 등)
- **데이터:** `public_cache_heads` → active sync → `stats_*` 만. 포털 실시간 호출 금지  
- **네비:** 허브에서 원하는 스코프만 진입. 상단 탭은 허브 진입 후(세션 있음)만 활성. 스코프 **「이전」→ `/stats`**
- **공통 출력:** 기준일/년월, 출처, stale 시 안내, 견적·가입 권유 아님  
- **금지 카피:** 실손 totalCount=가입자, 생명 건수=명, 직업·유병력 매칭 위장, 허브의 추천·순위  
- **수용:** PDF 없이 동작. MVP **최소 2개 스코프** 통계 표시 (방문 순서 무관)
- **UI:** 공통 Header/Footer·버튼·토큰은 [DESIGN.md](./DESIGN.md) §5–§6 및 `design/tokens.css` 준수

각 스코프 탭 **하단 F-07**(해당 scope) 아래 **선택 CTA**(PDF→`/documents`, 이메일 상담→`/consultations`). 허브 AI는 P0 비필수.

### F-04 실손 상품·담보 비교

- **위치:** 실손 탭 내  
- **입력:** 동일 age·ptrn·mog 등, 담보/유형 **2개 이상** 비교 가능  
- **출력:** 회사·상품·남/여 보험료 등 **API에 있는 필드만**. 추천 1위 금지  
- **수용:** 최소 2열  

### F-05 · F-06 PDF

- 기존과 동일: 선택, 202+job, 마스킹 JSONB, 원문 삭제, LLM에 원문 금지
- prod 기본은 **worker 컨테이너 상시 1**. 워커가 없으면 job은 Redis에만 쌓이고 마스킹은 완료되지 않는다. FastAPI 안에서 동기로 합치지 않는다.  
- `anon_session_key_hash`만 연결 (32바이트 이상 원문 토큰은 쿠키에만, 프로필 FK 없음)
- **진입:** 각 **스코프 탭 하단 CTA** → **`/documents`** 전용 페이지 (허브 보조 링크 가능)
- **UI:** 파일 선택·업로드·job 상태·마스킹 요약. 「통계로 돌아가기」

### F-07 스코프(탭)별 AI 설명

- **시점:** 실손·자동차·생명 **각 탭 하단** (허브는 P0 비필수)  
- **입력:** 그 탭에 **표시한 통계 요약**만 (+ 있으면 마스킹 JSON). 생년월일 금지  
- **scope:** `health` \| `auto` \| `life`  
- **금지:** 가입 권유, 최적 상품, 환각 숫자  
- **예외:** 규칙 템플릿 폴백  

### F-08 상담 (이메일 · P0)

- **진입:** 각 **스코프 탭 하단 CTA** → **`/consultations`** 전용 페이지 (허브 보조 링크 가능)
- **P0 UI:** **이메일만** 수집. 전화번호 입력·「전화 상담」 CTA 없음. 통계 탐색 단계에는 연락처 없음. 동의 고지는 **`/consultations` 같은 라우트의 모달**(목적·항목·보유기간·거부권 유지).
- 목적·수집항목(이메일·선택 메모)·보유기간·동의 거부권을 모달에 고지하고 사용자가 **직접 동의**한 뒤 제출한다.
- 연락처와 선택 메모는 **AES-256-GCM(AEAD)** 으로 암호화하고 `contact_channel=email`, 동의문 버전·암호화 키 버전·만료시각과 함께 `consultation_requests`에 INSERT한다.
- 접수 성공 시 **보험 설계사(운영)** 수신 주소(`CONSULTATION_NOTIFY_EMAIL`)로만 알림 메일을 발송한다. **SMTP 본문에는 신청자 이메일과 선택 메모만 넣는다**(`request_id`·`contact_channel` 금지). 메모가 없으면 「(없음)」. HTTP 응답·서버 로그·분석 이벤트에는 신청자 이메일·메모를 평문으로 남기지 않는다.
- 이 단계 전 `consultation_requests`는 비어 있어야 하며, MVP 기본 30일 만료 후 hard delete한다.

### F-11 공공 API 배치

- 일 1회/기동 시. `public_sync_runs` + `stats_*`. 성공 시에만 `public_cache_heads` 갱신. 실패 시 이전 head + `stale=true`  
- 대상: 실손 `getInsuranceInfo`, 자동차 계약정보(MVP), 생명 `getLifeInsuJoinStatus` (개인연금 제외)  

---

## 3. P1 / P2

F-09~F-14는 **사용자 앱과 별 표면**이다. 사용자 Header·`/`에 로그인·아바타·Sign In을 넣지 않는다 (`DESIGN.md` §1·§5.1).

| ID | 범위 | 비고 |
|----|------|------|
| F-09 | 다건 PDF | 운영 라우트 `/ops`. 사용자 `/`·Header에 두지 않음. 원본 파일명 미저장 |
| F-10 | 대시보드 | `/ops` · `/ops/login`. HMAC 쿠키 `ifa_ops`(JWT 아님). 수동 동기화·상담 암호문 **복호화 열람**. P0 SMTP 회신과 다른 도구 |
| F-10a | GA4 이벤트 | **선택 P0**, **미구현**. 허용 이벤트 목록이 없어 gtag를 넣지 않는다. 생년월일·연락처·리포트 토큰·API 키·운영 쿠키 금지 |
| F-12 | 파싱 수정 | P1 · 미구현 |
| F-13 | 설계사 디렉터리 | P2 |
| F-14 | OCR 등 | P2 |

F-12~F-14 UI는 넣지 않는다. 운영 계정은 PG 테이블이 아니라 `ADMIN_USERNAME` / `ADMIN_PASSWORD` / `ADMIN_SESSION_PEPPER`다.

---

## 4. API (P0 + 운영 `/ops`)

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/health` | 프로세스 생존. `GET /api/health` 동일 응답. 비밀값 미포함 |
| POST | `/api/v1/stats/health` | 실손 캐시. JSON body로 생년월일·성별 등을 **전달만** 하고 응답 후 폐기 |
| POST | `/api/v1/stats/auto` | 자동차 캐시. 프로필·필터를 JSON body로 전달 |
| POST | `/api/v1/stats/life` | 생명 캐시. 프로필·필터를 JSON body로 전달 |
| POST | `/api/v1/documents` | PDF → 202 + job_id |
| GET | `/api/v1/documents/{job_id}` | 익명 세션 쿠키가 일치하는 상태/결과만 반환하고 쿠키 수명을 갱신 |
| POST | `/api/v1/reports` | body.`scope` = health\|auto\|life. `{report_id, access_token}`을 한 번 반환 |
| GET | `/api/v1/reports/{report_id}` | `Authorization: Bearer <access_token>`으로 조회. 토큰 path/query 금지 |
| POST | `/api/v1/consultations` | 동의 + **이메일**(`contact_channel=email`) + 선택 메모 |
| DELETE | `/api/v1/session` | 서버 프로필 저장 없이 `ifa_anon` 쿠키만 만료 |
| POST | `/api/v1/ops/session` | 운영 로그인. `ifa_ops` HMAC 쿠키. 사용자 프로필 없음 |
| DELETE | `/api/v1/ops/session` | `ifa_ops`만 만료. `ifa_anon` 유지 |
| GET | `/api/v1/ops/session` | 운영 쿠키 유효 여부 |
| GET | `/api/v1/ops/dashboard` | 캐시 head·상담 복호화·운영 PDF job. `Cache-Control: no-store` |
| POST | `/api/v1/ops/sync` | F-11 배치 큐. `seed=false`. 포털 키 미응답 |
| POST | `/api/v1/ops/documents` | 다건 PDF(최대 10). 파일명 미저장. 202 + job_ids |

- **제거/비권장:** `POST /api/v1/profiles`로 프로필을 PG에 쌓는 방식  
- 브라우저는 항상 same-origin `/api`와 `credentials: "include"`를 사용한다. 로컬은 `web:3000`의 Next rewrite, prod는 nginx `:80/443`이 `/api` 접두사를 유지해 api로 전달한다. CORS 미설정은 의도이며 브라우저에서 `localhost:8000`을 직접 호출하지 않는다.
- GET body와 생년월일의 URL query 전달을 금지한다. 애플리케이션 API 키도 URL에 넣지 않되, 공공데이터포털 규격상 필요한 `serviceKey` query는 backend/worker 배치 어댑터에서만 만들고 로그·오류에서 전체 URL을 제거한다.
- 통계 `POST` JSON 공통: `birth_date`(또는 `birthDate`, `YYYY-MM-DD`), `sex`(`남자`\|`여자`), `area_nm`(또는 `areaNm`, 생명 17개 ENUM). 선택 필터는 스코프별(`ptrn`/`mog`, 자동차 종목·차종, 생명 `isu_kind_nm` 등). 응답은 `stale`·`stale_message`·`as_of_date`·`insurance_age`·어댑터 값·캐시 행을 포함하고 **생년월일 원문은 넣지 않는다.** `Cache-Control: no-store`.
- `POST /api/v1/reports` JSON: `scope`(`health`\|`auto`\|`life`), `displayed_stats`(화면에 보여 준 집계만). 선택 `masked_coverage`. 생년월일·PDF 원문 키는 400. 응답은 `{report_id, access_token}` 한 번. DB에는 `HMAC-SHA-256(REPORT_TOKEN_PEPPER, token)`만 저장한다.
- 리포트 접근 토큰은 URL에 넣지 않고 `Authorization` 헤더로만 전달한다. 요청·응답 본문과 인증 헤더를 로그에 남기지 않으며 응답은 `Cache-Control: no-store`로 반환한다. LLM 실패·금지 문구면 `is_fallback` 템플릿(UAT #6).
- 익명 세션 토큰은 32바이트 이상 난수로 `HttpOnly`·`SameSite=Lax` 쿠키(`ifa_anon`)에만 발급한다. HTTP 로컬 스모크는 `Secure=false`, HTTPS 데모는 `Secure=true`다. 성공한 `/api/v1` 통계·문서 업로드/폴링·리포트 응답은 같은 토큰의 `Max-Age=1800`을 갱신한다. 통계 POST는 프로필·HMAC을 INSERT하지 않는다. HMAC-SHA-256(`SESSION_TOKEN_PEPPER`, token)은 이후 문서·리포트 행의 `anon_session_key_hash`에만 저장한다. 계정 인증으로 쓰지 않고 같은 세션의 임시 산출물 접근에만 사용한다.
- `POST /api/v1/consultations` 는 `consent_agreed=true`, 현재 `consent_notice_version`, `contact_channel=email`, 이메일, 선택 메모만 받는다. `phone`은 422. 연락처·메모는 AES-256-GCM(`nonce||ciphertext||tag`)으로 저장하고 만료 행은 INSERT 전에 삭제한다. 성공 시 운영 SMTP 본문에 신청자 이메일과 선택 메모만 넣는다. HTTP 응답 JSON·로그에는 이메일·메모를 넣지 않는다. `GET /api/v1/consultations/notice`는 목적·항목·보유기간·거부권 문구만 반환한다.
- 운영 `ifa_ops`는 `ADMIN_SESSION_PEPPER` HMAC이며 JWT가 아니다. 사용자 `ifa_anon`·프로필과 섞지 않는다. 로그인 실패 본문에 입력값을 되돌려 주지 않는다. F-10a gtag는 넣지 않는다.

---

## 5. NFR

| ID | P0 |
|----|-----|
| NFR-01 | 캐시 히트 통계 p95 1초 미만 |
| NFR-02 | HTTPS, 업로드 제한 |
| NFR-03 | 프로필 PG 미저장, 생년월일 URL·로그 금지, 원본 단기 삭제, LLM 원문·프로필 금지 |
| NFR-04 | Worker 장애 시에도 통계(캐시) 동작 |
| NFR-06 | 비권유·견적 아님 고지 |
| NFR-07 | JavaScript 프론트 |
| NFR-08 | 통계 차트는 D3.js(React Client + ref). 유형은 PAGE_PLAN §3. Recharts/Chart.js 비사용 |

---

## 6. UAT (P0)

1. PG에 `session_profiles`/생년월일 컬럼 없음  
2. 메인 입력 후 **`/stats` 허브** 랜딩. 허브에서 스코프를 골라 **최소 2개 스코프** 통계 표시(방문 순서 무관)  
3. 스코프 화면 **「이전」** 이 `/stats` 허브로 이동  
4. 입력 전 상단 통계 탭 비활성(또는 메인 유도). 허브 진입 후 탭 활성  
5. 실손 비교 2열 이상, totalCount를 가입자 수로 안 씀  
6. 스코프 탭 하단 AI 또는 폴백 (생년월일 미전송). 허브 AI 없이도 통과  
7. 상담 전 consultations 비어 있음  
8. 포털 다운 시에도 캐시로 통계 200  
9. 상담 **모달**에 목적·항목·보유기간·거부권이 표시되고 **이메일만** 입력 가능하며 만료 행이 삭제됨. 모달 동의 전 제출 불가
10. 스코프 탭 하단에 PDF·이메일 상담 CTA가 있고 각각 `/documents`, `/consultations`로 이동. 상담은 전용 라우트 유지
11. `.env`·키 파일이 Git·Docker·Cursor AI 컨텍스트에서 제외되고 프론트 번들에 비밀값이 없음
12. 프로필 제출 전에 비영속 처리·`sessionStorage` 사용 고지가 표시되고 “개인정보 미수집” 문구가 없음
13. 통계 그래프가 D3로 렌더되고 출처·기준일·견적 아님 캡션이 있음. KPI는 숫자/표로도 제공
14. 사용자 `/`·Header에 Sign In·`/ops` 링크가 없고, 운영 로그인은 `/ops/login`만
15. 운영 로그아웃 후 대시보드 401. 레이아웃에 GA4/gtag 없음. 상담 이메일은 운영 대시보드에만 있고 분석 이벤트에 없음

---

## 7. 데이터 흐름

**통계:** Browser(메모리/`sessionStorage`) → same-origin `/api` `POST` JSON → nginx/Next rewrite → api(보험나이 계산 후 생년월일 재사용·저장·로그 금지, 요청 종료 시 참조 해제) → PG `stats_*`

**PDF:** api → Redis → worker → JSONB (원본 삭제)  

**상담:** 동의 후에만 PG insert  
