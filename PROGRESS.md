# 지금까지 한 일 — 기획부터 A-1까지

**제품:** 모두의 보험 (Insurance For All)  
**문서 성격:** 공유·온보딩용 진행 브리핑 (구현 계약의 정본이 아님)  
**기준일:** 2026-08-28
**데모 목표:** 2026-08-27 P0 MVP  
**제품 버전:** MVP 1.4 · 스키마 ERD v1.5

화면·API·스키마의 세부 규칙은 이 파일이 아니라 저장소 SSOT를 따른다.  
[PRD.md](./PRD.md) · [FUNCTIONAL_SPEC.md](./FUNCTIONAL_SPEC.md) · [PUBLIC_API_PAGE_PLAN.md](./PUBLIC_API_PAGE_PLAN.md) · [ERD.md](./ERD.md) · [TECH_STACK.md](./TECH_STACK.md)

---

## 30초 요약

모두의 보험은 **이름·연락처 없이** 생년월일·성별·지역만으로 보험나이를 맞춘 뒤, 금융위원회 공공 OpenAPI의 **실손·자동차·생명** 통계를 허브에서 골라 보고, 쉬운 AI 설명과 (선택) 증권 PDF·이메일 상담을 붙이는 **의사결정 지원 웹**이다.

보험 모집, 상품 비교추천, 청약, 실시간 개인 견적은 **하지 않는다.** 사용자 프로필은 **PostgreSQL에 저장하지 않는다.**

