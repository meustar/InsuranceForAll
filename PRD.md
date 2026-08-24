# Product Requirements Document (PRD)

**제품명:** 모두의 보험 (Insurance For All)  
**문서 버전:** MVP 1.4 (2026-08-24 — Tab 허브 여정 · D3.js 차트 유형)
**구현 마감:** 2026-08-27  
**관련:** [FUNCTIONAL_SPEC.md](./FUNCTIONAL_SPEC.md) · [FLOWCHARTS.md](./FLOWCHARTS.md) · [TECH_STACK.md](./TECH_STACK.md) · [PUBLIC_API_PAGE_PLAN.md](./PUBLIC_API_PAGE_PLAN.md) · [DESIGN.md](./DESIGN.md) · [ERD.md](./ERD.md) · [ENVIRONMENT.md](./ENVIRONMENT.md)

**SSOT:** 화면·API 입력·인사이트 상세는 [PUBLIC_API_PAGE_PLAN.md](./PUBLIC_API_PAGE_PLAN.md), 물리 스키마는 [ERD.md](./ERD.md) v1.5+. 본 PRD와 충돌 시 위 두 문서·본 버전(1.4)을 우선한다.

---

## 1. 한 줄 정의

**모두의 보험**은 이름·주민등록번호·연락처 없이, **생년월일(YYYY-MM-DD)·성별·지역**만으로 보험나이를 산정해 금융위원회 공공 OpenAPI **실손·자동차·생명** 통계를 **허브에서 사용자가 선택한 탭**으로 보여주고, 각 스코프에서 OpenAI로 **쉬운 설명**을 붙이며, (선택) 증권 PDF를 마스킹한 뒤 상담은 **원할 때만** 연결하는 **의사결정 지원 웹**이다.

이 제품은 **보험 모집·비교추천 플랫폼·청약 대행이 아니다.**  
사용자 입력은 **화면에 쓰기 위해 받을 뿐 PostgreSQL에 저장하지 않는다** (ERD v1.5).

---

## 2. 왜 1.4로 올렸는가

