# 환경변수·API 키 관리

**적용 범위:** 로컬 개발, Git/GitHub, Docker Compose, EC2 배포  
**원칙:** 실제 키는 코드·문서·Notion·이슈·PR·채팅·컨테이너 이미지에 기록하지 않는다.

## 1. 저장소에 포함되는 파일

- `.env.example`: 변수 이름만 기록해 Git에 커밋한다. 기본값과 실제 값은 넣지 않는다.
- `.gitignore`: 모든 `.env*`와 `secrets/`를 제외하고 `.env.example`만 허용한다.
- `.dockerignore`: `.env*`와 비밀 파일을 Docker 빌드 컨텍스트에서 제외한다.
- `.cursorignore`: Cursor AI 컨텍스트에서 `.env*`, 키 파일, 런타임 개인정보 폴더를 제외한다. `.gitignore`와 동일 패턴을 루트에 두고 Git에 커밋한다.
- `.env`: 개발자 PC에만 두며 Git에 커밋하지 않는다.

로컬 PowerShell에서:

```powershell
Copy-Item .env.example .env
```

그 뒤 `.env`의 빈 값에 본인의 키를 직접 입력한다. 실제 값을 문서나 AI 채팅에 붙여 넣지 않는다.

### Cursor 컨텍스트 차단

루트 `.cursorignore`는 `.gitignore`와 같은 비밀·런타임 경로 패턴을 사용한다. 저장소에 포함해 팀이 동일하게 적용한다. (에디터가 파일 생성을 막는 환경이면 `.gitignore`의 Secrets 섹션을 그대로 복사한다.)

Cursor는 `.gitignore`와 기본 목록의 `.env*`도 자동 제외하지만, 프로젝트 의도를 명시하기 위해 `.cursorignore`를 추가한다. 다만 공식 문서도 이를 완전한 보안 경계로 보지 않는다. 터미널·MCP와 같은 도구는 같은 사용자 권한으로 파일을 읽을 수 있으므로 실제 키를 에이전트 프롬프트에 붙이지 않고, Cursor **Privacy Mode**를 켜며, 클라우드 에이전트에는 일반 환경변수 대신 **Runtime Secrets**를 사용한다.

## 2. 환경변수 카탈로그 (`.env.example` SSOT)

| 변수 | 비밀 | 주입 서비스 | 설명 |
|------|------|-------------|------|
| `APP_ENV`, `LOG_LEVEL` | 아니오 | api, worker, web | 실행 환경 |
| `DOCUMENT_RESULT_RETENTION_HOURS` 등 | 아니오 | api, worker | 만료 정책(MVP 기본값) |
| `ENCRYPTION_KEY_VERSION`, `CONSULTATION_CONSENT_NOTICE_VERSION` | 아니오 | api | 동의문·키 버전 메타 |
| `API_INTERNAL_URL` | 아니오 | web | Next.js → FastAPI 내부 URL |
| `OPENAI_API_KEY`, `OPENAI_MODEL` | **예** / 아니오 | api | LLM (브라우저·`NEXT_PUBLIC_*` 금지) |
| `CONTACT_ENCRYPTION_KEY`, `SESSION_TOKEN_PEPPER`, `REPORT_TOKEN_PEPPER` | **예** | api | 암호화·HMAC pepper |
| `CONSULTATION_NOTIFY_EMAIL` | 아니오 | api | 설계사 알림 수신 |
| `SMTP_*` | **예**(password) | api | 상담 접수 알림 메일 |
| `SESSION_COOKIE_SECURE` | 아니오 | api | 로컬 `false`, HTTPS 운영 `true` |
| `DATA_GO_KR_*` (3개) | **예** | worker | 공공 OpenAPI (Decoding key) |
| `CELERY_CONCURRENCY` | 아니오 | worker | MVP `1` |
| `POSTGRES_*`, `DATABASE_URL`, `REDIS_URL` | **예**(password) | postgres 또는 api·worker | DB·브로커 |

로컬은 `.env.example` → `.env` 복사 후 빈 값만 채운다. 이 파일은 Compose 변수 치환 입력일 뿐 컨테이너 전체에 주입하지 않고, 각 서비스의 `environment`가 필요한 이름만 선택한다. **`.env`는 Git에 올리지 않는다.**

