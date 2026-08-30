import { OpsLoginPage } from "../../../components/ops/OpsLoginPage";

/**
 * 운영자만 쓰는 로그인. 사용자 통계 Header에 링크하지 않는다.
 */
export default function OpsLoginRoute() {
  return <OpsLoginPage />;
}
