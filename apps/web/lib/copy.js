/** 메인 고지·허브 카피. 과장·가입 권유 문구를 쓰지 않는다. */

export const BANNED_COPY_SNIPPETS = Object.freeze([
  "개인정보 미수집",
  "개인정보를 수집하지 않",
  "개인정보를 수집하지 않습니다",
  "추천",
  "최적",
  "1위",
  "순위",
]);

export const SERVICE_INTRO =
  "공공 통계로 보험을 이해하는 참고용 화면입니다. 견적·가입을 권하지 않으며, 이 단계에서 연락처는 받지 않습니다.";

export const PRIVACY_NOTICE_TITLE = "프로필 처리 고지";

export const PRIVACY_NOTICE_PARAGRAPHS = Object.freeze([
  "통계를 연령·성별·지역 조건에 맞춰 보여 주기 위해 생년월일, 성별, 지역을 처리합니다. 비영속이어도 개인정보 처리입니다.",
  "브라우저 탭의 sessionStorage에만 두고, 이 서비스의 PostgreSQL에는 프로필을 저장하지 않습니다. 통계를 요청할 때 서버는 보험나이를 계산한 뒤 생년월일 원문을 보관하지 않습니다.",
  "탭을 닫거나 초기화하면 삭제됩니다. 30분 동안 조작이 없으면 세션 프로필을 지웁니다.",
  "PDF·리포트의 같은 세션 접근을 위해 프로필을 담지 않은 HttpOnly 익명 쿠키를 사용합니다. 이 쿠키는 API 이용 중 갱신되며 30분 비활성 또는 프로필 초기화 시 만료됩니다.",
  "입력을 거부하면 통계 허브와 상단 스코프 탭을 이용할 수 없습니다. 직업·유병력·이름·주민등록번호·이메일은 이 화면에서 받지 않습니다.",
]);

export const HUB_CARDS = Object.freeze([
  {
    href: "/stats/health",
    title: "실손",
    message: "같은 연령·유형·담보의 상품 보험료 비교",
    metrics: "상품 보험료 비교·분포를 참고합니다. 견적이 아닙니다.",
  },
  {
    href: "/stats/auto",
    title: "자동차",
    message: "나와 비슷한 조건의 가입대수·집계 보험료",
    metrics: "가입대수·경과보험료·대당평균을 참고합니다. 견적이 아닙니다.",
  },
  {
    href: "/stats/life",
    title: "생명",
    message: "같은 연령·성별·지역의 보험종류별 가입건수·가입율",
    metrics: "종류별 가입건수(건)와 가입율을 참고합니다. 견적이 아닙니다.",
  },
]);