## 3. API 키·비밀 (요약)

전체 변수명·서비스별 주입 범위는 **§2 카탈로그**와 루트 `.env.example`을 따른다. 아래는 대표 항목만 요약한다.

```dotenv
DATA_GO_KR_MEDICAL_API_KEY=
DATA_GO_KR_AUTO_API_KEY=
DATA_GO_KR_LIFE_API_KEY=
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.6-luna
```

- `DATA_GO_KR_MEDICAL_API_KEY`: 금융위원회 실손보험정보 `15094797`
- `DATA_GO_KR_AUTO_API_KEY`: 금융위원회 자동차보험가입정보 `15124891`
- `DATA_GO_KR_LIFE_API_KEY`: 금융위원회 생명보험가입정보 `15124892`
- `OPENAI_API_KEY`: 개인 키를 공유하지 말고 이 앱 전용 OpenAI Project API 키를 발급한다. 개발·운영 프로젝트를 분리하고 사용량 알림·한도를 설정한다.
- `OPENAI_MODEL`: 비밀값은 아니다. P0 기본값은 공식 저비용 모델 ID [`gpt-5.6-luna`](https://developers.openai.com/api/docs/models/gpt-5.6-luna)이며, 환경별 변경은 코드 수정 없이 이 변수로 한다.
- `DOCUMENT_RESULT_RETENTION_HOURS=24`, `AI_REPORT_RETENTION_DAYS=7`, `CONSULTATION_RETENTION_DAYS=30`: MVP 최소보관 기본값이다. 공개 전 개인정보 처리방침·상담 동의문과 함께 확정하고, 값을 늘릴 때는 목적과 근거를 재검토한다.

공공데이터포털에서 세 활용신청에 같은 일반 인증키가 표시되더라도 코드에서는 세 변수로 분리한다. 호출 대상과 장애·교체 범위를 명확히 하기 위함이다.

### 공공데이터포털 키 인코딩

`httpx`의 `params={"serviceKey": key}`처럼 HTTP 클라이언트의 쿼리 파라미터 기능을 사용할 때는 포털의 **Decoding 키**를 저장하고 클라이언트가 한 번만 URL 인코딩하게 한다. Encoding 키를 다시 `params`에 넣으면 `%`가 재인코딩될 수 있다.

각 API 활용가이드의 요구와 실제 샌드박스 호출로 확인하고, 문자열로 URL을 직접 조합하지 않는다. 외부 호출 로그에는 `serviceKey`와 전체 쿼리 문자열을 남기지 않는다.

### 애플리케이션 비밀

- `CONTACT_ENCRYPTION_KEY`, `SESSION_TOKEN_PEPPER`, `REPORT_TOKEN_PEPPER`는 서로 다른 32바이트 이상 난수로 생성하고 API 키와 재사용하지 않는다.
- **상담 알림(비밀 아님·필수):** `CONSULTATION_NOTIFY_EMAIL` — 보험 설계사(운영) 수신 주소. `POST /consultations` 성공 시 알림 발송.
- **SMTP(백엔드 전용):** `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` — 트랜잭션 메일 발송. web/worker에 노출하지 않는다.
- 상담 연락처·메모는 **AES-256-GCM(AEAD)** 으로 암호화한다. 레코드마다 새 nonce를 쓰고 `nonce||ciphertext||tag`를 `contact_encrypted` / `purpose_note_encrypted` BYTEA에 넣으며, `encryption_key_version`만 별도 컬럼으로 둔다. 암호화 키는 DB와 분리한다.
- 익명 세션 토큰은 32바이트 이상 난수로 쿠키에만 발급하고 DB에는 `HMAC-SHA-256(SESSION_TOKEN_PEPPER, token)`만 저장한다. 쿠키는 `HttpOnly`, `SameSite=Lax`, 30분 비활성 수명이며 성공한 `/api/v1` 응답에서 갱신하고 프로필 초기화 시 만료한다. 로컬 HTTP는 `Secure=false`, HTTPS 데모는 `Secure=true`로 명시하며 URL·로그에 넣지 않는다.
- 리포트 토큰은 32바이트 이상 난수로 발급해 원문을 한 번만 반환한다. URL·브라우저 저장소에 넣지 않고 `Authorization` 헤더로만 전달하며, 서버에는 `HMAC-SHA-256(REPORT_TOKEN_PEPPER, token)`만 저장해 상수 시간 비교한다.
- 키 생성은 OS CSPRNG(`openssl rand -base64 32` 등)만 사용한다. 임의 문자열이나 사람이 만든 비밀번호를 쓰지 않는다.

## 4. 애플리케이션 경계

- 네 개 API 키는 FastAPI 또는 Celery worker에서만 읽는다. **web에는 주입하지 않는다.**
- 서비스별 최소 주입 경계:
  - `api`: `OPENAI_API_KEY`, `CONTACT_ENCRYPTION_KEY`, `SESSION_TOKEN_PEPPER`, `REPORT_TOKEN_PEPPER`, DB/Redis 자격증명
  - `worker`: `DATA_GO_KR_*` 3키, 배치에 필요한 DB/Redis 자격증명. OpenAI 키는 worker가 요약을 호출하지 않는 한 넣지 않는다
  - `web`: 외부 API 키·암호화 키·pepper 없음. 필요 시 `API_INTERNAL_URL` 등 서버 전용 비민감 값만
- FastAPI 설정은 공통 비민감 값을 제외하고 `ApiSettings` / `WorkerSettings`로 분리한다. 필수 비밀 필드에는 기본값을 두지 않아 누락 시 기동을 실패시킨다.
- 브라우저와 `apps/web` 클라이언트 컴포넌트는 키를 읽거나 공공데이터포털·OpenAI를 직접 호출하지 않는다.
- API 키에 `NEXT_PUBLIC_` 접두사를 붙이지 않는다. Next.js는 해당 값을 브라우저 JavaScript 번들에 포함한다.
- `next.config.js`의 `env` 설정에도 비밀값을 넣지 않는다.
- 키, 요청 인증 헤더, 공공 API 전체 URL을 로그·예외·GA4에 기록하지 않는다.
- 설정 시작 시 필수 키의 존재 여부만 검증하고 값 자체는 출력하지 않는다. Python 설정 모델에는 `SecretStr`을 사용한다. `PYDANTIC_SETTINGS_DEBUG`는 운영에서 켜지 않는다.

개인화 통계 요청의 생년월일도 URL 쿼리에 넣지 않는다. `POST /api/v1/stats/{scope}`의 JSON 본문으로만 전달하고 응답 후 서버에서 폐기한다.

## 5. Docker와 EC2

로컬 개발에서는 Git에서 제외된 루트 `.env`를 Compose 변수 치환 입력으로 사용할 수 있다. `docker-compose.yml`과 `docker-compose.prod.yml`은 포괄 `env_file`을 쓰지 않고 서비스별 `environment`에 필요한 이름만 전달한다. Dockerfile의 `COPY`·`ARG`·`ENV`로 키를 이미지에 넣지 않는다.

### 이번 EC2 데모의 비밀 주입 결정

이번 데모는 **저장소 밖 환경 파일 + 소유자만 읽기 + Compose `--env-file`** 방식으로 확정한다. Secrets Manager와 `_FILE`은 현재 구현하지 않으며 같은 runbook에 섞지 않는다.

1. `.env.example`의 변수 이름을 사용해 저장소 밖에 데모 환경 파일을 만든다. 실제 경로·값은 저장소·문서·채팅에 기록하지 않는다.
2. EC2에서 소유자만 읽도록 `chmod 600 <외부-환경파일>`을 적용한다.
3. 모든 운영 명령은 `docker compose --env-file <외부-환경파일> -f docker-compose.prod.yml ...` 형식을 사용한다.
4. Compose는 이 파일을 호스트 변수 치환에만 사용하고, 서비스별 허용 변수만 컨테이너에 전달한다.

AWS Secrets Manager와 인스턴스 프로파일은 **데모 후 전환 목표**다. 전환 Checkpoint에서 IAM·런타임 주입·애플리케이션 설정 계약을 함께 설계하며, 현재 코드가 지원하지 않는 `_FILE` 경로를 운영 절차로 쓰지 않는다. 데모 코드에 Secrets Manager·NAT 게이트웨이·IAM lookup을 추가하지 않는다.

호스트는 **t4g.small + Ubuntu 24.04 LTS**를 기본으로 한다(TECH_STACK §5). 크레딧 소진·한도 초과 시 On-Demand, T Unlimited surplus, EBS 30GB 총량·스냅샷, 공인 IPv4 시간, NAT, 월 100GB를 넘는 인터넷 송신이 붙을 수 있다. Let's Encrypt 자체 비용이 없어도 80/443 상시 기동은 인스턴스·IPv4 시간을 쓴다. 과금이 없다고 쓰지 않는다.

## 6. GitHub

GitHub에 올리는 것은 `.env.example`뿐이다. **GitHub Actions Secret은 CI job 주입 전용**이다. EC2 데모 런타임 비밀은 Actions Secret이 아니라 저장소 밖 환경 파일이다.

CI에 쓸 때는 다음 위치에 저장한다.

- 저장소 → **Settings → Secrets and variables → Actions**
- 필요 시 환경별 `development`, `production` Environment Secret으로 분리
- Secret 이름은 `.env.example`과 동일하게 설정

GitHub Actions 워크플로에서는 `${{ secrets.OPENAI_API_KEY }}`처럼 필요한 job에만 명시적으로 주입한다. 워크플로 로그에 secret 또는 이를 변환한 값을 출력하지 않는다.

GitHub 저장소에서 **Secret scanning**과 **Push protection**을 활성화한다. 다만 탐지되지 않는 공공데이터포털 키도 있을 수 있으므로 `.gitignore`와 리뷰를 함께 사용한다.

## 7. push 전 확인

```powershell
git check-ignore -v .env
git status --short
git diff --cached
```

- 첫 명령이 `.gitignore` 규칙을 출력해야 한다.
- staged 목록에 `.env`, `secrets/`, 인증서, 실제 키가 없어야 한다.
- `git add .`보다 커밋할 파일을 명시적으로 추가한다.

## 8. 노출 사고 대응

키를 한 번이라도 커밋하거나 공개 채널에 붙였다면 삭제만으로 해결되지 않는다.

1. 해당 제공자에서 키를 즉시 폐기·재발급한다.
2. GitHub Secret scanning 알림과 Actions 로그를 확인한다.
3. Git 기록 제거가 필요한지 GitHub 공식 절차에 따라 판단한다.
4. 새 키는 로컬 `.env`, 이번 데모의 저장소 밖 환경 파일, GitHub Actions Secret에 다시 저장한다. 데모 후 전환을 마쳤다면 AWS Secrets Manager를 사용한다.

## 9. 공식 근거

- [GitHub — Removing sensitive data from a repository](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)
- [GitHub Actions — Secrets](https://docs.github.com/en/actions/concepts/security/secrets)
- [Next.js — Environment Variables](https://nextjs.org/docs/app/guides/environment-variables)
- [Docker — Manage secrets securely in Compose](https://docs.docker.com/compose/how-tos/use-secrets/)
- [Docker — Build context and `.dockerignore`](https://docs.docker.com/build/concepts/context/#dockerignore-files)
- [OpenAI — Best Practices for API Key Safety](https://help.openai.com/en/articles/5112595-best-practices-for-api-key-safety)
- [AWS — What is Secrets Manager?](https://docs.aws.amazon.com/secretsmanager/latest/userguide/intro.html)
- [Cursor — Ignore files](https://cursor.com/docs/reference/ignore-file)
- [Cursor Cloud Agents — Runtime Secrets](https://cursor.com/docs/cloud-agent/security-network)
- [Cursor — Privacy and data governance](https://cursor.com/docs/enterprise/privacy-and-data-governance)
- [FastAPI — Request Body](https://fastapi.tiangolo.com/tutorial/body/)
- [OWASP — REST Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html)
- [OWASP — Cryptographic Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)
- [OWASP — Key Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Key_Management_Cheat_Sheet.html)
- 공공데이터포털: [실손](https://www.data.go.kr/data/15094797/openapi.do) · [자동차](https://www.data.go.kr/data/15124891/openapi.do) · [생명](https://www.data.go.kr/data/15124892/openapi.do)
