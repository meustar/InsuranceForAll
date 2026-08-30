# Flowchart

**프로젝트:** 모두의 보험 (Insurance For All)  
**버전:** 2026-08-24 (MVP 1.4 — Tab 허브 여정 · 차트 유형)
**관련:** [PRD.md](./PRD.md) · [FUNCTIONAL_SPEC.md](./FUNCTIONAL_SPEC.md) · [PUBLIC_API_PAGE_PLAN.md](./PUBLIC_API_PAGE_PLAN.md) · [DESIGN.md](./DESIGN.md) · [ENVIRONMENT.md](./ENVIRONMENT.md)

- **1장:** P0 필수  
- **2장:** P1/P2 전체 (데모 범위 아님)

---

## 1. MVP 필수 Flow (P0)

포함: F-01~F-08, F-11.  
제외: 사용자 여정의 F-09·F-10(별 라우트 `/ops`), F-12, F-13.

```mermaid
flowchart TD
  START[서비스 접속]

  MAIN["F-01+F-02 메인 /<br/>소개·고지 + 생년월일·성별·지역<br/>프로필 PG 미저장"]
  VALID{"필수 입력 OK?"}
  ERR[입력 오류 안내]

  HUB["F-03 통계 허브 /stats<br/>탭 메뉴 + 스코프 요약 카드<br/>PDF·상담 진입(선택)"]

  H["실손 탭 /stats/health<br/>캐시·D3 가로막대·덤벨·출처"]
  HAI["F-07 AI scope=health"]
  HCTA["선택 CTA<br/>PDF · 이메일 상담"]
  A["자동차 탭 /stats/auto"]
  AAI["F-07 AI scope=auto"]
  ACTA["선택 CTA"]
  L["생명 탭 /stats/life"]
  LAI["F-07 AI scope=life"]
  LCTA["선택 CTA"]

  BACK["「이전」→ /stats 허브"]

  DOCPAGE["/documents<br/>F-05 PDF 업로드"]
  F05["F-05 documents 202+job"]
  F06["F-06 마스킹 JSONB"]
  CONPAGE["/consultations<br/>F-08 이메일 상담"]
  F08["동의 + 이메일 암호화<br/>설계사 알림"]
  END1[종료 · 연락처 없음]
  DONE[접수]

  START --> MAIN --> VALID
  VALID -->|아니오| ERR --> MAIN
  VALID -->|예| HUB

  HUB -->|실손 선택| H --> HAI --> HCTA
  HUB -->|자동차 선택| A --> AAI --> ACTA
  HUB -->|생명 선택| L --> LAI --> LCTA
  HCTA --> BACK
  ACTA --> BACK
  LCTA --> BACK
  BACK --> HUB

  HUB -->|상단 탭| H
  HUB -->|상단 탭| A
  HUB -->|상단 탭| L

  HCTA -->|PDF| DOCPAGE --> F05 --> F06 --> BACK
  ACTA -->|PDF| DOCPAGE
  LCTA -->|PDF| DOCPAGE

  HCTA -->|상담| CONPAGE
  ACTA -->|상담| CONPAGE
  LCTA -->|상담| CONPAGE
  HCTA -->|건너뛰기| BACK
  CONPAGE -->|동의+제출| F08 --> DONE
  CONPAGE -->|취소/복귀| BACK
  HUB -->|종료| END1
```

규칙 요약:

- 입력 완료 후 **항상 허브** 랜딩. 스코프 순서 강제 없음.
- 상단 탭은 **허브 진입 후**(세션 프로필 있음)만 활성.
- 스코프 화면 **「이전」** = `/stats` 허브.
- 허브에 P0 AI 필수 아님. AI는 각 스코프 탭 하단만.
- **스코프 하단(AI 아래)** PDF·이메일 상담 CTA → `/documents`, `/consultations` 전용 페이지.
- P0 상담 UI는 **이메일만**. 통계 탐색 중 연락처 수집 없음.

### 1-2. P0 시스템