2026-08-28 기준, TRACK B는 **B-4 문서(EC2 HTTP 체크리스트)**까지 왔다. 호스트는 **t4g.small · Ubuntu 24.04 · worker 상시 1**. EC2에서의 실제 `up`·`docker stats`·TLS는 아직이다.

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
[완료] A-0 ~ A-11  로컬 P0 (api/worker/web, 통계·PDF·상담, D3)
[완료] A-12  Compose web + UAT 1–13 체크리스트 (브라우저 E2E는 수동)
[완료] B-0   api/worker/web Dockerfile (arm64 베이스)
[완료] B-1   docker-compose.prod.yml (nginx 없음, PG/Redis 호스트 포트 없음)
[완료] B-2   nginx :80 → web·/api (TLS는 B-5)
[완료] B-3   prod 기동 후 Alembic → 공공 sync 1회 runbook
[완료] B-4   EC2 HTTP 1차 배포 체크리스트 (TECH_STACK §5.1.2). 인스턴스 기동·실측은 사용자
[다음] B-5   Let's Encrypt / HTTPS (`SESSION_COOKIE_SECURE=true`)
```

---

## 6. A-0에서 한 일

**목적:** 통계·화면 전에, 로컬에서 API와 worker가 DB·Redis와 붙는 **실행 뼈대**를 만든다. Dockerfile·웹·nginx는 이 단계에 넣지 않았다.

**들어간 것**

- 루트 `docker-compose.yml`: PostgreSQL 17.11, Redis 7.4, api(`:8000`), worker(`CELERY_CONCURRENCY=1`)
- `apps/api`: FastAPI, `pydantic-settings`, `GET /health`와 `GET /api/health`가 `{"status":"ok"}` (비밀값 없음)
- `apps/worker`: Celery 앱 + `worker.ping` 태스크. worker는 `PYTHONPATH`로 api 패키지를 읽어 스키마를 중복하지 않음
- 당시 `.env.example`을 복사한 로컬 `.env`를 Compose에 연결했다. 현재는 호스트 변수 치환 후 서비스별 허용 이름만 주입한다.

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
- 로컬 Compose (postgres, redis, api, worker, **web:3000**)
- 운영 형태 `docker-compose.prod.yml` (nginx:80, web/api/worker/redis/postgres)
- FastAPI 통계·리포트·PDF·상담, Celery 마스킹, Next.js 허브·스코프·D3
- ERD v1.5 모델과 초기 마이그레이션·스키마 테스트
- api/worker/web Dockerfile · `infra/nginx/nginx.conf`

**없는 것 (TRACK B 이후)**

- Let's Encrypt · certbot · EC2에서의 HTTP 실기동·2GiB `docker stats` 기록

---

## 9. 다른 사람에게 자주 생기는 오해

| 오해 | 실제 |
|------|------|
| 보험 비교·가입 사이트다 | 공개 통계를 쉽게 보여주는 참고 도구다 |
| 개인 보험료를 확정한다 | 공공 필드만. 견적·청약 없음 |
| 실손 totalCount는 가입자 수다 | 상품·레코드 수다 |
| 프로필을 DB에 쌓는다 | 브라우저 세션만. 계산 후 생년월일 재사용·저장·로그 금지 |
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
6. prod 기동 후 DB·캐시: [TECH_STACK.md](./TECH_STACK.md) §5.1.1
7. EC2 HTTP 배포 명령: [TECH_STACK.md](./TECH_STACK.md) §5.1.2

배포 HTTPS는 B-5.

---

## 11. UAT 체크리스트 재검증 (FUNCTIONAL_SPEC §6)

정본은 [FUNCTIONAL_SPEC.md](./FUNCTIONAL_SPEC.md) §6이다. 아래는 2026-08-28에 실제 실행한 자동 검증·Compose 스모크와 아직 수동인 항목을 구분한다. GA4(F-10a)는 P0 선택이라 구현하지 않았다.

기동:

```powershell
git check-ignore -v .env
docker compose up
# 다른 터미널 (호스트에 pytest가 있으면)
cd apps/api; py -m pytest
cd apps/web; npm test; npm run lint
```

| # | 수용 | 실행 | 현재 결과 |
|---|------|------|-----------|
| 1 | PG에 `session_profiles`/생년월일 컬럼 없음 | api 전체 pytest(스키마 포함) | **통과** — 47건 통과 |
| 2 | 입력 후 `/stats` · 최소 2스코프 통계 | worker seed 후 nginx 경유 health·auto POST | **부분** — 두 API 200. 브라우저 입력→허브 클릭은 수동 미실행 |
| 3 | 스코프 「이전」→ `/stats` | 브라우저 또는 코드 `href="/stats"` | **통과**(코드). 브라우저 미실행 |
| 4 | 입력 전 탭 비활성, 세션 후 활성 | 브라우저; `AppHeader` `hasSession` | **통과**(코드). 브라우저 미실행 |
| 5 | 실손 2열+, totalCount≠가입자 | `npm test` health-stats | **통과**(단위 테스트) |
| 6 | 스코프 AI/폴백, 생년월일 미전송 | api `test_reports_api.py` 포함 전체 pytest | **통과** — Responses 요청/혼합 출력/4xx·JSON 오류·빈 출력·timeout 폴백 테스트 |
| 7 | 상담 전 consultations 비어 있음 | api `test_consultations_api.py` 포함 전체 pytest | **통과** |
| 8 | 포털 다운이어도 캐시 200 | api stats 테스트 + worker seed 후 nginx 스모크 | **통과** — 포털 비호출 seed 캐시에서 health·auto 200 |
| 9 | 동의 고지·이메일 only·만료 삭제 | api 전체 pytest + web 테스트 | **통과**(자동). 브라우저 폼 수동 미실행 |
| 10 | 스코프 CTA → `/documents`·`/consultations` | `OptionalActions` | **통과**(코드). 브라우저 미실행 |
| 11 | `.env`/키 미커밋, 프론트 비밀 없음 | ignore·Compose env 경계·`NEXT_PUBLIC_` 검색 | **통과** — `.env` ignore, 포괄 `env_file` 없음, 서비스별 금지 변수 없음 |
| 12 | 고지·sessionStorage, “미수집” 없음 | web copy/session 테스트 | **통과** — 익명 쿠키 목적·30분·프로필 미포함·초기화 경로 포함 |
| 13 | D3 + 출처·기준·견적 아님 + KPI/표 | health/auto/life 차트 | **통과**(코드, `d3` import). 브라우저 미실행 |

**실행 결과:** api pytest **47 통과**(Starlette/httpx deprecation 경고 3), worker pytest **5 통과**, web **27 통과**·lint·production build 통과. 개발/운영 Compose config 통과, 운영 이미지 build·기동·Alembic·worker `--seed` sync 성공. nginx 경유 `/`, `/stats`, `/api/health` 200. 통계 health·auto 200, 쿠키 재사용·`Max-Age=1800`·HttpOnly·SameSite=Lax·응답 생년월일 부재·쿼리 거절·초기화 204/만료를 확인했다.

첫 nginx 스모크는 api/web 재생성 뒤 이전 upstream IP를 잡고 있어 502였고 nginx 재시작 후 통과했다. 첫 PowerShell 통계 본문은 문자 인코딩 오류로 422였으며 UTF-8 바이트 전송으로 고쳐 통과했다. 실패 결과를 통과로 계산하지 않았다.

**리소스 스냅샷:** 2026-08-28 개발 PC `docker stats --no-stream`(이미 떠 있던 prod, **mem_limit 재생성 전**): postgres ~23MiB, redis ~5MiB, nginx ~15MiB, api ~64MiB, worker ~59MiB, web ~68MiB. LIMIT 열은 호스트 ~15GiB였다. 이는 2GiB t4g.small 실측이 아니고 PDF 피크·CPU credit 근거도 아니다. `mem_limit`은 compose config에 반영됐으나 실행 중 컨테이너 recreate는 이번 세션에서 승인되지 않아 적용 확인은 미실행이다.

**남은 위험:** 브라우저 수동 UAT(#2–4, #9–10, #13). B-4 EC2 HTTP 실기동·`docker stats`(2GiB)는 사용자 실행 전 **미실측**. B-5 HTTPS에서 `Secure=true` 쿠키. AMI는 SSM 조회만(저장소에 ID 고정 없음). 크레딧·IPv4·EBS 30GB·송신 한도. 26.04는 기본값이 아니다. GA4(F-10a)는 구현하지 않았다.
