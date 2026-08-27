# Insurance For All — Agent Instructions

## 목표와 기준

- 2026-08-27 데모를 위한 P0 MVP를 우선한다. 요청 없이 P1/P2 범위를 구현하지 않는다.
- 이 서비스는 보험 의사결정 지원 도구이며 모집, 비교추천, 청약, 실시간 견적 서비스가 아니다.
- 작업 전 관련 문서를 읽고, 추측보다 저장소의 문서·코드·설정을 근거로 판단한다.

## 문서 우선순위

1. `PRD.md`: 제품 목표, 범위, 비목표
2. `FUNCTIONAL_SPEC.md`: F-ID, API, UAT
3. `FLOWCHARTS.md`: P0 사용자·시스템 흐름
4. `PUBLIC_API_PAGE_PLAN.md`: 화면, API 입력, 인사이트의 상세 SSOT
5. `DESIGN.md`: Stitch·UI 토큰·공통 크롬·카피 금지 (시각 UX)
6. `ERD.md`: PostgreSQL 물리 스키마 SSOT
7. `TECH_STACK.md`: 버전, 인프라, 예정 레포 구조
8. `ENVIRONMENT.md`: API 키, `.env`, GitHub, 배포 비밀정보 SSOT

충돌 시 도메인·화면·API는 `PUBLIC_API_PAGE_PLAN.md`, 시각·공통 UX는 `DESIGN.md`, DB는 `ERD.md`, 제품 범위는 최신 `PRD.md`와 `FUNCTIONAL_SPEC.md`를 따른다. 그래도 해소되지 않으면 구현 전에 질문한다.

## 변경 불가 원칙

- `apps/web`은 Next.js App Router + React + **JavaScript**만 사용한다. `.ts`, `.tsx`, `tsconfig.json`, `@types/*`를 추가하지 않는다.
- 통계 여정은 **메인 → `/stats` 허브 → 사용자 선택 탭**이며 스코프 순서를 강제하지 않는다. 스코프 화면의 「이전」은 허브로 돌아간다.
- 통계 차트는 **D3.js**(React Client Component + `ref`, data join)로 구현한다. 유형은 `PUBLIC_API_PAGE_PLAN.md` §3. Recharts·Chart.js로 대체하지 않는다.
- P0에서는 생년월일(`YYYY-MM-DD`), 성별, 지역만 받고 직업·유병력은 수집하지 않는다. 사용자 프로필과 보험나이를 PostgreSQL에 저장하지 않는다.
- 비영속이어도 생년월일·성별·지역을 개인정보 처리로 취급한다. 목적·항목·처리 방식·요청 종료 시 참조 해제·`sessionStorage`·프로필 없는 익명 쿠키 사용·거부 시 제한을 알리고, “개인정보를 수집하지 않는다”라고 과장하지 않는다. 세션 프로필과 익명 쿠키는 30분 비활성 기준이며 초기화 시 함께 삭제·만료한다.
- 개인화 통계는 `POST /api/v1/stats/{scope}` JSON 본문을 사용한다. 생년월일 원문은 URL에 넣지 않고 보험나이 계산 뒤 보관·로그·분석 이벤트에 남기지 않는다. 익명 세션 토큰은 32바이트 이상 난수로 발급하고 프로필 값을 인코딩하지 않으며 DB에는 pepper 기반 HMAC만 저장한다.
- 화면의 통계 조회는 PostgreSQL의 활성 캐시만 사용한다. 공공 OpenAPI 호출은 배치 동기화 경로에서만 수행한다.
- LLM에는 화면에 표시한 집계 통계와 마스킹된 JSON만 전달한다. 생년월일 원문, 원본 PDF, 화면에 없는 숫자를 전달하거나 생성하지 않는다.
- 가입 권유, 최적 상품, 순위 추천, 개인 보험료 확정으로 읽히는 문구를 만들지 않는다.
- 상담 **이메일**과 자유 입력 메모는 목적·항목·보유기간·거부권을 고지하고 명시적 동의를 받은 뒤에만 암호화한다. P0 UI는 이메일만. 동의문 버전과 만료시각을 저장하고 만료 시 삭제한다.
- 업로드 원본 파일명은 저장하지 않는다. 리포트 접근 토큰은 URL에 넣지 않고 `Authorization` 헤더로만 받으며, 원문 대신 서버 측 pepper를 키로 한 HMAC만 저장한다.
- 비밀값과 실제 개인정보를 코드, 테스트 픽스처, 로그, 문서, 커밋에 넣지 않는다. 공공데이터포털·OpenAI 키는 백엔드/worker 전용이며 `NEXT_PUBLIC_*`를 사용하지 않는다.