| 결정 | 내용 |
|------|------|
| 프로젝트 루트 | 이 저장소의 최상위 디렉터리(`Insurance_For_All`) |
| 프론트 | **JavaScript만** |
| UI | **Google Stitch** ([프로젝트](https://stitch.withgoogle.com/projects/17570932267095502369)) + [DESIGN.md](./DESIGN.md) → `apps/web` (JavaScript). Figma Make·v0는 **보류·선택** |
| 마감 | 2026-08-27, **P0만** |
| 관리자 | **P1** |
| 통계 여정 | **메인 → `/stats` 허브 → 사용자 선택 탭** (`health`\|`auto`\|`life`). **순서 강제 없음**. 「이전」→ 허브 |
| 차트 | **D3.js** (React Client + ref). 범주 비교는 가로 막대·덤벨. 상세는 [PUBLIC_API_PAGE_PLAN.md](./PUBLIC_API_PAGE_PLAN.md) §3. Recharts/Chart.js 비채택 |
| 공통 입력 | 생년월일→보험나이 · 성별 · 지역. 직업·유병력은 **P0 미수집** |
| 사용자 데이터 | **PG 비영속** (메모리/`sessionStorage`). 동의 후 상담 연락처만 PG |
| 요청 경계 | 개인화 통계는 `POST` JSON body. 생년월일 URL·로그 금지 |
| 비밀정보 | API 키는 백엔드 전용 `.env`/Secret Manager. Git·브라우저 노출 금지 |
| 데이터 | 공공 OpenAPI 3종 캐시 + (선택) PDF |

근거: 세 API 통계는 서로 독립 KPI라 선형 순서가 필수가 아니다. 1.3의 비밀정보·비영속 경계는 유지한다.

---

## 3. 문제 · 규제

| 현상 | 결과 |
|------|------|
| 견적·상담 전 연락처 요구 | 탐색 포기 |
| 약관·증권 용어 | 정보 비대칭 |
| 나와 비슷한 조건의 공개 통계가 안 보임 | 기준 없이 가입/거절 |
| “추천” 카피 | 중개 오인 |

- [개인정보 보호법 제3조·제16조](https://www.law.go.kr/lsInfoR.do?chrClsCd=010202&efYd=20251002&lsiSeq=270351&urlMode=lsInfoP): 목적에 필요한 최소 개인정보만 수집해야 한다. 본 제품은 P0 입력을 3개로 제한하고 PG 영속화를 피하지만, 비영속 입력도 개인정보 처리로 보고 목적·항목·처리 방식·거부 시 제한을 고지한다.
- [금융소비자보호법 제22조](https://www.law.go.kr/LSW/lsInfoP.do?ancYnChk=0&chrClsCd=010202&efYd=20260102&lsiSeq=277247&urlMode=lsInfoP): 금융상품 광고 주체와 명확·공정한 전달 의무가 정해져 있다. MVP는 상품 추천·순위·가입 유도·광고로 읽히는 표현을 만들지 않는다.
- 금융위원회의 [플랫폼 보험상품 비교·추천 서비스](https://www.fsc.go.kr/no010101/81512)는 지정된 혁신금융서비스 사업자의 제도권 서비스다. 교육용 MVP는 같은 지위·인가·적법성을 주장하지 않으며 공개 전 별도 법률·준법 검토가 필요하다.

---

## 4. 목표 / 비목표

### 4.1 Goals (8/27)

| ID | 목표 |
|----|------|
| G1 | 이름·전화 없이 통계 **최소 2개 스코프** 도달 (순서 무관) |
| G2 | 캐시된 공공 통계를 API별로 표시 (기준일·출처). **실손 totalCount≠가입자 수** |
| G3 | 실손: 동일 조건 **상품·보험료 2열 이상** 비교 (공공 필드만) |
| G4 | PDF 선택 · 마스킹 후 JSON만 저장 · 원문 비보관 |
| G5 | **스코프(탭)별** AI 설명. 생년월일·원문 PDF를 LLM에 넣지 않음. 허브 AI는 P0 비필수 |
| G6 | 목적·항목·보유기간·거부권 고지에 상담 동의한 경우만 **이메일**(P0)·선택 메모를 암호화해 기한부 PG 저장 · 접수 시 운영(설계사) 알림 |
| G7 | 전 분석 화면 “참고용·가입 권유 아님·견적 아님” |
| G8 | 사용자 프로필(생년월일·성별·지역 등) **PG 미저장** |
| G9 | 생년월일은 사용자 요청 URL·로그에, API 키는 브라우저 번들·Git·로그에 남기지 않음. 공공포털 `serviceKey` query는 backend 배치 규격의 예외로 최소화·정제 |
| G10 | 통계 그래프는 **D3.js**로 지표 질문에 맞는 표현(가로 막대·덤벨·분포 요약; 추이는 선·P1). 장식·원형 남용·이중축 금지. 유형 SSOT: PAGE_PLAN §3 |

### 4.2 Non-Goals

- 관리자 웹, OCR, HITL, TypeScript, Turborepo, RDS  
- 실시간 개인 보험료 견적, 가입 유도  
- 자동차 연식 UI, 연령·성별 결합 사고율, 국민연금 통계

---

## 5. 사용자

| 페르소나 | MVP |
|----------|-----|
| 김초보 | 메인 입력 → 허브에서 원하는 스코프 선택 → 통계+쉬운 설명. 연락처 없음 |
| 이가족 | 위 + (선택) PDF |
| 운영 설계사 | 상담 **이메일** 알림 수신 (관리자 UI는 P1) |

---

## 6. User Journey (P0)

1. **메인 `/`:** 소개·고지 + 생년월일(YYYY-MM-DD)·성별·지역 — PG INSERT 없음  
2. **통계 허브 `/stats`:** 실손·자동차·생명 탭 메뉴 + 스코프별 요약 카드. 순서 강제 없음  
3. **스코프 탭** `/stats/health|auto|life`: 캐시 통계 + **D3** 그래프 + **하단 AI**(해당 scope) + **하단 선택 CTA**(PDF·이메일 상담). **「이전」→ `/stats`**  
4. 상단 메뉴바: 허브 진입 후(세션 있음)만 3탭 활성 · 입력 전 비활성  
5. (선택) **`/documents`** 증권 PDF 업로드 → 마스킹  
6. (선택) **`/consultations`** 동의 후 **이메일** 상담 신청 → 설계사(운영) 알림  

상세: [FLOWCHARTS.md](./FLOWCHARTS.md), [PUBLIC_API_PAGE_PLAN.md](./PUBLIC_API_PAGE_PLAN.md).

---

## 7. 데이터 전략

| 층 | 내용 | 저장 |
|----|------|------|
| Macro | OpenAPI 3종 배치 → PG `stats_*` + `public_cache_heads` | PG |
| 프로필 | 생년월일·성별·지역 | **메모리/`sessionStorage`만** · 종료/초기화/30분 비활성 시 삭제 |
| Micro | PDF 마스킹 JSON, AI 요약(통계만), 상담 연락처·선택 메모 | PG (선택·동의 후, `expires_at` 만료 삭제) |

| API | 포털 | 화면 메시지 | 핵심 KPI |
|-----|------|-------------|----------|
| 실손 | [15094797](https://www.data.go.kr/data/15094797/openapi.do) | 공개 상품 보험료 비교 | ml/fml 보험료, 중앙값 |
| 자동차 | [15124891](https://www.data.go.kr/data/15124891/openapi.do) | 조건별 가입대수·경과보험료 | joinCnt, elpsInpm |
| 생명 | [15124892](https://www.data.go.kr/data/15124892/openapi.do) | 보험종류별 가입건수·가입율 | joinCnt, joinRto (`getLifeInsuJoinStatus`만; 개인연금·국민연금 제외) |

야간/기동 시 1회 동기화. 화면: 출처·기준일(년월)·견적 아님.

**보험나이:** 이용일(`asOfDate`) 기준 만나이 + 상령일(생일+6개월) 규칙 → 실손 `age` / 자동차 `aggr` / 생명 `rchnAggr` 자동보정. 매 요청 재계산.

---

## 8. AI 규칙

1. 입력: **해당 페이지 통계 요약** (+ 선택 마스킹 JSON). 생년월일 원문 금지  
2. 출력: 쉬운 요약, 눈에 띄는 점, (선택) 상담 질문  
3. 금지: 가입 권유, 최적 상품, 화면 없는 숫자  
4. 실패: 규칙 템플릿  
5. scope: `health` | `auto` | `life`

---

## 9. PDF 파이프라인

(변경 없음 요지) 검증 → 202+job → 마스킹 → JSONB → 원본 삭제. 원문 LLM 금지.

---

## 10. 논리 아키텍처

[TECH_STACK.md](./TECH_STACK.md)와 동일 3-Tier.  
배치만 포털 호출 → PG. 사용자 통계는 PG 캐시만. 프로필은 API 요청에 실어 오며 PG에 INSERT하지 않음.

---

## 11. 논리 데이터

| 개념 | MVP |
|------|-----|
| UserProfile (비영속) | 메모리/`sessionStorage`. birth_date, sex, area_nm |
| PublicStatsCache | `public_cache_heads` + `public_sync_runs` + `stats_medical_rates` / `stats_auto_contracts` / `stats_life_join_status` — [ERD.md](./ERD.md) |
| UploadedDocument / MaskedCoverage | 선택. `anon_session_key_hash`만, 원문 세션 토큰·프로필 없음 |
| AiReport | scope별 요약. 생년월일 미포함 |
| ConsultationRequest | 동의 후 암호화 연락처만 |

---

## 12. 성공 지표

| 지표 | 확인 |
|------|------|
| 프로필 테이블/생년월일 컬럼 없음 | PG 스키마 |
| 허브 랜딩 + 최소 2스코프(순서 무관) | UAT |
| 스코프 「이전」→ `/stats` | UAT |
| 스코프 하단 AI(또는 폴백) | UAT |
| D3 차트 + 출처·견적 아님 캡션 | UAT |
| 상담 전 consultations 비어 있음 | DB |
| 선택 산출물·상담 정보 만료 삭제 | DB·정리 작업 UAT |
| 출처·기준일·비권유 | 화면 |

---

## 13. 리스크

| 리스크 | 대응 |
|--------|------|
| 공공 API 장애 | 이전 캐시 + stale (heads) |
| 실손 totalCount 오인 | “상품·레코드 수”만 |
| 중개 오인 | 카피 검수 |
| 7일 일정 | P0만, 관리자 제외 |

---

## 14. 마감까지 남은 작업 (참고 · 2026-08-25 기준)

**현재:** 문서 SSOT·Stitch 프로토타입·`design/tokens.css`까지 확정. **`apps/*` 코드·Compose·EC2 배포는 미구현.**  
**데모 목표:** 2026-08-27 (P0 UAT §6)

| 단계 | 내용 |
|------|------|
| A. 로컬 구현 | Compose + api/worker/web · ERD migration · F-11 sync · stats/AI/PDF/상담 API · 7화면 + D3 |
| B. EC2 배포 | t4g.medium · Ubuntu 26.04 · Docker · nginx 443 SSL · `docker-compose.prod.yml` 3-Tier network |

과거 8/21~8/24 일정은 **문서·Stitch 확정**까지 반영됨. 상세 기술 순서는 [TECH_STACK.md](./TECH_STACK.md) §5·§8.

---

## 15. 차별점

- 탐색에 연락처 불필요 · 프로필 PG 비영속  
- 마스킹이 저장보다 앞섬  
- 상담 시점은 사용자  

---

## 16. 출처

- 공공데이터포털 OpenAPI: [실손](https://www.data.go.kr/data/15094797/openapi.do) · [자동차](https://www.data.go.kr/data/15124891/openapi.do) · [생명](https://www.data.go.kr/data/15124892/openapi.do)
- [개인정보 보호법](https://www.law.go.kr/lsInfoR.do?chrClsCd=010202&efYd=20251002&lsiSeq=270351&urlMode=lsInfoP) · [금융소비자보호법](https://www.law.go.kr/LSW/lsInfoP.do?ancYnChk=0&chrClsCd=010202&efYd=20260102&lsiSeq=277247&urlMode=lsInfoP)
- [금융위원회 — 플랫폼 보험상품 비교·추천 서비스](https://www.fsc.go.kr/no010101/81512) · [금융감독원 — 보험상품 비교공시](https://www.fss.or.kr/main/prc/is/sub/is008.jsp?menuNo=900399)
- [금융감독원 — 보험 가입시 ‘보험나이’ 적용](https://fine.fss.or.kr/fine/bbs/B0000340/view.do?menuNo=900014&nttId=127513) · 윤년/월말/상령일 경계 테스트
