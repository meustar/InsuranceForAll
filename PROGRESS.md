# 현재 상태 보고서 — 모두의 보험

**제품:** 모두의 보험 (Insurance For All)  
**문서 성격:** 공유·온보딩용 진행 브리핑 (구현 계약의 정본이 아님)  
**기준일:** 2026-08-28  
**데모 목표(역사):** 2026-08-27 P0 MVP  
**제품 버전:** MVP 1.4 · 스키마 ERD v1.5

화면·API·스키마의 세부 규칙은 이 파일이 아니라 저장소 SSOT를 따른다.  
충돌 시 Git 문서가 Notion보다 우선한다.  
[PRD.md](./PRD.md) · [FUNCTIONAL_SPEC.md](./FUNCTIONAL_SPEC.md) · [PUBLIC_API_PAGE_PLAN.md](./PUBLIC_API_PAGE_PLAN.md) · [DESIGN.md](./DESIGN.md) · [ERD.md](./ERD.md) · [TECH_STACK.md](./TECH_STACK.md) · [ENVIRONMENT.md](./ENVIRONMENT.md)

---

## 30초 요약

모두의 보험은 **이름·연락처 없이** 생년월일·성별·지역만으로 보험나이를 맞춘 뒤, 금융위원회 공공 OpenAPI의 **실손·자동차·생명** 통계를 허브에서 골라 보고, 쉬운 AI 설명과 (선택) 증권 PDF·이메일 상담을 붙이는 **의사결정 지원 웹**이다.

보험 모집, 상품 비교추천, 청약, 실시간 개인 견적은 **하지 않는다.** 사용자 프로필은 **PostgreSQL에 저장하지 않는다.**

2026-08-28 코드 기준, 로컬 P0(TRACK A, A-0~A-12)와 운영 형태 산출물(TRACK B, B-0~B-4 **문서·Compose·Dockerfile**)은 저장소에 있다. EC2 인스턴스 기동·`docker stats`·TLS(B-5)는 **미실측**이다. 로컬 `docker compose up`은 postgres/redis까지 Healthy인 적이 있으나, api/worker는 기동 시 PyPI 다운로드 타임아웃으로 죽은 적이 있다(앱 결함이 아니라 기동 리스크).

---

## 1. 사용자가 하게 되는 일 (P0)

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

계약 문장은 [PRD.md](./PRD.md) · [FUNCTIONAL_SPEC.md](./FUNCTIONAL_SPEC.md) · [FLOWCHARTS.md](./FLOWCHARTS.md).

---

## 2. 기획에서 잠근 핵심 결정

구버전(프로필 PG 저장, 실손→자동차→생명 강제 순서, TypeScript 프론트, Recharts 등)은 폐기했다.

| 주제 | 확정 |
|------|------|
| 제품 범위 | P0 사용자 여정 + 운영 `/ops`(F-09·F-10). OCR은 P1 미구현 |
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

## 3. F-ID × 구현 × 테스트 (2026-08-28 코드)

정본 수용 기준은 [FUNCTIONAL_SPEC.md](./FUNCTIONAL_SPEC.md)다. 아래는 **코드가 있는지**만 적는다. P0 정의를 후퇴시키지 않는다.

| F-ID | 구현 | 테스트 | 비고 |
|------|------|--------|------|
| F-01 메인 고지 | 있음 | 부분 | `apps/web/app/page.js`, `lib/copy.js` |
| F-02 공통 입력 | 있음 | 있음 | `sessionStorage` · PG 미저장 |
| F-03 허브·탭 | **있음** | 부분 | 3스코프 UI·POST·스코프 전용 필터(`ScopeFilterBar`) 있음 |
| F-04 실손 비교 | 있음 | 있음 | 남/여 2열+, D3 |
| F-05 PDF 업로드 | 있음 | 있음 | `POST /api/v1/documents` |
| F-06 마스킹 | 있음 | 부분 | `worker.mask_document` |
| F-07 스코프 AI | 있음 | 있음 | 화면 집계만 · 생년월일/원본 PDF 거절 |
| F-08 상담 이메일 | 있음 | 있음 | SMTP 미설정 시 알림은 건너뜀 |
| F-11 공공 배치 | 있음 | 있음 | `worker.sync_public_api` |
| F-09 다건 PDF | **있음** | 부분 | `POST /api/v1/ops/documents`. 사용자 Header 없음 |
| F-10 운영 대시보드 | **있음** | 있음 | `/ops` · `ifa_ops`. 상담 복호화 열람 |
| F-10a GA4 | **없음** | 없음 | 스펙은 “가능하면”. 허용 이벤트 목록 없어 gtag 미삽입 |

