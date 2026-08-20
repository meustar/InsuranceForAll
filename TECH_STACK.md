# 기술스택 및 인프라 (버전 고정)

**프로젝트:** 모두의 보험 (Insurance For All)  
**작성 기준일:** 2026-08-20  
**관련 문서:** [PRD.md](./PRD.md), [FUNCTIONAL_SPEC.md](./FUNCTIONAL_SPEC.md), [FLOWCHARTS.md](./FLOWCHARTS.md)

원칙: **서로 공식 문서에서 호환이 확인된 안정(LTS/stable) 조합만 사용**한다.  
패치 버전(`x.y.z`의 `z`)은 배포 직전 보안 패치로 올려도 된다. **메이저 버전은 이 표에서 바꾸지 않는다.**

---

## 0. 왜 예전 자료와 버전이 다른가

여러 AI·문서가 서로 다른 시점에 스택을 적어 불일치가 생겼다. 아래는 **채택하지 않는 옛 값**이다.

| 출처 | 옛 값 | 이번 확정 | 이유 |
|------|--------|-----------|------|
| 기능정의서 PDF | Next.js 14.2, React 18.3, TS 없음 명시 안 함 | Next.js **16.3.x** + React **19** + **JavaScript** | Next 공식 문서 현재 버전 16.3.1. Node 18/20 EOL 이후 런타임은 24 LTS |
| 기능정의서 PDF | Python 3.11, FastAPI 0.111, Celery 5.4, Redis 7.2, PG 15 | Python **3.12**, FastAPI **0.141.x**, Celery **5.6.x**, Redis **7.4**, PG **17.11** | 각 공식 지원표와 맞춤 |
| 기능정의서 PDF | Ubuntu 24.04, EC2 t3a.medium | Ubuntu **26.04 LTS**, EC2 **t4g.medium** | 사용자 지정 OS + Graviton 비용 효율 |
| 이전 Cursor 문서 | TypeScript 5.x, Turborepo, 관리자 P0 | **JavaScript**, Turborepo **생략**, 관리자 **P1** | 숙련 언어·7일 MVP 범위 |

---

## 1. 확정 스택 한 장

```text
[Host] AWS EC2 t4g.medium (2 vCPU, 4 GiB, arm64) + EBS gp3 30GB
[OS]   Ubuntu 26.04 LTS (Resolute Raccoon)
[Runtime] Docker Engine 28.x 또는 29.x (설치 시점 CE stable) + Compose v2

[Tier-1 Presentation]
  nginx 1.30.4 (Docker tag: nginx:1.30.4-alpine 또는 nginx:stable-alpine)
  Next.js 16.3.x + React 19.x + JavaScript (TypeScript 미사용)
  Tailwind CSS 4.x
  Node.js 24.x Active LTS
  패키지 매니저: npm (Node에 포함, 초보자·v0 산출물과 맞춤)

[Tier-2 Application]
  FastAPI 0.141.x + Uvicorn (fastapi[standard]) on Python 3.12
  Pydantic v2 (FastAPI 기본)
  SQLAlchemy 2.0.x + Alembic + asyncpg
  Celery 5.6.x (concurrency=1) + redis-py ≥ 4.5.2
  Redis 7.4.x (redis:7.4-alpine)  — 브로커/캐시
  OpenAI API — 비용형 모델(문서상 GPT-5.6 Luna 계열; 구현 시 공식 Models 페이지 ID 사용)

[Tier-3 Data]
  PostgreSQL 17.11 (postgres:17.11-alpine)

[프로토타입 UI]
  Figma Make (화면) → v0 (React/Next + Tailwind 코드) → 이 레포 apps/web 에 JS로 이식

[Analytics]
  GA4 gtag (P0는 이벤트 수집만, 관리자 대시보드는 P1)
```

---

## 2. 호환성 매트릭스 (이 조합만 설치)

