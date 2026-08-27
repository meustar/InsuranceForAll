# 기술스택 및 인프라 (버전 고정)

**프로젝트:** 모두의 보험 (Insurance For All)  
**작성 기준일:** 2026-08-20 · **MVP 1.4 갱신:** 2026-08-24 (D3.js 차트 유형 · Tab 여정)
**관련 문서:** [PRD.md](./PRD.md), [FUNCTIONAL_SPEC.md](./FUNCTIONAL_SPEC.md), [FLOWCHARTS.md](./FLOWCHARTS.md), [PUBLIC_API_PAGE_PLAN.md](./PUBLIC_API_PAGE_PLAN.md), [DESIGN.md](./DESIGN.md), [ENVIRONMENT.md](./ENVIRONMENT.md)

원칙: **서로 공식 문서에서 호환이 확인된 안정(LTS/stable) 조합만 사용**한다.  
패치 버전(`x.y.z`의 `z`)은 배포 직전 보안 패치로 올려도 된다. **메이저 버전은 이 표에서 바꾸지 않는다.**

---

## 0. 왜 예전 자료와 버전이 다른가

여러 AI·문서가 서로 다른 시점에 스택을 적어 불일치가 생겼다. 아래는 **채택하지 않는 옛 값**이다.

| 출처 | 옛 값 | 이번 확정 | 이유 |
|------|--------|-----------|------|
| 기능정의서 PDF | Next.js 14.2, React 18.3, TS 없음 명시 안 함 | Next.js **16.3.x** + React **19** + **JavaScript** | Next 공식 문서 현재 버전 16.3.1. Node 18/20 EOL 이후 런타임은 24 LTS |
| 기능정의서 PDF | Python 3.11, FastAPI 0.111, Celery 5.4, Redis 7.2, PG 15 | Python **3.12**, FastAPI **0.141.x**, Celery **5.6.x**, Redis **7.4**, PG **17.11** | 각 공식 지원표와 맞춤 |
| 기능정의서 PDF | Ubuntu 24.04, EC2 t3a.medium | Ubuntu **24.04 LTS**, EC2 **t4g.small** | 2025-07-15 이후 Free account plan 기준 eligible 상한에 가깝다. t4g.medium은 Free tier eligible이 아님 |
| 이전 Cursor 문서 | TypeScript 5.x, Turborepo, 관리자 P0 | **JavaScript**, Turborepo **생략**, 관리자 **P1** | 숙련 언어·7일 MVP 범위 |

---

## 1. 확정 스택 한 장

