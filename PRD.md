# Product Requirements Document (PRD)

**제품명:** 모두의 보험 (Insurance For All)  
**문서 버전:** MVP 1.2 (2026-08-21 — OpenAPI·여정·비영속 동기화)  
**구현 마감:** 2026-08-27  
**관련:** [FUNCTIONAL_SPEC.md](./FUNCTIONAL_SPEC.md) · [FLOWCHARTS.md](./FLOWCHARTS.md) · [TECH_STACK.md](./TECH_STACK.md) · [PUBLIC_API_PAGE_PLAN.md](./PUBLIC_API_PAGE_PLAN.md) · [ERD.md](./ERD.md)

**SSOT:** 화면·API 입력·인사이트 상세는 [PUBLIC_API_PAGE_PLAN.md](./PUBLIC_API_PAGE_PLAN.md), 물리 스키마는 [ERD.md](./ERD.md) v1.4+. 본 PRD와 충돌 시 위 두 문서·본 버전(1.2)을 우선한다.

---

## 1. 한 줄 정의

**모두의 보험**은 이름·주민등록번호 전체·연락처 없이, **생년월일(앞 6자리 등)·성별·지역**만으로 보험나이를 산정해 금융위원회 공공 OpenAPI **실손 → 자동차 → 생명** 통계를 순서대로 보여주고, 각 페이지에서 OpenAI로 **쉬운 설명**을 붙이며, (선택) 증권 PDF를 마스킹한 뒤 상담은 **원할 때만** 연결하는 **의사결정 지원 웹**이다.

이 제품은 **보험 모집·비교추천 플랫폼·청약 대행이 아니다.**  
사용자 입력은 **화면에 쓰기 위해 받을 뿐 PostgreSQL에 저장하지 않는다** (ERD v1.4).

---

## 2. 왜 1.2로 올렸는가

| 결정 | 내용 |
|------|------|
| 프로젝트 루트 | `c:\workspace\cursor-dev\Insurance_For_All` |
| 프론트 | **JavaScript만** |
| UI | Figma Make → v0 → 이 레포 |
| 마감 | 2026-08-27, **P0만** |
| 관리자 | **P1** |
| 통계 여정 | **메인 → 실손 → 자동차 → 생명** (API당 1페이지) |
| 공통 입력 | 생년월일→보험나이 · 성별 · 지역. 직업·유병력은 **선택(AI용)** |
| 사용자 데이터 | **PG 비영속** (쿠키/클라이언트). 동의 후 상담 연락처만 PG |
| 데이터 | 공공 OpenAPI 3종 캐시 + (선택) PDF |

근거: 3종 OpenAPI ChatGPT 분석 — 직업·유병력으로는 API 필터 불가. 연령·성별·지역(생명)·정확 나이(실손)가 실제 축.

---

## 3. 문제 · 규제

| 현상 | 결과 |
|------|------|
| 견적·상담 전 연락처 요구 | 탐색 포기 |
| 약관·증권 용어 | 정보 비대칭 |
| 나와 비슷한 조건의 공개 통계가 안 보임 | 기준 없이 가입/거절 |
| “추천” 카피 | 중개 오인 |

- 개인정보 보호법 제3조·제16조: **최소 수집**. 본 제품은 프로필을 PG에 쌓지 않아 영속 수집을 피한다.  
- 금소법·금감원 취지: 가입 유도·최적 상품 문구 **금지**.  
- 교육용 MVP — 비교·추천 혁신금융 라이선스 주장 안 함.

---

## 4. 목표 / 비목표

### 4.1 Goals (8/27)

