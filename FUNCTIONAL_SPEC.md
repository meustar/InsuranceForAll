# 기능정의서 (Functional Specification)

**프로젝트:** 모두의 보험 (Insurance For All)  
**버전:** MVP 1.4 — 2026-08-24 (Tab 허브 여정 · D3.js 차트 유형)
**마감:** 2026-08-27 **P0만**  
**관련:** [PRD.md](./PRD.md) · [FLOWCHARTS.md](./FLOWCHARTS.md) · [PUBLIC_API_PAGE_PLAN.md](./PUBLIC_API_PAGE_PLAN.md) · [DESIGN.md](./DESIGN.md) · [ERD.md](./ERD.md) · [TECH_STACK.md](./TECH_STACK.md)

기능 ID(`F-01`~`F-14`)는 유지. **수용 범위·입출력**은 MVP 1.4 기준.

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
| F-09~F-14 | 관리자·HITL·OCR 등 | — | P1/P2 | 제외 |

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
- **저장:** **PostgreSQL에 프로필 INSERT 금지.** MVP 기본은 메모리/`sessionStorage`; 쿠키에는 프로필 대신 불투명 익명 키만 허용. 종료·초기화 또는 30분 비활성 시 세션 프로필 삭제
- **고지:** 비영속이어도 개인정보 처리로 취급한다. 제출 전에 처리 목적·항목·처리 방식·즉시 폐기·브라우저 세션 저장·거부 시 서비스 제한을 알리고, “개인정보 미수집”으로 표현하지 않는다.
- **비수집(영속):** 이름, 연락처, 주민등록번호, 이메일, 주소. 생년월일은 계산 후 서버에서 즉시 폐기
- **수용:** 필수 누락 시 진행 불가. 완료 후 **통계 허브 `/stats`** (특정 스코프로 강제 이동하지 않음)

근거: 3API 실제 입력 축 + 최소 영속 수집(ERD v1.5).

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
- **P0 UI:** **이메일만** 수집. 전화번호 입력·「전화 상담」 CTA 없음. 통계 탐색 단계에는 연락처 없음.
- 목적·수집항목(이메일·선택 메모)·보유기간·동의 거부권을 별도로 고지하고 사용자가 **직접 동의**한 뒤 제출한다.
- 연락처와 선택 메모는 **AES-256-GCM(AEAD)** 으로 암호화하고 `contact_channel=email`, 동의문 버전·암호화 키 버전·만료시각과 함께 `consultation_requests`에 INSERT한다.
- 접수 성공 시 **보험 설계사(운영)** 수신 주소(`CONSULTATION_NOTIFY_EMAIL`)로 알림 메일을 발송한다(SMTP 등 백엔드 전용 설정). 사용자 이메일은 로그·알림 본문에 불필요하게 평문 노출하지 않는다.
- 이 단계 전 `consultation_requests`는 비어 있어야 하며, MVP 기본 30일 만료 후 hard delete한다.

### F-11 공공 API 배치

- 일 1회/기동 시. `public_sync_runs` + `stats_*`. 성공 시에만 `public_cache_heads` 갱신. 실패 시 이전 head + `stale=true`  
- 대상: 실손 `getInsuranceInfo`, 자동차 계약정보(MVP), 생명 `getLifeInsuJoinStatus` (개인연금 제외)  

---

## 3. P1 / P2

F-09~F-14 — 기존과 동일(관리자·HITL·OCR·설계사 디렉터리). MVP 제외.

---

## 4. API (P0)

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/v1/stats/health` | 실손 캐시. JSON body로 생년월일·성별 등을 **전달만** 하고 응답 후 폐기 |
| POST | `/api/v1/stats/auto` | 자동차 캐시. 프로필·필터를 JSON body로 전달 |
| POST | `/api/v1/stats/life` | 생명 캐시. 프로필·필터를 JSON body로 전달 |
| POST | `/api/v1/documents` | PDF → 202 + job_id |
| GET | `/api/v1/documents/{job_id}` | 익명 세션 쿠키가 일치하는 상태/결과만 반환 |
| POST | `/api/v1/reports` | body.`scope` = health\|auto\|life. `{report_id, access_token}`을 한 번 반환 |
| GET | `/api/v1/reports/{report_id}` | `Authorization: Bearer <access_token>`으로 조회. 토큰 path/query 금지 |
| POST | `/api/v1/consultations` | 동의 + **이메일**(`contact_channel=email`) + 선택 메모 |

- **제거/비권장:** `POST /api/v1/profiles`로 프로필을 PG에 쌓는 방식  
- GET body와 생년월일의 URL query 전달을 금지한다. 애플리케이션 API 키도 URL에 넣지 않되, 공공데이터포털 규격상 필요한 `serviceKey` query는 backend/worker 배치 어댑터에서만 만들고 로그·오류에서 전체 URL을 제거한다.
- 리포트 접근 토큰은 URL에 넣지 않고 `Authorization` 헤더로만 전달한다. 요청·응답 본문과 인증 헤더를 로그에 남기지 않으며 응답은 `Cache-Control: no-store`로 반환한다.
- 익명 세션 토큰은 32바이트 이상 난수로 `Secure`·`HttpOnly`·`SameSite=Lax` 쿠키에만 발급하고 DB에는 별도 pepper 기반 HMAC만 저장한다. 계정 인증으로 쓰지 않고 같은 세션의 임시 문서 상태에만 접근을 제한한다.
- 동기화: `python -m app.jobs.sync_public_api` (관리자 HTTP는 P1)

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
9. 상담 동의문에 목적·항목·보유기간·거부권이 표시되고 **이메일만** 입력 가능하며 만료 행이 삭제됨
10. 스코프 탭 하단에 PDF·이메일 상담 CTA가 있고 각각 `/documents`, `/consultations`로 이동
11. `.env`·키 파일이 Git·Docker·Cursor AI 컨텍스트에서 제외되고 프론트 번들에 비밀값이 없음
12. 프로필 제출 전에 비영속 처리·`sessionStorage` 사용 고지가 표시되고 “개인정보 미수집” 문구가 없음
13. 통계 그래프가 D3로 렌더되고 출처·기준일·견적 아님 캡션이 있음. KPI는 숫자/표로도 제공

---

## 7. 데이터 흐름

**통계:** Browser(메모리/`sessionStorage`) → `POST` JSON → nginx → api(보험나이 계산 후 원문 폐기) → PG `stats_*`

**PDF:** api → Redis → worker → JSONB (원본 삭제)  

**상담:** 동의 후에만 PG insert  
