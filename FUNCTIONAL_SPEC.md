# 기능정의서 (Functional Specification)

**프로젝트:** 모두의 보험 (Insurance For All)  
**버전:** MVP 1.2 — 2026-08-21 (여정·입력·비영속 동기화)  
**마감:** 2026-08-27 **P0만**  
**관련:** [PRD.md](./PRD.md) · [FLOWCHARTS.md](./FLOWCHARTS.md) · [PUBLIC_API_PAGE_PLAN.md](./PUBLIC_API_PAGE_PLAN.md) · [ERD.md](./ERD.md) · [TECH_STACK.md](./TECH_STACK.md)

기능 ID(`F-01`~`F-14`)는 유지. **수용 범위·입출력**은 MVP 1.2 기준.

---

## 1. 기능 목록

| ID | 기능 | Actor | 우선순위 | 8/27 |
|----|------|-------|----------|------|
| F-01 | 메인 소개·고지 | User | P0 | 필수 (F-02와 동일 화면 가능) |
| F-02 | 공통 입력 (비영속) | User | P0 | 필수 |
| F-03 | 통계 조회 (실손→자동차→생명) | User | P0 | 필수 (최소 2페이지) |
| F-04 | 실손 상품·담보 비교 | User | P0 | 필수 (실손 페이지 내) |
| F-05 | PDF 업로드(선택) | User | P0 | 필수 |
| F-06 | 마스킹·비동기 저장 | System | P0 | 필수 |
| F-07 | 페이지별 AI 설명 | User | P0 | 필수 (스코프별) |
| F-08 | 상담 요청 | User | P0 | 필수 |
| F-11 | 공공 API 배치 동기화 | System | P0 | 필수 |
| F-10a | GA4 이벤트 | System | P0 | 가능하면 |
| F-09~F-14 | 관리자·HITL·OCR 등 | — | P1/P2 | 제외 |

---

## 2. P0 상세

### F-01 메인 소개·고지

- **목적:** 신뢰·범위  
- **출력:** 소개, 프로필 PG 미저장·상담 전 연락처 없음, 가입 권유 아님·견적 아님, CTA  
- **수용:** 동일 화면에서 F-02 입력으로 진행 가능  

### F-02 공통 입력 (비영속)

- **필수 입력:**  
  - 생년월일 (주민번호 **앞 6자리** YYMMDD 또는 동등 UI)  
  - 성별 (`남자` \| `여자`)  
  - 지역 (생명 API 17개 ENUM)  
- **선택:** 직업 범주, 유병력/관심 질환 범주 → **AI·상담 카피용만**. 공공 API 필터 아님  
- **처리:** `asOfDate`(이용일)로 **보험나이** 산정 → API 어댑터 (실손 age / 자동차 aggr / 생명 rchnAggr). [PUBLIC_API_PAGE_PLAN.md](./PUBLIC_API_PAGE_PLAN.md) §2  
- **저장:** **PostgreSQL에 프로필 INSERT 금지.** 클라이언트·서명 쿠키(또는 Redis TTL만)  
- **비수집(영속):** 이름, 연락처, 주민번호 **전체**, 이메일, 주소. 앞 6자리는 계산 후 원문 비저장  
- **수용:** 필수 누락 시 진행 불가. 완료 후 F-03(실손)  

근거: 3API 실제 입력 축 + 최소 영속 수집(ERD v1.4).

### F-03 통계 조회 (순차 3페이지)

| 순서 | 경로(예) | 데이터 | 보여줄 것 (요지) | 차트 |
|------|----------|--------|------------------|------|
| 2 | `/stats/health` | `stats_medical_rates` | 보험료 비교·분포. N=**상품/레코드 수** | 막대 중심 |
| 3 | `/stats/auto` | `stats_auto_contracts` | 가입대수·경과보험료·대당평균 | 막대 |
| 4 | `/stats/life` | `stats_life_join_status` | 종류별 가입건수(**건**)·가입율 | 막대 |

