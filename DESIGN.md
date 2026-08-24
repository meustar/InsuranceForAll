# DESIGN.md — 모두의 보험 (Insurance For All)

**용도:** Google Stitch·디자인 에이전트용 **시각·공통 UX 규칙서** (Theme / chrome / components)  
**제품 버전 정합:** MVP **1.4** (2026-08-24)  
**로컬 정본:** 이 파일. Notion은 공유·검토용 요약·전문 미러.  
**충돌 시:** 여정·API·차트 유형·개인정보 경계는 [`PUBLIC_API_PAGE_PLAN.md`](./PUBLIC_API_PAGE_PLAN.md) · [`PRD.md`](./PRD.md) · [`ERD.md`](./ERD.md)를 우선한다. 본 문서는 **어떻게 보이게·어떻게 조작하게**만 잠근다.

**Stitch Prompt Guide 정합:** [Stitch Prompt Guide](https://discuss.ai.google.dev/t/stitch-prompt-guide/83844) — vibe adjectives · theme(색/폰트/보더) 분리 · 화면별 점진 수정 · UI/UX 키워드 · 한 번에 한 가지 변경.

---

## 0. Stitch에서 이 파일을 쓰는 법

1. 프로젝트 **Edit Theme / DESIGN.md**에 본문(또는 §1–§6)을 넣고 테마를 잠근다.  
2. 채팅 후속에는 짧게: `Follow DESIGN.md. Do not create any new pages. Edit the selected screen(s) only.`  
3. **테마만** 바꿀 때 새 페이지를 만들지 않는다. **한 화면·한 요소**만 고친다.  
4. 잘 나온 화면은 스크린샷으로 저장한다.

| 가이드 원칙 | 본 문서에서의 대응 |
|-------------|-------------------|
| Set the vibe with adjectives | §1 Vibe |
| Controlling theme (colors / fonts / borders) | §2–§3 |
| UI/UX keywords | navigation bar, hero, card layout, call-to-action, footer, chips |
| One major change at a time | §9 Do / Don’t · Stitch 사용법 |
| Clear & concise | 토큰·수치·금지 목록으로 지시 (장문 IA 재서술 금지) |

---

## 1. Product · Vibe

| 항목 | 값 |
|------|-----|
| 제품명 | 모두의 보험 (Insurance For All) |
| 플랫폼 | Desktop-first **responsive web** (네이티브 앱·관리자 콘솔 아님) |
| 한 줄 목적 | 공공 통계 기반 **보험 의사결정 지원**. 견적·모집·비교추천·청약·로그인 없음 |
| Vibe adjectives | calm, trustworthy, institutional, minimalist, clear, educational |
| UI 언어 | **한국어** |
| 계정 | **로그인·아바타·내 정보·회원가입 없음** |

**피하기:** purple neon AI 클리셰, dark cyberpunk, 이모지 남발, 하단탭(홈/추천/내정보), 장식용 대시보드, 크림+테라코타 기본 AI 테마.

**근거:** 제품은 제도권 비교·추천 사업이 아니며 신뢰·참고용 톤이 필요하다 (`PRD` 비목표·G7).

---

## 2. Color tokens

| Token | Role | Approx |
|-------|------|--------|
| `color.primary` | CTA, active tab | Deep navy `#0B1F3A`–`#123056` |
| `color.primary-hover` | Primary hover | Lighter navy |
| `color.text` | Primary text | `#0F172A` |
| `color.text-secondary` | Helper, inactive tab, meta | `#64748B` |
| `color.text-on-primary` | On navy | `#FFFFFF` |
| `color.bg-page` | Page | `#F1F5F9` |
| `color.bg-surface` | Header, cards, form | `#FFFFFF` |
| `color.bg-muted` | Notice, footer | `#F8FAFC` / `#E2E8F0` |
| `color.border` | Dividers, inputs | `#E2E8F0` |
| `color.danger` | Errors only | `#B91C1C` |

**규칙:** WCAG AA 대비. 두 번째 브랜드 액센트(보라·테라코타) 추가 금지. 차트는 navy+slate; 남·여 시리즈는 구분 가능한 두 중립/블루 — “최적 상품” 신호색 금지.

**Stitch theme cue:** deep navy primary, white surfaces, light cool-gray page, soft gray borders.

---

## 3. Typography · borders · controls

한국어 가독용 **sans-serif** (Pretendard / Noto Sans KR 계열). 본문에 playful display 금지.

| Role | Size | Weight | LH | Use |
|------|------|--------|-----|-----|
| Brand / Display | 36–40px | Bold | 1.2 | 메인 히어로 브랜드만 |
| H1 | 28px | Bold | 1.25 | 화면 제목 |
| H2 | 20–22px | Semibold | 1.3 | 섹션 |
| H3 | 17–18px | Semibold | 1.35 | 카드·패널 제목 |
| Body | 16px | Regular | 1.5 | 본문·AI |
| Label | 14px | Semibold | 1.4 | 폼 라벨 |
| Secondary | 14px | Regular | 1.45 | 보조 |
| Caption | 12–13px | Regular | 1.4 | 고지·출처·차트 캡션 |
| KPI number | 28–32px | Bold | 1.2 | 지표 |
| KPI label | 13–14px | Regular | 1.3 | 지표 라벨 |

**하드 룰:** Body ≥ 14px, Caption ≥ 12px. 화면마다 임의 중간 사이즈 금지.

**Borders / radius (theme):**
- Input / card radius ≈ 8–12px  
- Primary button radius ≈ 10–12px  
- Input border: 1–2px solid `color.border`  
- Input / primary button height: **48px**  
- Secondary button height: **44–48px**  
- Hit target ≥ **44×44px** (WCAG 2.2 / Fitts)

---

## 4. Spacing · layout (8pt)

| Token | Value |
|-------|-------|
| Page pad desktop | 32–40px |
| Page pad mobile | 20–24px |
| Section gap | 32px |
| Card padding | 20–24px |
| Form field gap | 16px |
| Control gap | 8–12px |
| Header → content | 32px |
| Content → footer | 40px |
| Content max-width | 960–1040px centered |

여백은 “비어 있음”이 아니라 **다음 결정까지의 리듬**. 허브·스코프에서 과한 공백으로 CTA가 밀리지 않게 한다.

---

## 5. Shared chrome (전 화면 동일 기하)

### 5.1 Top navigation bar

- Height **64px**
- `[ Brand “모두의 보험” left ] [ Tabs: 실손 \| 자동차 \| 생명 ] [ RIGHT EMPTY ]`
- Brand 18px semibold → Main
- Tab 15px, gap 24px; active = navy + 2px underline
- Main(세션 전): tabs **disabled** look
- Hub/scope(세션 후): tabs enabled
- **금지:** 우측 아바타·로그인·계정·Header 안 “입력 수정”

**근거:** 로그인 없는 세션 제품(`PRD` G8). 계정 슬롯은 오해(회원제)를 만든다.

### 5.2 Session chips (Hub + scope only)

- `보험나이` · `성별` · `지역` chips (≥32px high, ≥13px text)
- “입력 수정” = chips **옆** ghost/text (Header 우측 아님)
- Main: chips·“입력 수정” **없음**

**근거:** 프로필은 PG 비영속·세션만(`ERD` v1.5). 수정은 세션 입력 재진입이지 계정 설정이 아니다.

### 5.3 Footer

- `color.bg-muted`, top border 1px, pad 24×32
- Brand 14px + disclaimer 12–13px:  
  `참고용 · 견적·가입 권유 아님 · 공공데이터 기반 · 실시간 견적 아님`
- Main: brand + disclaimer **만** (「이전」·가짜 안내 링크 행 금지)
- 스코프 전환은 Footer 주 경로가 아님 → §5.4

### 5.4 Cross-navigation (scope only)

- chips 아래 **와** footer 위 **동일** 블록
- Secondary → **다른 두** 스코프만
- Ghost 「이전」→ **Stats Hub** (`/stats`) — Main·브라우저 뒤로가기 은유 단독 금지
- Height 44–48px, gap 12px, 전 스코프 동일

**근거:** 여정은 허브 중심 분기; 「이전」=허브 (`PAGE_PLAN` §1.1.1, `FLOWCHARTS`).

---

## 6. Components

### Buttons

| Type | Style | Height | When |
|------|-------|--------|------|
| Primary | Solid navy, white | 48px | 화면당 주 과업 1개 (예: “통계 보기”) |
| Secondary | Outline / light | 44–48px | 스코프 이동, PDF·상담 |
| Ghost | Text (+icon), 44 hit | 44px | 「이전」, “입력 수정” |

### Form (Main)

- Fields **only:** 생년월일 `YYYY-MM-DD`, 성별(남자/여자), 지역  
- **Never:** 직업, 유병력, 이름, 주민번호, 로그인  
- Privacy notice **above** form (목적·항목·세션 처리·거부 시 제한).  
  “개인정보를 수집하지 않습니다” **금지** (비영속도 처리로 고지 — `PRD`)

### Cards

- White, light border, radius ~12px  
- Hub: **equal-weight** 3 cards — ranking/추천 배지 금지  
- Hero에 장식 카드 남발 금지

### KPI

- 큰 숫자 + 짧은 라벨  
- 표 및/또는 차트와 **함께** (차트만으로 의미 전달 금지 — `PAGE_PLAN` §3)

### Chart placeholders (Stitch) → 구현은 D3.js

| 우선 (P0) | 금지 |
|-----------|------|
| Horizontal bar / lollipop | Pie / donut (기본) |
| Dumbbell (남·여) | Dual Y-axis |
| 실손: median card + box/distribution summary | 장식 게이지, “1위” 강조 막대 |
| Hub: **차트 없음** (단위 혼재) | |

모든 차트 캡션: `출처 · 기준년월 · 단위 · 견적 아님`  
유형 SSOT: `PUBLIC_API_PAGE_PLAN.md` §3.

### AI block

- **Scope pages only** (하단). Hub P0 비필수  
- 3–6문장, 톤: 참고 설명 · 가입 권유·개인 보험료 확정 아님

### Optional actions row (scope pages only)

- **위치:** AI 블록 **바로 아래**, cross-nav **위**
- **두 secondary 버튼 (동일 패턴·동일 라벨 on every scope):**
  1. **증권 PDF 업로드** → `/documents`
  2. **이메일로 상담 신청** → `/consultations`
- Helper 13–14px: “선택 사항 · 통계 탐색에는 연락처가 필요하지 않습니다”
- **금지:** 전화번호 필드, 「전화 상담」, 통계 화면에 이메일 입력

### PDF page `/documents`

- Shared header/footer. Title H1: “증권 PDF 업로드”
- Notice: 원본 미보관·마스킹 후 JSON만·선택 경로
- File dropzone + primary “업로드” (48px)
- Job status area (pending / done / error)
- Ghost 「통계로 돌아가기」

### Consultation page `/consultations`

- Shared header/footer. Title H1: “이메일로 상담 신청”
- **Consent block** (readable 14–16px): 목적·항목(이메일·선택 메모)·보유기간·거부권
- Short rationale: “통계 확인에는 연락처가 필요 없으며, 상담을 원하실 때만 이메일을 받습니다.”
- Fields: **이메일 only** (required), 메모 (optional). **No phone**
- Checkbox 동의 + primary “상담 신청하기”
- Success state: “접수되었습니다. 이메일로 연락드립니다.” (가입·견적 확정 금지)
- Ghost 「통계로 돌아가기」

---

## 7. Screen patterns (요약 · 상세는 PAGE_PLAN)

1. **Main `/`** — Brand → promise → privacy → 3-field form → CTA “통계 보기” → footer → **항상 Hub**  
2. **Hub `/stats`** — chips → “보고 싶은 통계를 선택하세요” → 3 equal cards → (보조) PDF·상담 링크 → footer · **AI·차트 없음**  
3. **Scope** — nav → chips → cross-nav → filters → KPI → chart(s) → table → AI → **optional actions (PDF · email consult)** → cross-nav → footer  
4. **`/documents`** — notice → upload → status → back to stats  
5. **`/consultations`** — consent → email (+ optional memo) → submit → success/back  

Hub card one-liners (고정):
- 실손: 같은 연령·유형·담보의 상품 보험료 비교  
- 자동차: 나와 비슷한 조건의 가입대수·집계 보험료  
- 생명: 같은 연령·성별·지역의 보험종류별 가입건수·가입율  

Filters (identity 아님): health `보험유형`/`담보` · auto `종목`/`차종` · life는 공통 프로필·지역 강조.

---

## 8. Copy rules

**허용:** 참고용, 견적 아님, 가입 권유 아님, 공공 통계, 상품 보험료 비교, 가입건수(**건**), 가입율  

**금지:** 추천 / 최적 / 1위 / 순위 / 개인 견적 확정 / totalCount=가입자 수 / 건=명 / “개인정보 미수집”

**근거:** 금소법·비교추천 사업 오인 방지 · API 필드 의미 (`PRD`, `PAGE_PLAN` §0·§6).

---

## 9. Explainable UX map (왜 이렇게)

| UX 결정 | 근거 |
|---------|------|
| Body 16px · type scale 고정 | 한국어 가독 · 위계(무엇을 먼저 읽는지) |
| CTA 48px · hit ≥44 | WCAG 2.2 · Fitts’s law |
| Primary 1개/화면 | 선택 과부하 감소 |
| Header/Footer 기하 통일 | 학습 비용 ↓ · 탭만 다르게 |
| 로그인 UI 없음 | 계정·PG 프로필 없음 |
| 허브 후 자유 탭 | 세 API KPI 독립 · 선형 강제 폐기 |
| 「이전」→ 허브 | 스코프는 허브의 자식 |
| KPI→차트→AI→선택 CTA | 숫자 근거 먼저, 연락은 별도 페이지·동의 후 |
| 이메일만 상담(P0) | 전화 수집 최소화 · 탐색 단계 연락처 없음 |
| 가로 막대·덤벨 | 범주 비교·남녀 격차 (`PAGE_PLAN` §3) |
| 원형·이중축 금지 | 비중·단위 오해 |

---

## 10. Do / Don’t (Stitch edits)

**Do**
- `Follow DESIGN.md` + `Do not create any new pages`
- 선택한 화면만 · 한 번에 헤더만/버튼만/카피만
- Theme(색·폰트·보더)와 화면 구조 변경을 **섞지 않기**

**Don’t**
- 테마 요청으로 새 페이지 세트 재생성
- 로그인·아바타·하단 추천탭 추가
- 실손→자동차→생명 위저드 강제
- 도넛으로 “예쁘게” 바꾸기
- 직업·유병력 필드 부활

---

## 11. Implementation handoff (Stitch 밖)

목표 프론트: Next.js App Router + React + **JavaScript** + Tailwind CSS 4 + **D3.js** (Client + `ref`).  
Stitch 산출물은 시각 골격; 차트·API·개인정보 경계는 코드·`PAGE_PLAN`/`FUNCTIONAL_SPEC`을 따른다.  
프로토타입 경로: Stitch(DESIGN.md) → (선택) export → `apps/web` 이식.

---

## 12. 문서 동기화

| 관련 | 역할 |
|------|------|
| `PRD.md` / `FUNCTIONAL_SPEC.md` | 제품·F-ID |
| `PUBLIC_API_PAGE_PLAN.md` | 화면·차트·카피 상세 SSOT |
| `FLOWCHARTS.md` | 여정 |
| `TECH_STACK.md` | 구현 스택 |
| `README.md` | 읽을 순서 |

UI 토큰·공통 크롬·카피 금지가 바뀌면 **이 파일과** 영향 화면 설명을 같이 갱신한다.