## 예정 구조

- `apps/web`: Next.js 16, React 19, JavaScript, Tailwind CSS 4, **D3.js**
- `apps/api`: FastAPI, Pydantic v2, SQLAlchemy 2, Alembic, asyncpg
- `apps/worker`: Celery 기반 공공 API 동기화·PDF 마스킹
- PostgreSQL 17은 공공 캐시와 선택 동의 산출물만, Redis 7.4는 브로커·단기 TTL 용도로 사용한다.
- 운영 호스트 기본은 EC2 **t4g.small**(arm64, 2GiB) + Ubuntu Server **24.04** LTS다. Dockerfile에 `linux/amd64`를 굽지 않는다. SQLite·RDS·프로필 PG 저장을 넣지 않는다.

현재 실제 설정 파일이 생기기 전에는 `TECH_STACK.md`가 목표 구성을 정의한다. 스캐폴딩 후에는 설치 버전과 실행 명령을 실제 lockfile, `package.json`, Python 설정, Compose 파일로 검증한다.

## 작업 방식

- 새로 만들거나 의미 있게 고치는 함수·메서드·클래스·React 컴포넌트·Celery task에는 무엇을 하는지·왜 있는지를 한국어 주석 1~3줄로 적는다. 이름만으로 자명한 one-liner, 테스트 헬퍼, Alembic revision 콜백, 단순 getter는 생략할 수 있다. 주석에 비밀값·실제 개인정보·생년월일 예시·API 키를 넣지 말고, 코드 복붙이나 “TODO: implement” 수준으로 쓰지 않는다. 기존 파일에 주석만 다는 일괄 리팩터링은 하지 않으며, 규칙은 이후 구현부터 적용한다. Python은 선언 바로 아래 docstring, JavaScript는 선언 바로 위 `/** ... */`(JSDoc)이며 `.ts`/`.tsx`는 만들지 않는다.

1. 요청을 해당 F-ID와 P0 수용 기준에 연결한다.
2. 관련 SSOT와 기존 구현을 읽고 가장 작은 완결 변경을 설계한다.
3. 기존 패턴을 재사용하고, 테스트만 통과시키는 특수 처리나 무관한 리팩터링을 피한다.
4. 경계에서 입력을 검증하고 실패·stale·LLM 폴백 경로를 명시적으로 처리한다.
5. 변경 위험에 비례해 테스트·린트·빌드를 실행한다. 테스트를 삭제·약화하거나 제품 결함에 맞춰 기대값을 바꾸지 않는다.
6. 완료 보고에는 변경 내용, 검증 결과, 남은 위험만 간결한 한국어로 적는다.

### Git·Checkpoint (사용자 주도)

- Agent는 **git commit·push를 실행하지 않는다** (사용자가 명시적으로 요청한 경우만).
- Front/Backend **기능 단위** 완료마다 Checkpoint에서 **STOP** → 로컬 검증 명령·변경 목록·추천 커밋 메시지 제시 → **사용자가** 확인 후 기능 단위로 commit.
- `.env`·`secrets/`·키 파일·실제 개인정보는 commit·PR·채팅에 넣지 않는다. `git add .` 전 `git check-ignore -v .env` 확인을 상기한다.

## 완료 기준

- 관련 UAT와 변경 불가 원칙을 충족한다.
- 새 동작의 정상·오류·개인정보 경계가 테스트된다.
- 실제로 실행한 검증만 통과했다고 보고한다.
- API, 스키마, 사용자 흐름 또는 범위가 바뀌면 관련 SSOT 문서도 함께 갱신한다.
