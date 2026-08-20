# 모두의 보험 (Insurance For All)

**공식 프로젝트 루트:** `c:\workspace\cursor-dev\Insurance_For_All`

**문서 버전:** MVP 1.2 (2026-08-21)  
**데모 마감:** 2026-08-27

---

## 읽을 순서 · SSOT

| 순서 | 파일 | 역할 |
|------|------|------|
| 1 | [PRD.md](./PRD.md) | 제품 정의·목표·비영속·여정 |
| 2 | [FUNCTIONAL_SPEC.md](./FUNCTIONAL_SPEC.md) | F-ID · API · UAT |
| 3 | [FLOWCHARTS.md](./FLOWCHARTS.md) | P0 흐름 |
| 4 | [PUBLIC_API_PAGE_PLAN.md](./PUBLIC_API_PAGE_PLAN.md) | 3API 입력·인사이트·그래프·AI (**상세 SSOT**) |
| 5 | [ERD.md](./ERD.md) | 스키마 v1.4+ (**물리 SSOT**) |
| 6 | [TECH_STACK.md](./TECH_STACK.md) | 버전·인프라 |

충돌 시: **PAGE_PLAN(도메인) · ERD(스키마) · PRD/스펙 1.2(제품)** 를 구버전보다 우선한다.

---

## 한 줄 요약

이름·연락처 없이 **생년월일·성별·지역**으로 보험나이를 맞춘 뒤, 공공 통계를 **실손 → 자동차 → 생명** 순으로 보고, 페이지마다 쉬운 AI 설명을 받으며, (선택) PDF·상담만 추가하는 웹입니다.  
**사용자 입력은 PostgreSQL에 저장하지 않습니다.** 가입·청약·실시간 견적은 하지 않습니다.

---

## Cursor 주의

- 이 폴더만 연 상태에서 작업  
- 프론트는 **JavaScript** (`.ts`/`.tsx` 금지)  
- 프로필을 `POST /profiles`로 PG에 쌓는 구설계는 **폐기** (FUNCTIONAL_SPEC 1.2)  