| 구성 A | 구성 B | 호환 근거 |
|--------|--------|-----------|
| Next.js 16.3.x | Node.js **≥ 20.9.0**, 권장 **24.x LTS** | [Upgrading to 16](https://nextjs.org/docs/app/guides/upgrading/version-16): 최소 Node 20.9.0, Node 18 미지원 |
| Next.js 16.3.x | React 19.x | 동일 문서. App Router는 React 19 |
| Next.js 16.3.x | JavaScript (`.js` / `.jsx`) | [create-next-app `--js` / `--javascript`](https://nextjs.org/docs/app/api-reference/cli/create-next-app) |
| Node 24.x | Next 16 | Node 20은 2026-04-30 EOL. Active LTS는 **24**(Krypton). 26은 2026-10-28까지 Current → MVP는 24 |
| FastAPI 0.141.x | Python ≥ 3.10, 권장 **3.12** | [PyPI fastapi](https://pypi.org/project/fastapi/) `Requires-Python: >=3.10` |
| Celery 5.6.x | Python 3.9–3.13, **3.12** | [What’s new in Celery 5.6](https://docs.celeryq.dev/en/stable/history/whatsnew-5.6.html) |
| Celery 5.6.x | Redis 브로커, redis-py ≥ 4.5.2 | 동일 Celery 5.6 노트 |
| FastAPI | SQLAlchemy **2.0.x** (2.1 베타 제외) | SQLAlchemy 2.1은 2026-06 기준 베타. MVP는 2.0 안정선 |
| PostgreSQL 17.11 | SQLAlchemy 2 + asyncpg | PG GDG: 17 지원 ~ 2029-11-08. 마이너 17.11은 2026-08-13 |
| nginx 1.30.x | Docker Official `stable` | [hub.docker.com/_/nginx](https://hub.docker.com/_/nginx/) `1.30.4, stable` |
| Ubuntu 26.04 LTS | Docker CE, arm64 | [Ubuntu 26.04 릴리스 노트](https://documentation.ubuntu.com/release-notes/26.04/) 지원 ~ 2031-04 |

**설치하지 말 것**

- TypeScript, `@types/*` (프론트)
- Node 18 / 20 / 26 (20 EOL, 26은 아직 LTS 아님)
- PostgreSQL 18을 MVP에 올리는 것 (가능하나 검증 시간 없음)
- Redis 8 공식 이미지 (라이선스가 RSALv2/SSPL 등으로 바뀜. 브로커 용도는 7.4로 충분)
- SQLAlchemy 2.1 베타

---

## 3. 프론트: JavaScript + Figma Make + v0

### 3.1 언어

개발자가 TypeScript에 익숙하지 않으므로 **프론트 전 파일은 JavaScript**다.

```bash
npx create-next-app@16.3.1 apps/web --js --tailwind --eslint --app --no-src-dir --use-npm
```

공식 플래그: `--js` 또는 `--javascript`. ([create-next-app](https://nextjs.org/docs/app/api-reference/cli/create-next-app))

v0가 `.tsx`를 주면 **같은 폴더에서 `.jsx`로 바꾸고 `tsconfig.json`을 넣지 않는다.** 프롬프트에 다음을 고정한다.

> Use Next.js App Router, JavaScript only (no TypeScript), Tailwind CSS. Do not generate .ts or .tsx files.

### 3.2 프로토타입 파이프라인

1. **Figma Make**로 랜딩 → 최소정보 → 통계 → 비교 → PDF → 리포트 → 상담 화면을 만든다.
2. **v0**에 Figma 링크 또는 스크린샷을 넣고 위 JS 제약을 건다. ([v0 + Figma](https://vercel.com/blog/working-with-figma-and-custom-design-systems-in-v0))
3. 생성된 UI를 `apps/web`에 붙이고, 데이터는 FastAPI(`/api`는 nginx가 백엔드로 프록시)만 호출한다.
4. v0 기본 컴포넌트(shadcn/ui)를 써도 되지만, **런타임은 React 19 + Next 16**과 맞춰 의존성을 올리지 않는다.

### 3.3 패키지 예시 (`apps/web/package.json`)

```json
{
  "private": true,
  "engines": { "node": ">=20.9.0 <25" },
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "next": "16.3.1",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "eslint": "^9.0.0",
    "eslint-config-next": "16.3.1",
    "tailwindcss": "^4.0.0"
  }
}
```

`engines` 상한 `<25`는 Node 26 Current를 실수로 쓰지 않기 위함이다.

---

## 4. 백엔드 / 워커 / DB

| 구성 | 핀 | 근거 |
|------|-----|------|
| Python | 3.12.x | FastAPI ≥3.10, Celery 5.6은 3.9–3.13. PyMuPDF 휠은 3.12가 MVP에 가장 무난 |
| FastAPI | 0.141.x (예: 0.141.1, 2026-07-29) | [GitHub fastapi 0.141.1](https://github.com/fastapi/fastapi/releases/tag/0.141.1) |
| Uvicorn | `fastapi[standard]`에 포함 | FastAPI 공식 설치 방식 |
| SQLAlchemy | 2.0.x | 2.1은 베타. JSONB는 PG와 함께 사용 |
| 드라이버 | asyncpg | PostgreSQL async |
| Alembic | SQLAlchemy 2와 동일 세대 | 마이그레이션 |
| Celery | 5.6.x (PyPI 예: 5.6.3) | [PyPI celery](https://pypi.org/project/celery/) |
| Redis | **7.4.x** 이미지 | Celery Redis 트랜스포트 검증선. Redis 8은 라이선스 변경 |
| PostgreSQL | **17.11** | [PG 버전 정책](https://www.postgresql.org/support/versioning/), [17.11 노트](https://www.postgresql.org/docs/release/17.11/) |
| PyMuPDF | 설치 시점 최신 안정 | Native PDF 텍스트/좌표. 스캔 OCR은 P2 |
| OpenAI | 공식 SDK 최신 + **비용형 채팅 모델** | [OpenAI Models](https://developers.openai.com/api/docs/models) — 고용량·저비용은 GPT-5.6 Luna 계열. 구현 시 해당 페이지의 **model ID**를 `.env`에만 넣는다 |
| httpx | 0.28+ | 공공 OpenAPI REST |

Docker 태그:

```text
postgres:17.11-alpine
redis:7.4-alpine
nginx:1.30.4-alpine
python:3.12-slim
node:24-bookworm-slim   # web 이미지 빌드
```

---

## 5. 인프라 (단일 EC2 최소 3-Tier)

사용자 전제: **AWS EC2 + Ubuntu 26.04 + Docker 3-Tier**.

```text
Internet
  → nginx :443  (Tier 1)
       /     → web :3000  (Next.js, JS)
       /api  → api :8000  (FastAPI)
  → api + worker(Celery) + redis     (Tier 2)
  → postgres                         (Tier 3)
```

| 항목 | 값 | 근거 |
|------|-----|------|
| 인스턴스 | **t4g.medium** (2 vCPU / 4 GiB, Graviton2) | 6컨테이너(nginx, web, api, worker, redis, postgres)를 2GiB(`t4g.small`)에 넣으면 OOM 위험이 큼. AWS는 T4g를 버스트 가능 Graviton으로 안내 |
| 디스크 | gp3 30 GB | 이미지+PG+로그 |
| 리전 | ap-northeast-2 | 지연, 공공 API |
| 공개 포트 | 443 (80은 리다이렉트), SSH는 본인 IP | 3000/8000/5432/6379 비공개 |
| Worker | `CELERY_CONCURRENCY=1` | 4GiB에서 PDF 피크 메모리 |

Ubuntu 26.04 LTS: Canonical 2026-04-23 발표, 보안 지원 ~ 2031-04.  
[릴리스 노트](https://documentation.ubuntu.com/release-notes/26.04/), [ubuntu-announce](https://lists.ubuntu.com/archives/ubuntu-announce/2026-April/000323.html)

비용은 배포 직전 [AWS Pricing Calculator](https://calculator.aws/)로 재확인한다. 서울 Linux t4g.medium On-Demand는 대략 월 $30 전후 + 디스크·전송 + OpenAI 사용료.

---

## 6. 레포 구조 (Turborepo 없음)

7일 MVP·JS 프론트·Python 백엔드라 **Turbo/pnpm workspace는 넣지 않는다.** Docker Compose가 오케스트레이션이다.

```text
Insurance_For_All/
  apps/web/          # Next.js 16, JavaScript
  apps/api/          # FastAPI + Alembic
  apps/worker/       # Celery (api 패키지 공유 가능)
  docker-compose.yml
  PRD.md
  FUNCTIONAL_SPEC.md
  FLOWCHARTS.md
  TECH_STACK.md
  README.md
```

---

## 7. 7일 구현에 맞춘 기술 범위

**한다**

- Next.js 화면(JS) + FastAPI + PG 캐시된 공공 API 통계
- 선택 PDF → Redis/Celery 마스킹 → JSONB
- OpenAI에는 **마스킹·집계 JSON만**
- 상담 옵트인 시에만 연락처

**하지 않는다 (P1/P2)**

- 관리자 페이지, JWT 백오피스, 대량 PDF 시드 UI
- Turborepo, TypeScript, 스캔 OCR, 설계사 마켓
- RDS / ElastiCache / ALB (이후 확장)

---

## 8. 출처 목록

- Next.js 16.3.1 docs, create-next-app, upgrading to 16  
- Node.js Release 스케줄 (22 Maintenance LTS, 24 Active LTS, 26 Current)  
- FastAPI PyPI / GitHub 0.141.1  
- Celery 5.6 What’s new  
- PostgreSQL Versioning Policy, 17.11 (2026-08-13)  
- Docker Hub nginx official (`stable` = 1.30.4)  
- Ubuntu 26.04 LTS release notes  
- 공공데이터포털: 실손 [15094797](https://www.data.go.kr/data/15094797/openapi.do), 자동차 [15124891](https://www.data.go.kr/data/15124891/openapi.do), 생명가입 [15124892](https://www.data.go.kr/data/15124892/openapi.do)  
- OpenAI Models 문서  
- Vercel: Working with Figma in v0  
