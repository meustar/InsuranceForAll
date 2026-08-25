# 지금까지 한 일 — 기획부터 A-1까지

**제품:** 모두의 보험 (Insurance For All)  
**문서 성격:** 공유·온보딩용 진행 브리핑 (구현 계약의 정본이 아님)  
**기준일:** 2026-08-25  
**데모 목표:** 2026-08-27 P0 MVP  
**제품 버전:** MVP 1.4 · 스키마 ERD v1.5

화면·API·스키마의 세부 규칙은 이 파일이 아니라 저장소 SSOT를 따른다.  
[PRD.md](./PRD.md) · [FUNCTIONAL_SPEC.md](./FUNCTIONAL_SPEC.md) · [PUBLIC_API_PAGE_PLAN.md](./PUBLIC_API_PAGE_PLAN.md) · [ERD.md](./ERD.md) · [TECH_STACK.md](./TECH_STACK.md)

---

## 30초 요약

모두의 보험은 **이름·연락처 없이** 생년월일·성별·지역만으로 보험나이를 맞춘 뒤, 금융위원회 공공 OpenAPI의 **실손·자동차·생명** 통계를 허브에서 골라 보고, 쉬운 AI 설명과 (선택) 증권 PDF·이메일 상담을 붙이는 **의사결정 지원 웹**이다.

보험 모집, 상품 비교추천, 청약, 실시간 개인 견적은 **하지 않는다.** 사용자 프로필은 **PostgreSQL에 저장하지 않는다.**

2026-08-25 기준, **기획·설계 문서와 UI 프로토타입은 확정**되었고, 코드는 로컬 구현 TRACK A의 **A-0(실행 환경 스켈레톤)과 A-1(DB 스키마 마이그레이션)** 까지 왔다. 통계 API, 화면, 공공 데이터 동기화는 아직이다.

---

## 1. 왜 만들었는가

| 현장에서 보이는 문제 | 이 제품이 하려는 일 |
|----------------------|---------------------|
| 견적·상담 전에 연락처를 요구해 탐색이 끊김 | 탐색 단계에서는 연락처를 받지 않음 |
| 약관·증권 용어가 어려움 | 공공 통계 + 쉬운 설명으로 기준을 줌 |
| 나와 비슷한 조건의 공개 통계가 안 보임 | 보험나이·성별·지역에 맞춘 캐시 통계 |
| “추천” 문구가 중개·가입 권유로 오인됨 | 참고용·가입 권유 아님·견적 아님을 고정 |

규제 맥락(상세·링크는 PRD): 최소 수집(개인정보 보호법), 광고·권유로 읽히지 않기(금융소비자보호법), 플랫폼 비교·추천 서비스와 **같은 지위라고 주장하지 않기**.

---

## 2. 사용자가 하게 되는 일 (P0)

```text
메인 (소개·고지 + 생년월일·성별·지역)
        ↓
   /stats 허브 (실손 / 자동차 / 생명 카드)
        ↓  사용자가 원하는 탭만 선택 (순서 강제 없음)
   스코프 화면: 캐시 통계 · D3 차트 · AI 설명
        ↓  (선택)
   증권 PDF 마스킹  (/documents)
   이메일 상담      (/consultations)
```

입력은 **생년월일(YYYY-MM-DD), 성별, 지역**뿐이다. 직업·유병력은 P0에서 받지 않는다.  
세션 프로필은 브라우저 `sessionStorage`에만 두고, 종료·초기화 또는 30분 비활성 시 삭제한다. 비영속이어도 개인정보 처리로 고지하며, “개인정보를 수집하지 않는다”고 쓰지 않는다.

---

## 3. 기획에서 잠근 핵심 결정

문서가 여러 버전을 거치며 바뀐 내용을 **지금 기준으로만** 정리한다. 구버전(프로필 PG 저장, 실손→자동차→생명 강제 순서, TypeScript 프론트, Recharts 등)은 폐기했다.