UAT 1–13 상세는 §8. 브라우저 E2E는 수동이 남아 있다.

---

## 4. 구현 로드맵

로컬을 TRACK A, EC2 배포를 TRACK B로 나눈다.

```text
[완료] 기획·SSOT·Stitch·tokens.css
[완료] A-0 ~ A-11  로컬 P0 (api/worker/web, 통계·PDF·상담, D3)
[완료] A-12  Compose web + UAT 1–13 체크리스트 (브라우저 E2E는 수동)
[완료] B-0   api/worker/web Dockerfile (멀티아키 베이스, amd64 고정 없음)
[완료] B-1   docker-compose.prod.yml (PG/Redis 호스트 포트 없음)
[완료] B-2   nginx :80 → web·/api (TLS는 B-5)
[완료] B-3   prod 기동 후 Alembic → 공공 sync 1회 runbook
[완료] B-4   EC2 HTTP 체크리스트 (TECH_STACK §5.1.2). 인스턴스 기동·실측은 사용자
[다음] B-5   Let's Encrypt / HTTPS (`SESSION_COOKIE_SECURE=true`)
```

B-1 산출물은 현재 트리에서 **nginx 서비스가 있는** `docker-compose.prod.yml`이다. “nginx 없음”은 과거 Checkpoint 서술이다.

---

## 5. 지금 저장소에 있는 것 / 없는 것

**있는 것**

- 제품·설계 SSOT와 에이전트 규칙
- 로컬 `docker-compose.yml`: postgres, redis, api, worker, **web:3000**
- 운영 형태 `docker-compose.prod.yml`: nginx:80, web/api/worker/redis/postgres (호스트는 nginx만)
- FastAPI: health, session DELETE, stats POST, documents, reports, consultations, **ops**
- Celery: `worker.ping`, `worker.sync_public_api`, `worker.mask_document`
- Next.js 허브·스코프·D3 (`HealthCharts.jsx`) · 스코프 필터 (`ScopeFilterBar`). Recharts·Chart.js 없음
- ERD v1.5 모델 9테이블 · Alembic `erd_v15_initial` · 프로필 테이블 없음
- api/worker/web Dockerfile · `infra/nginx/nginx.conf`

**없는 것 · 미실측**