```mermaid
flowchart LR
  subgraph sync["F-11 배치"]
    CRON[cron/기동]
    PORTAL[OpenAPI 3종]
    RUNS[(public_sync_runs)]
    HEAD[(public_cache_heads)]
    STATS[("stats_medical_rates<br/>stats_auto_contracts<br/>stats_life_join_status")]
    CRON --> PORTAL --> RUNS --> STATS
    RUNS -->|성공| HEAD
    PORTAL -->|실패| STALE[head 유지 + stale]
    STALE --> HEAD
  end

  subgraph app["요청 경로"]
    WEB[Next.js]
    API[FastAPI]
    SESSION["메모리/sessionStorage<br/>프로필 PG 미저장"]
    COOKIE["HttpOnly ifa_anon<br/>프로필 없음 · 30분 비활성"]
    D3["D3 Client chart<br/>toBarSeries / dumbbell"]
    SESSION -->|프로필 읽기| WEB
    WEB -->|"POST JSON<br/>URL query 금지"| API
    API -->|성공한 /api/v1 응답에서 갱신| COOKIE
    WEB -->|프로필 초기화 시 만료 요청| API
    API --> HEAD
    API --> STATS
    WEB --> D3
  end

  subgraph pdf["PDF"]
    Q[(Redis)]
    W[Celery]
    PG[(PostgreSQL)]
    API --> Q --> W --> PG
  end
```

---

## 2. 이후 전체 Flow (P0 + P1 + P2)

```mermaid
flowchart TD
  subgraph USER["사용자"]
    MAIN[메인 입력]
    HUB[통계 허브]
    H[실손 탭]
    A[자동차 탭]
    L[생명 탭]
    PDF[PDF]
    AI[스코프별 AI]
    F12["F-12 수정 P1"]
    F13["F-13 설계사 P2"]
    F08[상담]
    MAIN --> HUB
    HUB --> H
    HUB --> A
    HUB --> L
    H --> HUB
    A --> HUB
    L --> HUB
    H -.-> AI
    A -.-> AI
    L -.-> AI
    HUB --> PDF --> F08
    AI --> F12
    F08 --> F13
  end

  subgraph ADMIN["운영 /ops"]
    LOGIN["/ops/login"]
    F10[대시보드]
    F09[다건 PDF]
    SYNC[수동 동기화]
    LOGIN --> F10
    F10 --> F09
    F10 --> SYNC
  end
```

### 2-2 ~ 2-3

관리자·파싱 수정·설계사 디렉터리 — 기존 P1/P2 취지 유지 (데모 제외).  
관리자(F-09·F-10)는 **`/ops` · `/ops/login`** 이며 사용자 `/` Header와 분리한다. 사용자 Sign In을 넣지 않는다. HMAC 쿠키 `ifa_ops`(JWT 아님). 상담 암호문 복호화 열람은 F-10. F-10a GA4는 선택 P0·**미구현**(허용 이벤트 목록 없음)이며 생년월일·연락처·토큰을 보내지 않는다. F-12·F-13은 P1/P2.

---

## 3. 화면 목록 (프로토타입)

| 화면 | MVP | 비고 |
|------|-----|------|
| 메인 (소개+입력) | F-01, F-02 | `/` |
| 통계 허브 | F-03 | `/stats` · 탭 선택·요약 |
| 실손 탭+비교+AI | F-03, F-04, F-07 | `/stats/health` · D3 |
| 자동차 탭+AI | F-03, F-07 | `/stats/auto` · D3 |
| 생명 탭+AI | F-03, F-07 | `/stats/life` · D3 |
| PDF 진행 | F-05, F-06 | 선택 · 허브/공통 하단 |
| 상담 | F-08 | 선택 |
| 관리자 | `/ops` | F-09, F-10. 로그인 `/ops/login` |

v0: **JavaScript only**, Next App Router, Tailwind, **D3.js** — [TECH_STACK.md](./TECH_STACK.md).