| 주제 | 확정 |
|------|------|
| 제품 범위 | P0만. 관리자 웹·OCR은 P1 |
| 프론트 | Next.js 16 + React 19 + **JavaScript만** (`.ts`/`.tsx` 없음) |
| UI | [Google Stitch](https://stitch.withgoogle.com/projects/17570932267095502369) + [DESIGN.md](./DESIGN.md) + `design/tokens.css` |
| 차트 | **D3.js** (React Client + `ref`). Recharts·Chart.js 없음 |
| 통계 여정 | 메인 → `/stats` 허브 → 사용자 선택 탭. 「이전」은 허브 |
| 개인화 통계 API | `POST /api/v1/stats/{scope}` JSON 본문. 생년월일 URL 금지 |
| 데이터 | 화면 조회는 PG **활성 캐시만**. 공공 포털 호출은 worker 배치만 |
| LLM | 화면에 나온 집계·마스킹 JSON만. 생년월일·원본 PDF 금지 |
| 백엔드 | FastAPI · SQLAlchemy 2 · Alembic · PostgreSQL 17 · Redis 7.4 · Celery |
| 비밀정보 | 공공데이터포털 3키·OpenAI 키는 백엔드/worker 전용. `NEXT_PUBLIC_*` 없음 |

---

## 4. 기획·설계에서 만든 산출물

구현 전에 **문서가 계약**이 되도록 맞췄다. Notion은 검토·공유용이고, 구현 시 충돌하면 **이 저장소 파일이 우선**이다.

| 파일 | 역할 |
|------|------|
| [README.md](./README.md) | 읽을 순서, 한 줄 요약, Cursor 주의 |
| [PRD.md](./PRD.md) | 목표 G1–G10, 비목표, 여정 |
| [FUNCTIONAL_SPEC.md](./FUNCTIONAL_SPEC.md) | F-01~F-11, API, UAT 1–13 |
| [FLOWCHARTS.md](./FLOWCHARTS.md) | 사용자·시스템 흐름 |
| [PUBLIC_API_PAGE_PLAN.md](./PUBLIC_API_PAGE_PLAN.md) | 화면·공공 API 입력·차트 유형·AI |
| [DESIGN.md](./DESIGN.md) | 토큰, Header/Footer, 금지 카피 |
| [ERD.md](./ERD.md) | PG에 넣어도 되는 것 / 넣으면 안 되는 것 |
| [TECH_STACK.md](./TECH_STACK.md) | 버전 고정, Compose·EC2 방향 |
| [ENVIRONMENT.md](./ENVIRONMENT.md) | `.env`, 키, GitHub/배포 비밀 |
| [AGENTS.md](./AGENTS.md) | 에이전트 작업 규칙·Checkpoint |

에이전트는 기능 단위가 끝나면 **STOP**하고, **commit/push는 사용자가 한다.**

---

## 5. 구현 로드맵에서 지금 어디인가

로컬 구현을 TRACK A, EC2 배포를 TRACK B로 나눈다. 한 Checkpoint씩만 진행한다.

```text
[완료] 기획·SSOT·Stitch·tokens.css
[완료] A-0  Compose + API health + Worker 스켈레톤
[완료] A-1  ERD v1.5 Alembic (프로필 테이블 없음)
[다음] A-2  공공 API 배치 동기화 (F-11)
        A-3  POST /stats + 익명 세션
        A-4  AI 리포트
        A-5  PDF 마스킹
        A-6  이메일 상담
        A-7~A-11  Next.js 화면 + D3
        A-12 UAT 통합
        B    EC2 Docker 3-Tier (TRACK A 이후)
```

---

## 6. A-0에서 한 일

**목적:** 통계·화면 전에, 로컬에서 API와 worker가 DB·Redis와 붙는 **실행 뼈대**를 만든다. Dockerfile·웹·nginx는 이 단계에 넣지 않았다.

**들어간 것**

- 루트 `docker-compose.yml`: PostgreSQL 17.11, Redis 7.4, api(`:8000`), worker(`CELERY_CONCURRENCY=1`)
- `apps/api`: FastAPI, `pydantic-settings`, `GET /health`와 `GET /api/health`가 `{"status":"ok"}` (비밀값 없음)
- `apps/worker`: Celery 앱 + `worker.ping` 태스크. worker는 `PYTHONPATH`로 api 패키지를 읽어 스키마를 중복하지 않음
- `.env.example`을 Compose `env_file`로 연결. 실제 키는 로컬 `.env`만 (커밋 금지)

**아직 없는 것:** Alembic(당시), 통계 API, Next.js, nginx, 운영용 Dockerfile

**검증 방향:** `docker compose up` 후 health 200, api/worker pytest 스모크. UAT #11(비밀값 미커밋) 준비.

---

## 7. A-1에서 한 일

**목적:** [ERD.md](./ERD.md) v1.5를 PostgreSQL에 그대로 올리는 **초기 마이그레이션**. 이후 통계·PDF·상담 API가 붙을 테이블을 미리 만든다.

**테이블 (9개)**

| 구분 | 테이블 | 용도 |
|------|--------|------|
| 공공 캐시 | `public_sync_runs`, `public_cache_heads` | 배치 실행 기록, 활성 캐시 포인터 |
| 통계 | `stats_medical_rates`, `stats_auto_contracts`, `stats_life_join_status` | 실손·자동차·생명 캐시 행 |
| 선택 산출물 | `uploaded_documents`, `masked_coverages`, `ai_reports` | PDF job·마스킹 JSON·AI 리포트 |
| 동의 후 | `consultation_requests` | 이메일 상담 (암호화·만료) |

**의도적으로 없는 것**

- `session_profiles` / `user_profiles` / `profiles`
- 생년월일, 보험나이, 원본 파일명, 접근 토큰 원문 컬럼

익명 세션·리포트 토큰은 원문을 DB에 두지 않고 HMAC 해시만 둔다. 상세는 ERD.

**코드**

- `apps/api/app/models.py` — SQLAlchemy 모델
- `apps/api/alembic/versions/20260825_erd_v15_initial.py` — `upgrade` / `downgrade`
- `apps/api/tests/test_schema.py` — 필수 테이블 존재, 금지 테이블·컬럼 없음

**검증 방향:** Alembic `upgrade head` 후 스키마 검사, `downgrade` 경로, pytest. 이는 UAT #1(PG에 세션 프로필/생년월일 컬럼 없음)의 기반이다.

A-1 시점에는 **통계 데이터가 아직 없다.** 캐시를 채우는 일은 A-2(F-11 sync)다.

---

## 8. 지금 저장소에 있는 것 / 없는 것

**있는 것**

- 제품·설계 SSOT와 에이전트 규칙
- 로컬 Compose (postgres, redis, api, worker)
- FastAPI health
- Celery worker 스켈레톤
- ERD v1.5 모델과 초기 마이그레이션·스키마 테스트

**없는 것 (다음 단계)**

- 공공 OpenAPI 동기화와 캐시 적재
- `POST /api/v1/stats/*` 및 익명 세션 쿠키
- AI 리포트, PDF 업로드, 상담 API의 실제 동작
- `apps/web` (Next.js 화면, D3)
- EC2 운영 Compose·nginx TLS

---

## 9. 다른 사람에게 자주 생기는 오해

| 오해 | 실제 |
|------|------|
| 보험 비교·가입 사이트다 | 공개 통계를 쉽게 보여주는 참고 도구다 |
| 개인 보험료를 확정한다 | 공공 필드만. 견적·청약 없음 |
| 실손 totalCount는 가입자 수다 | 상품·레코드 수다 |
| 프로필을 DB에 쌓는다 | 브라우저 세션만. 계산 후 생년월일 폐기 |
| 화면이 공공 API를 실시간 호출한다 | 화면은 PG 캐시만. 포털은 배치만 |
| 프론트는 TypeScript다 | JavaScript만 |
| 차트가 Recharts다 | D3.js만 |

---

## 10. 다음에 보면 좋은 것

1. 이 브리핑 → [PRD.md](./PRD.md) 1–4절  
2. 기능·UAT → [FUNCTIONAL_SPEC.md](./FUNCTIONAL_SPEC.md)  
3. 화면·차트 → [PUBLIC_API_PAGE_PLAN.md](./PUBLIC_API_PAGE_PLAN.md) §3, [DESIGN.md](./DESIGN.md)  
4. DB → [ERD.md](./ERD.md) §0  
5. 코드: `docker-compose.yml`, `apps/api/app/main.py`, `apps/api/app/models.py`

데모(8/27)까지는 A-2 이후 통계 API와 웹 화면이 핵심이다. 배포 도메인·HTTPS는 TRACK A가 안정된 뒤에 정한다.