- Let's Encrypt · certbot · EC2 HTTP 실기동 · 2GiB `docker stats` 기록 (C)
- GA4 (B — F-10a “가능하면”, 미구현)
- 브라우저 수동 UAT (#2–4, #9–10, #13)

---

## 6. 로컬 기동 주의 (앱 결함으로 쓰지 말 것)

정본 절차는 [README.md](./README.md) · [ENVIRONMENT.md](./ENVIRONMENT.md).

1. **`.env` 덮어쓰기:** `Copy-Item .env.example .env`는 이미 채운 `.env`를 빈 템플릿으로 덮는다. **최초 1회만.** 이후에는 `docker compose up`만 실행한다.
2. **`POSTGRES_USER` / `POSTGRES_DB`는 비우지 않는다.** 비면 healthcheck가 `pg_isready -U -d …`가 되어 `FATAL: role "-d" does not exist`가 난다. 값은 채팅·문서에 적지 않는다.
3. **기동 시 pip:** 로컬 api/worker는 `python:3.12-slim`에서 **매 기동** `pip install --no-cache-dir`를 한다. `files.pythonhosted.org` Read timed out로 컨테이너가 exit 2가 된 적이 있다. postgres/redis Healthy와 별개다. prod Compose는 Dockerfile에 의존성을 굽는다.
4. 볼륨 `postgres_data`가 있으면 `Skipping initialization`은 정상이다.

---

## 7. 다른 사람에게 자주 생기는 오해

| 오해 | 실제 |
|------|------|
| 보험 비교·가입 사이트다 | 공개 통계를 쉽게 보여주는 참고 도구다 |
| 개인 보험료를 확정한다 | 공공 필드만. 견적·청약 없음 |
| 실손 totalCount는 가입자 수다 | 상품·레코드 수다 |
| 프로필을 DB에 쌓는다 | 브라우저 세션만. 계산 후 생년월일 재사용·저장·로그 금지 |
| 화면이 공공 API를 실시간 호출한다 | 화면은 PG 캐시만. 포털은 배치만 |
| 프론트는 TypeScript다 | JavaScript만 |
| 차트가 Recharts다 | D3.js만 |
| 로컬 pip timeout은 DB 장애다 | PyPI 다운로드 실패. postgres는 별도 |

---

## 8. UAT 체크리스트 (FUNCTIONAL_SPEC §6)

정본은 [FUNCTIONAL_SPEC.md](./FUNCTIONAL_SPEC.md) §6이다. 2026-08-28에 기록된 자동 검증과 아직 수동인 항목을 구분한다.

| # | 수용 | 실행 | 현재 결과 |
|---|------|------|-----------|
| 1 | PG에 `session_profiles`/생년월일 컬럼 없음 | api pytest(스키마) | **통과** — 당시 47건 |
| 2 | 입력 후 `/stats` · 최소 2스코프 | API POST 스모크 | **부분** — API 200. 브라우저 입력→허브는 수동 미실행 |
| 3 | 스코프 「이전」→ `/stats` | 코드 `href="/stats"` | **통과**(코드). 브라우저 미실행 |
| 4 | 입력 전 탭 비활성 | `AppHeader` `hasSession` | **통과**(코드). 브라우저 미실행 |
| 5 | 실손 2열+, totalCount≠가입자 | `health-stats` 단위 | **통과** |
| 6 | 스코프 AI/폴백, 생년월일 미전송 | `test_reports_api.py` | **통과** |
| 7 | 상담 전 consultations 비어 있음 | `test_consultations_api.py` | **통과** |
| 8 | 포털 다운이어도 캐시 200 | stats + seed | **통과** |
| 9 | 동의 고지·이메일 only | api+web 단위 | **통과**(자동). 브라우저 폼 수동 미실행 |
| 10 | 스코프 CTA | `OptionalActions` | **통과**(코드). 브라우저 미실행 |
| 11 | `.env`/키 미커밋 | ignore·Compose 경계 | **통과** |
| 12 | 고지·sessionStorage, “미수집” 없음 | web copy/session | **통과** |
| 13 | D3 + 출처·견적 아님 | 차트 import | **통과**(코드). 브라우저 미실행 |

당시 기록: api pytest **47**, worker **5**, web **27**·lint·production build. 개발 PC `docker stats`는 호스트 ~15GiB 맥락이며 **t4g.small 2GiB 실측이 아니다.**

---

## 9. 다음에 보면 좋은 것

1. 이 보고서 → [PRD.md](./PRD.md) 1–4절  
2. 기능·UAT → [FUNCTIONAL_SPEC.md](./FUNCTIONAL_SPEC.md)  
3. 화면·차트 → [PUBLIC_API_PAGE_PLAN.md](./PUBLIC_API_PAGE_PLAN.md) §3, [DESIGN.md](./DESIGN.md)  
4. DB → [ERD.md](./ERD.md) §0  
5. 코드: `docker-compose.yml`, `apps/api/app/main.py`, `apps/api/app/models.py`  
6. prod 기동 후 DB·캐시: [TECH_STACK.md](./TECH_STACK.md) §5.1.1  
7. EC2 HTTP 명령: [TECH_STACK.md](./TECH_STACK.md) §5.1.2  

**다음 작업:** B-5 HTTPS. 로컬 안정 기동이 필요하면 api/worker의 매 기동 pip 재설치는 별 Checkpoint(구현)로 다룬다.

**잔여 위험:** 브라우저 수동 UAT. EC2 미실측. 크레딧·IPv4·EBS 30GB·송신 한도. SMTP 미설정 시 상담 알림 없음. 스코프 필터 UI 미구현.

에이전트는 기능 단위가 끝나면 **STOP**하고, **commit/push는 사용자가 한다.**