- **입력:** F-02 프로필(요청/쿠키) + 페이지 전용 필터(실손 ptrn/mog, 자동차 종목·차종 등)  
- **데이터:** `public_cache_heads` → active sync → `stats_*` 만. 포털 실시간 호출 금지  
- **공통 출력:** 기준일/년월, 출처, stale 시 안내, 견적·가입 권유 아님  
- **금지 카피:** 실손 totalCount=가입자, 생명 건수=명, 직업·유병력 매칭 위장  
- **수용:** PDF 없이 동작. MVP **최소 2개** 통계 페이지  

각 페이지 **하단 F-07**(해당 scope).

### F-04 실손 상품·담보 비교

- **위치:** 실손 페이지 내 (별도 여정 분기 최소화)  
- **입력:** 동일 age·ptrn·mog 등, 담보/유형 **2개 이상** 비교 가능  
- **출력:** 회사·상품·남/여 보험료 등 **API에 있는 필드만**. 추천 1위 금지  
- **수용:** 최소 2열  

### F-05 · F-06 PDF

- 기존과 동일: 선택, 202+job, 마스킹 JSONB, 원문 삭제, LLM에 원문 금지  
- `anon_session_key`만 연결 (프로필 FK 없음)

### F-07 페이지별 AI 설명

- **시점:** 실손·자동차·생명 **각 페이지 하단**  
- **입력:** 그 페이지에 **표시한 통계 요약**만 (+ 있으면 마스킹 JSON). 생년월일 금지  
- **scope:** `health` \| `auto` \| `life`  
- **금지:** 가입 권유, 최적 상품, 환각 숫자  
- **예외:** 규칙 템플릿 폴백  

### F-08 상담

- 동의 + 전화 또는 이메일 → `consultation_requests`만 PG INSERT  
- 이 단계 전 연락처 컬럼 없음  

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
| GET | `/api/v1/stats/health` | 실손 캐시. 쿼리/바디에 보험나이 산출용 생년월일·성별 등 **전달만**, PG 프로필 저장 없음 |
| GET | `/api/v1/stats/auto` | 자동차 |
| GET | `/api/v1/stats/life` | 생명 |
| POST | `/api/v1/documents` | PDF → 202 + job_id |
| GET | `/api/v1/documents/{job_id}` | 상태/결과 |
| POST | `/api/v1/reports` | body.`scope` = health\|auto\|life |
| GET | `/api/v1/reports/{token}` | 조회 |
| POST | `/api/v1/consultations` | 동의+연락처 |

- **제거/비권장:** `POST /api/v1/profiles`로 프로필을 PG에 쌓는 방식  
- 익명 키는 쿠키 발급만 가능 (속성 인코딩 금지)  
- 동기화: `python -m app.jobs.sync_public_api` (관리자 HTTP는 P1)

---

## 5. NFR

| ID | P0 |
|----|-----|
| NFR-01 | 캐시 히트 통계 p95 1초 미만 |
| NFR-02 | HTTPS, 업로드 제한 |
| NFR-03 | 프로필 PG 미저장, 원본 단기 삭제, LLM 원문·생년월일 금지 |
| NFR-04 | Worker 장애 시에도 통계(캐시) 동작 |
| NFR-06 | 비권유·견적 아님 고지 |
| NFR-07 | JavaScript 프론트 |

---

## 6. UAT (P0)

1. PG에 `session_profiles`/생년월일 컬럼 없음  
2. 메인 입력 후 실손·자동차(또는 생명) 통계 표시  
3. 실손 비교 2열 이상, totalCount를 가입자 수로 안 씀  
4. 페이지 하단 AI 또는 폴백 (생년월일 미전송)  
5. 상담 전 consultations 비어 있음  
6. 포털 다운 시에도 캐시로 통계 200  

---

## 7. 데이터 흐름

**통계:** Browser(프로필 쿠키) → nginx → api(보험나이 계산) → PG `stats_*`  

**PDF:** api → Redis → worker → JSONB (원본 삭제)  

**상담:** 동의 후에만 PG insert  
