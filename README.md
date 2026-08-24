# 모두의 보험 (Insurance For All)

**공식 프로젝트 루트:** 이 저장소의 최상위 디렉터리(`Insurance_For_All`)

**문서 버전:** MVP 1.4 (2026-08-24)
**데모 마감:** 2026-08-27

---

## 읽을 순서 · SSOT

| 순서 | 파일 | 역할 |
|------|------|------|
| 1 | [PRD.md](./PRD.md) | 제품 정의·목표·비영속·여정 |
| 2 | [FUNCTIONAL_SPEC.md](./FUNCTIONAL_SPEC.md) | F-ID · API · UAT |
| 3 | [FLOWCHARTS.md](./FLOWCHARTS.md) | P0 흐름 |
| 4 | [PUBLIC_API_PAGE_PLAN.md](./PUBLIC_API_PAGE_PLAN.md) | 3API 입력·인사이트·그래프·AI (**상세 SSOT**) |
| 5 | [DESIGN.md](./DESIGN.md) | Stitch·UI 토큰·공통 크롬·카피 금지 (**시각 UX**) · [Stitch 프로토타입](https://stitch.withgoogle.com/projects/17570932267095502369) |
| 6 | [ERD.md](./ERD.md) | 스키마 v1.5+ (**물리 SSOT**) |
| 7 | [TECH_STACK.md](./TECH_STACK.md) | 버전·인프라·D3 |
| 8 | [ENVIRONMENT.md](./ENVIRONMENT.md) | API 키·`.env`·GitHub·배포 보안 |

충돌 시: **PAGE_PLAN(도메인) · ERD(스키마) · PRD/스펙 1.4(제품)** 를 구버전보다 우선한다. 색·타이포·Header/Footer는 **DESIGN.md**, 차트 유형·지표 의미는 **PAGE_PLAN §3**.

---

## 한 줄 요약

이름·연락처 없이 **생년월일·성별·지역**으로 보험나이를 맞춘 뒤, **통계 허브**에서 원하는 **실손·자동차·생명 탭**을 골라 공공 통계와 D3 그래프·쉬운 AI 설명을 보고, (선택) **증권 PDF 업로드**(`/documents`)·**이메일 상담**(`/consultations`)만 추가하는 웹입니다.  
**사용자 입력은 PostgreSQL에 저장하지 않습니다.** 가입·청약·실시간 견적은 하지 않습니다.

---

## Cursor 주의

- 이 폴더만 연 상태에서 작업  
- 프론트는 **JavaScript** (`.ts`/`.tsx` 금지)  
- 프로필을 `POST /profiles`로 PG에 쌓는 구설계는 **폐기** (FUNCTIONAL_SPEC 1.4)
- 생년월일을 URL 쿼리에 넣지 않고 `POST /api/v1/stats/{scope}` JSON 본문으로만 전달
- 통계 여정은 **메인 → `/stats` 허브 → 사용자 선택 탭** (순서 강제 없음). 「이전」→ 허브
- 차트는 **D3.js** (React Client + ref). 유형은 `PUBLIC_API_PAGE_PLAN.md` §3. TypeScript·Recharts·Chart.js 금지

## API 키 시작

```powershell
Copy-Item .env.example .env
git check-ignore -v .env
```

실제 공공데이터포털 키 3개와 OpenAI 키는 로컬 `.env`에만 입력한다. `NEXT_PUBLIC_` 접두사, 코드, Notion, GitHub 커밋에는 키를 넣지 않는다. GitHub Actions는 같은 이름의 Repository/Environment Secret을 사용하고, EC2 운영은 AWS Secrets Manager를 권장한다. 자세한 절차와 노출 대응은 [ENVIRONMENT.md](./ENVIRONMENT.md)를 따른다.

Cursor가 비밀파일을 AI 컨텍스트에서 제외하도록 [ENVIRONMENT.md](./ENVIRONMENT.md)의 패턴으로 루트 `.cursorignore`도 수동 생성한다. `.cursorignore`는 보조 통제이며 실제 키를 채팅·도구 출력에 붙이지 않는다.

## Coding Agent 설정

- [AGENTS.md](./AGENTS.md): Cursor·Codex 공통 프로젝트 지침 SSOT
- [CLAUDE.md](./CLAUDE.md): Claude Code가 `AGENTS.md`를 불러오는 진입점
- `.cursor/rules/*.mdc`: 프론트·백엔드·데이터·문서 작업에만 조건부 적용되는 세부 규칙
- `.cursor/agents/verifier.md`: 구현 결과를 읽기 전용으로 독립 검증하는 Cursor 서브에이전트
- `.cursor/BUGBOT.md`: Agent Review·Bugbot의 PR 리뷰 기준

규칙은 코드에서 알 수 없는 반복 제약만 유지한다. 실제 마찰이 반복될 때 규칙이나 Skill을 추가하고, 일회성 계획은 넣지 않는다.

공식 근거:

- [Cursor Rules](https://cursor.com/docs/rules) · [Subagents](https://cursor.com/docs/subagents) · [Bugbot](https://cursor.com/docs/bugbot) · [Ignore files](https://cursor.com/docs/reference/ignore-file)
- [OpenAI Codex — AGENTS.md](https://developers.openai.com/codex/guides/agents-md) · [Best practices](https://developers.openai.com/codex/learn/best-practices)
- [Claude Code — CLAUDE.md와 AGENTS.md import](https://code.claude.com/docs/en/memory)
