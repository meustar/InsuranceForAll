# Flowchart

**프로젝트:** 모두의 보험 (Insurance For All)  
**버전:** 2026-08-21 (MVP 1.2 여정)  
**관련:** [PRD.md](./PRD.md) · [FUNCTIONAL_SPEC.md](./FUNCTIONAL_SPEC.md) · [PUBLIC_API_PAGE_PLAN.md](./PUBLIC_API_PAGE_PLAN.md)

- **1장:** P0 필수  
- **2장:** P1/P2 전체 (데모 범위 아님)

---

## 1. MVP 필수 Flow (P0)

포함: F-01~F-08, F-11.  
제외: F-09, F-10 UI, F-12, F-13.

```mermaid
flowchart TD
  START[서비스 접속]

  MAIN["F-01+F-02 메인<br/>소개·고지 + 생년월일·성별·지역<br/>프로필 PG 미저장"]
  VALID{"필수 입력 OK?"}
  ERR[입력 오류 안내]

  AGE["보험나이 산정<br/>asOfDate + 어댑터"]

  H["F-03 실손 /stats/health<br/>캐시·막대·출처"]
  HAI["F-07 AI scope=health"]
  HC{"다음?"}

  A["F-03 자동차 /stats/auto"]
  AAI["F-07 AI scope=auto"]
  AC{"다음?"}

  L["F-03 생명 /stats/life"]
  LAI["F-07 AI scope=life"]

  PDF{"PDF 업로드? 선택"}
  F05["F-05 documents 202+job"]
  F06["F-06 마스킹 JSONB"]
  ASK{"상담?"}
  END1[종료 · 연락처 없음]
  F08["F-08 동의+연락처"]
  DONE[접수]

  START --> MAIN --> VALID
  VALID -->|아니오| ERR --> MAIN
  VALID -->|예| AGE --> H --> HAI --> HC
  HC -->|자동차| A --> AAI --> AC
  HC -->|건너뛰고 상담/종료| ASK
  AC -->|생명| L --> LAI --> PDF
  AC -->|건너뛰기| PDF
  LAI --> PDF
  PDF -->|안 함| ASK
  PDF -->|함| F05 --> F06 --> ASK
  ASK -->|아니오| END1
  ASK -->|예| F08 --> DONE
```

### 1-2. P0 시스템

```mermaid
flowchart LR
  subgraph sync["F-11 배치"]
    CRON[cron/기동]
    PORTAL[OpenAPI 3종]
    RUNS[(public_sync_runs)]
    HEAD[(public_cache_heads)]
    STATS[(stats_medical / auto / life)]
    CRON --> PORTAL --> RUNS --> STATS
    RUNS -->|성공| HEAD
    PORTAL -->|실패| STALE[head 유지 + stale]
    STALE --> HEAD
  end

  subgraph app["요청 경로"]
    WEB[Next.js]
    API[FastAPI]
    COOKIE[프로필 쿠키 · PG 미저장]
    WEB --> COOKIE --> API
    API --> HEAD
    API --> STATS
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
    H[실손]
    A[자동차]
    L[생명]
    PDF[PDF]
    AI[페이지별 AI]
    F12["F-12 수정 P1"]
    F13["F-13 설계사 P2"]
    F08[상담]
    MAIN --> H --> A --> L --> PDF --> AI --> F08
    AI --> F12
    F08 --> F13
  end

  subgraph ADMIN["관리자 P1"]
    F09[다건 PDF]
    F10[대시보드]
    SYNC[수동 동기화]
  end
```

### 2-2 ~ 2-3

관리자·파싱 수정·설계사 디렉터리 — 기존 P1/P2 취지 유지 (데모 제외).

---

## 3. 화면 목록 (프로토타입)

| 화면 | MVP | 비고 |
|------|-----|------|
| 메인 (소개+입력) | F-01, F-02 | 생년월일·성별·지역 |
| 실손 통계+비교+AI | F-03, F-04, F-07 | |
| 자동차 통계+AI | F-03, F-07 | |
| 생명 통계+AI | F-03, F-07 | |
| PDF 진행 | F-05, F-06 | 선택 |
| 상담 | F-08 | |
| 관리자 | | P1 |

v0: **JavaScript only**, Next App Router, Tailwind — [TECH_STACK.md](./TECH_STACK.md).