```text
[Host] AWS EC2 t4g.small (2 vCPU, 2 GiB, arm64) + EBS gp3 (루트 1장, 총량은 계정 한도 안)
[OS]   Ubuntu Server 24.04 LTS (Noble)
[Runtime] Docker Engine 28.x 또는 29.x (설치 시점 CE stable) + Compose v2

[Tier-1 Presentation]
  nginx 1.30.4 (Docker tag: nginx:1.30.4-alpine 또는 nginx:stable-alpine)
  Next.js 16.3.x + React 19.x + JavaScript (TypeScript 미사용)
  Tailwind CSS 4.x
  **D3.js** (통계 차트 · Client Component)
  Node.js 24.x Active LTS
  패키지 매니저: npm (Node에 포함, 초보자·v0 산출물과 맞춤)

[Tier-2 Application]
  FastAPI 0.141.x + Uvicorn (fastapi[standard]) on Python 3.12
  Pydantic v2 + pydantic-settings (환경변수 검증)
  SQLAlchemy 2.0.x + Alembic + asyncpg
  Celery 5.6.x (concurrency=1) + redis-py ≥ 4.5.2
  Redis 7.4.x (redis:7.4-alpine)  — Celery 브로커(PDF job 큐). P0에서 프로필 캐시 아님 ([ERD.md](./ERD.md) §0.3)
  OpenAI Responses API — gpt-5.6-luna (환경변수로 교체 가능)

[Tier-3 Data]
  PostgreSQL 17.11 (postgres:17.11-alpine)

[프로토타입 UI]
  Google Stitch — [모두의 보험 통계 허브 (project)](https://stitch.withgoogle.com/projects/17570932267095502369)
  테마: Institutional Minimal (Light) · 토큰 정본 DESIGN.md §2–§3 · CSS `design/tokens.css`
  → (선택) export → apps/web JS 이식
  시각·공통 UX 정본: DESIGN.md · 차트 유형 정본: PUBLIC_API_PAGE_PLAN.md §3

[Analytics]
  GA4 gtag — P0 선택(F-10a), 현재 미구현
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
| Ubuntu 24.04 LTS | Docker CE, amd64·arm64 | [Ubuntu 24.04 릴리스 노트](https://documentation.ubuntu.com/24.04/). AMI는 SSM으로 조회. 26.04는 콘솔 Free tier eligible 확인 후에만 선택 |

**설치하지 말 것**

- TypeScript, `@types/*` (프론트)
- Recharts, Chart.js (차트는 **D3.js**만)
- Node 18 / 20 / 26 (20 EOL, 26은 아직 LTS 아님)
- PostgreSQL 18을 MVP에 올리는 것 (가능하나 검증 시간 없음)
- Redis 8 공식 이미지 (라이선스가 RSALv2/SSPL 등으로 바뀜. 브로커 용도는 7.4로 충분)
- SQLAlchemy 2.1 베타

---

## 3. 프론트: JavaScript + Google Stitch + DESIGN.md

### 3.1 언어

개발자가 TypeScript에 익숙하지 않으므로 **프론트 전 파일은 JavaScript**다.

```bash
npx create-next-app@16.3.1 apps/web --js --tailwind --eslint --app --no-src-dir --use-npm
```

공식 플래그: `--js` 또는 `--javascript`. ([create-next-app](https://nextjs.org/docs/app/api-reference/cli/create-next-app))

v0·Figma Make 등 **다른 도구**가 `.tsx`를 주면 **같은 폴더에서 `.jsx`로 바꾸고 `tsconfig.json`을 넣지 않는다.** 프롬프트에 다음을 고정한다.

> Use Next.js App Router, JavaScript only (no TypeScript), Tailwind CSS. Do not generate .ts or .tsx files.

### 3.2 프로토타입 파이프라인 (1순위: Stitch)

1. **[Google Stitch](https://stitch.withgoogle.com/projects/17570932267095502369)** + [DESIGN.md](./DESIGN.md) + `design/tokens.css`로 랜딩 → 입력 → **통계 허브** → 스코프 탭(+ 하단 PDF·상담 CTA) → `/documents` → `/consultations` IA·톤을 잠근다.
2. Stitch export 또는 수동 이식으로 `apps/web`에 붙인다. 공통 Header/Footer·버튼은 **DESIGN.md §5–§6** 정본(Stitch 화면별 불일치는 DESIGN 우선).
3. 데이터는 FastAPI만 호출(`/api`는 nginx가 백엔드로 프록시). 차트는 **D3**로 구현·이식한다.
4. **선택·보조:** Figma Make / v0 — 크레딧·일정상 Stitch 보완용. Recharts 등이 들어오면 **제거하고 D3로 교체**한다.

### 3.3 패키지 예시 (`apps/web/package.json`)

```json
{
  "private": true,
  "engines": { "node": ">=24 <25" },
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "next": "16.3.1",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "d3": "^7.9.0"
  },
  "devDependencies": {
    "eslint": "^9.0.0",
    "eslint-config-next": "16.3.1",
    "tailwindcss": "^4.0.0"
  }
}
```

`engines` 범위는 로컬·운영을 Node 24 LTS로 맞추고 다른 메이저를 실수로 쓰지 않기 위함이다.
`d3` 버전은 **설치 시점 최신 안정**을 쓰고 lockfile로 고정한다. 번들 최적화를 위해 `d3-selection` / `d3-scale` / `d3-axis` / `d3-shape` 모듈 단위 import를 권장한다.

### 3.4 D3.js + React (P0 차트 원칙)

| 원칙 | 내용 |
|------|------|
| 소유권 | **React**가 컨테이너·캡션·로딩·에러·표/KPI DOM 소유. **D3**는 `ref`가 가리키는 SVG(또는 캔버스) 내부만 갱신 |
| 갱신 | `useEffect`에서 scale·축·막대 data **join**(enter/update/exit). 매 렌더 `innerHTML` 전체 재작성 금지 |
| 데이터 | 소스 = `POST /api/v1/stats/{scope}` 화면용 집계 JSON만. 브라우저→공공 OpenAPI 직접 호출 금지 |
| 정규화 | 질문별 `toBarSeries(stats)` · 덤벨·사분위 요약 등. 단위가 다른 시리즈를 한 scale에 넣지 않음 |
| SSR | 차트는 **`"use client"`** Client Component. 서버에서 `window`/`document` 접근 금지 |
| P0 범위 | 가로 막대·덤벨·박스 요약 중심. 선·산점도는 P1. 브러시·복잡한 대시보드·과한 애니메이션·원형 남용·이중축은 P1+에서 원형/이중축은 채택하지 않음 |
| a11y | 핵심 KPI는 숫자/표로도 제공. 모든 차트에 출처·기준일·“견적 아님” |
| 금지 | Recharts, Chart.js, TypeScript(`.tsx`)로 D3 래핑 |

상세 차트 유형: [PUBLIC_API_PAGE_PLAN.md](./PUBLIC_API_PAGE_PLAN.md) §3.

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
| PostgreSQL | **17.11** (Docker 이미지) | [PG 버전 정책](https://www.postgresql.org/support/versioning/), [17.11 노트](https://www.postgresql.org/docs/release/17.11/). 호스트 패키지 PG와 혼동하지 않는다. MVP DB는 Compose의 `postgres:17.11-alpine`만 사용한다 |
| PyMuPDF | 설치 시점 최신 안정 | Native PDF 텍스트/좌표. 스캔 OCR은 P2 |
| OpenAI | `httpx`로 공식 Responses HTTP API + `gpt-5.6-luna` | [공식 모델 문서](https://developers.openai.com/api/docs/models/gpt-5.6-luna). `OPENAI_MODEL`로 교체 가능 |
| httpx | 0.28+ | 공공 OpenAPI REST |
| pydantic-settings | 설치 시점 최신 안정 | 환경변수·secret file 로딩. 키 필드는 `SecretStr` |

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

사용자 전제: **AWS EC2 + Ubuntu 24.04 LTS + Docker 3-Tier**. 기본 계정은 **2025-07-15 이후 Free account plan(크레딧)**. 2025-07-15 전 구계정은 `t2.micro`/`t3.micro`(보통 1 GiB)만 eligible이며 6컨테이너는 비권고다.

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
| 인스턴스 | **t4g.small** (2 vCPU / 2 GiB, Graviton2) | [T4g 스펙](https://aws.amazon.com/ec2/instance-types/t4/). [EC2 Free Tier eligible](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-free-tier-usage.html)에 `t4g.small`은 있고 `t4g.medium`은 없다. 2 GiB에서 6컨테이너 적합성은 **미실측** |
| 디스크 | gp3, 루트 볼륨 1장 | [EBS 가격·한도](https://aws.amazon.com/ebs/pricing/). 총량이 계정 한도를 넘거나 스냅샷·추가 볼륨이 있으면 크레딧/On-Demand가 붙을 수 있다. 한도 안이라고 과금이 없다고 단정하지 않는다 |
| 리전 | ap-northeast-2 | 지연, 공공 API |
| 공개 포트 | 443 (80은 리다이렉트), SSH는 본인 IP | 3000/8000/5432/6379 비공개 |
| Worker | 상시 1 · `CELERY_CONCURRENCY=1` | PDF 202+job 소비자가 필요함. 끄면 큐만 쌓인다 |

Ubuntu Server 24.04 LTS AMI는 배포 시 조회하고 ID를 저장소에 고정하지 않는다. 26.04는 AWS에 존재하나 이 레포의 기본값이 아니다. 콘솔에서 Free tier eligible이 확인된 뒤에만 바꾼다.

```bash
aws ssm get-parameters --region ap-northeast-2 --names /aws/service/canonical/ubuntu/server/24.04/stable/current/arm64/hvm/ebs-gp3/ami-id
```

로컬 Windows/AMD64와 EC2 arm64는 공식 멀티아키 태그를 쓴다. Dockerfile에 `linux/amd64`를 굽지 않는다.

인스턴스 적합성은 Compose 기동 → 캐시 통계 조회 → PDF 마스킹 중 `docker stats --no-stream`과 호스트 메모리·CPU credit으로 판단한다. 개발 PC 수치는 2 GiB EC2 실측이 아니다.

**크레딧·한도 (과금이 없다고 쓰지 말 것):**

- Free account plan은 크레딧 소진 또는 플랜 종료 중 먼저 오는 시점에 끝난다 ([Billing Free Tier](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/free-tier.html)).
- T 인스턴스는 Unlimited가 기본이다. 기준 CPU를 넘긴 surplus credit은 [T4g Linux $0.04/vCPU-hour](https://aws.amazon.com/ec2/pricing/on-demand/)가 붙을 수 있다.
- 공인 IPv4는 시간 과금이다 ([VPC 가격](https://aws.amazon.com/vpc/pricing/)). 레거시 12개월 750시간 한도가 신계정 크레딧과 어떻게 겹치는지는 계정 콘솔이 SSOT다. NAT·유휴 EIP는 쓰지 않는다. NAT를 켜면 게이트웨이·시간 과금이 붙는다.
- EBS는 계정 Free Tier 총량(흔히 30GB 합산)을 넘기거나 스냅샷·추가 볼륨이 있으면 크레딧/On-Demand가 붙을 수 있다. 한도 안이라고 과금이 없다고 단정하지 않는다.
- 인터넷 송신은 [EC2 On-Demand](https://aws.amazon.com/ec2/pricing/on-demand/) 기준 월 100GB 집계 한도가 있고 초과분은 과금된다.
- Let's Encrypt 자체 비용은 없어도 80/443 상시 기동은 인스턴스 시간과 IPv4 시간을 쓴다. 데모 외에는 인스턴스를 중지할 수 있으나 EBS는 남는다.

### 5.1 Docker Compose · nginx · HTTPS (EC2 운영)

로컬 개발은 `docker-compose.yml`, 운영 형태 스모크·EC2는 `docker-compose.prod.yml`. 비밀값은 [ENVIRONMENT.md](./ENVIRONMENT.md) · `.env.example` 변수명만; 이미지·Dockerfile에 키를 넣지 않는다.

**Compose 허용 연결 그래프:**

| Network | 허용 연결 | 비고 |
|---------|-----------|------|
| `net-edge` | nginx ↔ web | 프론트 전달만 |
| `net-app` | nginx ↔ api | `/api` 전달만 |
| `net-data` | api/worker ↔ postgres/redis | 데이터·브로커. worker의 공공 API outbound를 막는 `internal: true`는 사용하지 않음 |

web은 worker·redis·postgres와, nginx는 worker·redis·postgres와 네트워크를 공유하지 않는다. Docker 네트워크는 도달 범위를 줄이는 수단이며 애플리케이션 인증·인가를 대체하지 않는다. postgres·redis·api·web 내부 포트는 운영 Compose에서 호스트에 publish하지 않는다.

**2GiB 메모리 가드 (`docker-compose.prod.yml`):** postgres 256m · redis 64m · nginx 64m · api 256m · worker 320m · web 384m. PG는 `shared_buffers=64MB`, `max_connections=50`. web은 `NODE_OPTIONS=--max-old-space-size=192`. 합계는 호스트 2GiB보다 작고, 커널·Docker 오버헤드와 PDF 피크는 포함하지 않는다. 적합성은 EC2에서 미실측이다.

**nginx (Tier-1):** `infra/nginx/nginx.conf` · 이미지 `nginx:1.30.4-alpine`

- 로컬 스모크(B-2): `:80`만. `/` → `http://web:3000`, `/api` → `http://api:8000` (`/api` 접두사 유지)
- EC2 HTTPS(B-5): `:80` → `:443` 리다이렉트, Let's Encrypt **certbot**. 인증서는 볼륨 mount. 도메인·IP는 저장소에 하드코딩하지 않는다.

브라우저 계약은 항상 **same-origin `/api` + `credentials: "include"`**다. 로컬은 `web:3000`의 Next rewrite, prod는 nginx `:80/443`만 브라우저 진입점이다. `localhost:8000` 직접 호출은 호스트 curl·pytest 전용이며 브라우저에서 사용하면 익명 쿠키 origin이 달라진다. 별도 CORS는 두지 않는다.

**운영 env (이번 데모는 저장소 밖 환경 파일):**

- `API_INTERNAL_URL=http://api:8000` — 로컬 Next rewrite용. prod 브라우저 요청은 nginx가 `/api`를 api로 직접 전달하므로 web→api 네트워크를 열지 않음
- `SESSION_COOKIE_SECURE=false` — B-2 HTTP 스모크
- `SESSION_COOKIE_SECURE=true` — B-5 HTTPS 데모
- `CELERY_CONCURRENCY=1`

### 5.1.1 기동 후 migrate → 공공 sync 1회 (B-3)

순서를 바꾸지 않는다. 스키마가 있어야 캐시 테이블에 쓰고, 화면 통계는 활성 캐시만 읽는다. 포털 호출은 이 배치에서만 한다.

로컬 개발은 Git에서 제외된 루트 `.env`를 쓸 수 있다. 이번 EC2 데모는 **저장소 밖 환경 파일 + 소유자 읽기 전용**으로 확정하며 모든 운영 명령에 `--env-file <외부-환경파일>`을 붙인다.

```powershell
docker compose --env-file <외부-환경파일> -f docker-compose.prod.yml up -d --build
docker compose --env-file <외부-환경파일> -f docker-compose.prod.yml exec -T api alembic upgrade head
docker compose --env-file <외부-환경파일> -f docker-compose.prod.yml exec -T worker python -m app.jobs.sync_public_api
```

- 공공 sync의 유일한 실행 주체는 worker 컨테이너다. api 컨테이너에서 배치를 실행하지 않는다.
- 로컬 포털 비호출 스모크는 `docker compose -f docker-compose.prod.yml exec -T worker python -m app.jobs.sync_public_api --seed`로 실행한다. 합성 캐시이므로 데모·운영 공공 sync 대신 쓰지 않는다.
- 통계 스모크: `POST http://localhost/api/v1/stats/health` (또는 `auto` / `life`). JSON 본문 키는 [FUNCTIONAL_SPEC.md](./FUNCTIONAL_SPEC.md) §4 (`birthDate`, `sex`, `areaNm`). **쿼리 문자열에 생년월일을 넣지 않는다.** 본문 값은 로컬 임시 파일에만 두고 저장소·채팅에 붙이지 않는다.

```powershell
curl.exe -sS -o NUL -w "%{http_code}" http://localhost/api/v1/stats/health -H "Content-Type: application/json" --data-binary "@$env:USERPROFILE\ifa-stats-smoke.json"
```

캐시가 있으면 200, 없으면 503. 응답에 생년월일 원문이 있으면 실패다.

UAT #1/#11: `docker compose -f docker-compose.prod.yml exec -T api pytest tests/test_schema.py -q` · `git check-ignore -v .env`

**EC2 초기 설정 (요지):** Ubuntu 24.04 LTS · `apt update && apt upgrade` · Docker Engine + Compose v2 · 호스트 **swap 1GiB**(2 GiB OOM 완화, 속도는 느림) · ufw 22/80/443 · repo clone · 저장소 밖 환경 파일(`chmod 600`) · 위 **§5.1.1** (`up` → migrate → worker sync 1회). `docker-compose.prod.yml`의 `mem_limit`은 컨테이너 RSS 상한이며 호스트 swap을 대신하지 않는다.

상세 secret·노출 대응은 ENVIRONMENT §5·§6.

## 6. API 키·비밀정보

- 로컬 개발: 루트 `.env.example`을 `.env`로 복사하고 실제 값은 Git에서 제외한다.
- OpenAI 키는 api만, 공공데이터포털 3개 키는 worker만 읽는다. `apps/web` 또는 `NEXT_PUBLIC_*`에 넣지 않는다.
- Compose 도입 시 secret은 서비스별 최소 주입한다. 예: `OPENAI_*`·상담/세션/리포트 비밀 → `api`, 공공 OpenAPI 3키·배치용 DB/Redis → `worker`, `web`에는 외부 API 키 없음.
- Docker 이미지에는 `.env`, build arg, `ENV`로 키를 포함하지 않는다. `.dockerignore`로 build context에서도 제외한다.
- 루트 `.cursorignore`로 `.env*`와 런타임 개인정보 폴더를 AI 컨텍스트에서 제외한다. 이는 보조 통제이며 터미널 접근을 막는 보안 경계는 아니다.
- GitHub Actions Repository/Environment Secret은 **CI 워크플로 전용**이다. 이번 EC2 데모 런타임은 저장소 밖 환경 파일만 쓴다. Secrets Manager·NAT·IAM 조회 코드를 앱에 넣지 않는다.
- 공공 API 호출 로그는 `serviceKey`와 전체 URL query를 정제한다.
- 상세 변수명·로컬 설정·노출 대응은 [ENVIRONMENT.md](./ENVIRONMENT.md)가 SSOT다.

---

## 7. 레포 구조 (Turborepo 없음)

7일 MVP·JS 프론트·Python 백엔드라 **Turbo/pnpm workspace는 넣지 않는다.** Docker Compose가 오케스트레이션이다.

```text
Insurance_For_All/
  apps/web/              # Next.js 16, JavaScript (A-7+)
  apps/api/              # FastAPI + Alembic ERD v1.5 + F-11 `python -m app.jobs.sync_public_api`
  apps/worker/           # Celery (A-0 스켈레톤; Dockerfile 예정)
  infra/nginx/           # nginx.conf (B-2 HTTP, TLS는 B-5)
  design/tokens.css      # Tailwind 4 @theme — DESIGN.md §2–§3 미러
  DESIGN.md
  docker-compose.yml     # 로컬 postgres/redis/api/worker (web/nginx는 A-7+)
  docker-compose.prod.yml  # nginx:80 + web/api/worker/db (TLS는 B-5)
  .env.example
  .gitignore
  .dockerignore
  .cursorignore
  ENVIRONMENT.md
  PRD.md
  FUNCTIONAL_SPEC.md
  FLOWCHARTS.md
  PUBLIC_API_PAGE_PLAN.md
  TECH_STACK.md
  README.md
```

---

## 8. 7일 구현에 맞춘 기술 범위

**한다**

- Next.js 화면(JS) + FastAPI + PG 캐시된 공공 API 통계
- **`/stats` 허브 + 스코프 탭** (순서 강제 없음)
- **D3.js** 차트 (가로 막대·덤벨 등, React Client + ref). 유형은 PAGE_PLAN §3
- 선택 PDF → Redis/Celery 마스킹 → JSONB
- OpenAI에는 **마스킹·집계 JSON만**
- 상담 옵트인 시에만 연락처

**하지 않는다 (P1/P2)**

- 관리자 페이지, JWT 백오피스, 대량 PDF 시드 UI
- Turborepo, TypeScript, 스캔 OCR, 설계사 마켓
- Recharts / Chart.js
- RDS / ElastiCache / ALB (이후 확장)

---

## 9. 출처 목록

- Next.js 16.3.1 docs, create-next-app, upgrading to 16  
- Node.js Release 스케줄 (22 Maintenance LTS, 24 Active LTS, 26 Current)  
- FastAPI PyPI / GitHub 0.141.1  
- Celery 5.6 What’s new  
- PostgreSQL Versioning Policy, 17.11 (2026-08-13)  
- Docker Hub nginx official (`stable` = 1.30.4)  
- Ubuntu 24.04 LTS release notes · Canonical AWS AMI SSM  
- 공공데이터포털: 실손 [15094797](https://www.data.go.kr/data/15094797/openapi.do), 자동차 [15124891](https://www.data.go.kr/data/15124891/openapi.do), 생명가입 [15124892](https://www.data.go.kr/data/15124892/openapi.do)  
- [OpenAI Models](https://developers.openai.com/api/docs/models) · [GPT-5.6 Luna](https://developers.openai.com/api/docs/models/gpt-5.6-luna)
- OpenAI API Key Safety · Next.js Environment Variables · Docker Compose Secrets
- GitHub Actions Secrets (CI). AWS Secrets Manager는 데모 필수 아님 (ENVIRONMENT §5)
- Vercel: Working with Figma in v0  