| ID | 목표 |
|----|------|
| G1 | 이름·전화 없이 통계 2페이지 이상 도달 |
| G2 | 캐시된 공공 통계를 API별로 표시 (기준일·출처). **실손 totalCount≠가입자 수** |
| G3 | 실손: 동일 조건 **상품·보험료 2열 이상** 비교 (공공 필드만) |
| G4 | PDF 선택 · 마스킹 후 JSON만 저장 · 원문 비보관 |
| G5 | **페이지별** AI 설명. 생년월일·원문 PDF를 LLM에 넣지 않음 |
| G6 | 상담 동의 시에만 연락처 PG 저장 |
| G7 | 전 분석 화면 “참고용·가입 권유 아님·견적 아님” |
| G8 | 사용자 프로필(생년월일·성별·지역 등) **PG 미저장** |

### 4.2 Non-Goals

- 관리자 웹, OCR, HITL, TypeScript, Turborepo, RDS  
- 실시간 개인 보험료 견적, 가입 유도  
- 자동차 연식 UI, 연령·성별 결합 사고율, 국민연금 통계

---

## 5. 사용자

| 페르소나 | MVP |
|----------|-----|
| 김초보 | 메인 입력 → 실손·자동차(또는 생명) 통계+쉬운 설명. 연락처 없음 |
| 이가족 | 위 + (선택) PDF |
| 운영 설계사 | 상담 메일만 (관리자 UI는 P1) |

---

## 6. User Journey (P0)

1. **메인:** 소개 + 생년월일·성별·지역(+선택 직업·유병력) — PG INSERT 없음  
2. **실손:** 보험나이 보정 → 캐시 조회 → 막대 등 + **하단 AI**  
3. **자동차:** 동일 프로필 재사용 → 통계 + **하단 AI**  
4. **생명:** 동일 → 가입건수·가입율 + **하단 AI**  
5. (선택) PDF → 마스킹  
6. (선택) 상담  

상세: [FLOWCHARTS.md](./FLOWCHARTS.md), [PUBLIC_API_PAGE_PLAN.md](./PUBLIC_API_PAGE_PLAN.md).

---

## 7. 데이터 전략

| 층 | 내용 | 저장 |
|----|------|------|
| Macro | OpenAPI 3종 배치 → PG `stats_*` + `public_cache_heads` | PG |
| 프로필 | 생년월일·성별·지역·(선택)직업·유병력 | **쿠키/클라이언트만** |
| Micro | PDF 마스킹 JSON, AI 요약(통계만), 상담 연락처 | PG (선택·동의 후) |

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
| UserProfile (비영속) | 쿠키/클라이언트. birth_date, sex, area_nm, (opt) job/health |
| PublicStatsCache | `public_cache_heads` + `public_sync_runs` + `stats_medical_rates` / `stats_auto_contracts` / `stats_life_join_status` — [ERD.md](./ERD.md) |
| UploadedDocument / MaskedCoverage | 선택. anon_session_key만, 원문 없음 |
| AiReport | scope별 요약. 생년월일 미포함 |
| ConsultationRequest | 동의 후 암호화 연락처만 |

---

## 12. 성공 지표

| 지표 | 확인 |
|------|------|
| 프로필 테이블/생년월일 컬럼 없음 | PG 스키마 |
| 실손→자동차(또는 생명) 순 통계 | UAT |
| 페이지 하단 AI(또는 폴백) | UAT |
| 상담 전 consultations 비어 있음 | DB |
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

## 14. 7일 일정 (요지)

| 날짜 | 산출물 |
|------|--------|
| 8/21 | Compose, ERD v1.4 스키마, FastAPI·Next 뼈대 |
| 8/22 | 메인(소개+입력), 보험나이 어댑터 |
| 8/23 | F-11 + 실손 통계 UI |
| 8/24 | 자동차·생명 통계 |
| 8/25 | PDF 워커 |
| 8/26 | 페이지별 AI, 상담, 고지 |
| 8/27 | E2E·데모 |

---

## 15. 차별점

- 탐색에 연락처 불필요 · 프로필 PG 비영속  
- 마스킹이 저장보다 앞섬  
- 상담 시점은 사용자  

---

## 16. 출처

OpenAPI 가이드 3종 · ChatGPT 공유(PAGE_PLAN 표) · 개인정보·금소법 취지 · 보험나이·상령일 규칙(사용자 확정).
