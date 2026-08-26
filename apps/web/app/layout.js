import { AppShell } from "../components/AppShell";
import "./globals.css";

export const metadata = {
  title: "모두의 보험",
  description: "공공 통계 기반 보험 의사결정 지원. 견적·가입 권유가 아닙니다.",
};

/**
 * 공통 크롬만 감싼다. 공공 API 키와 프로필은 여기에 두지 않는다.
 */
export default function RootLayout({ children }) {
  return (
    <html lang="ko" className="h-full">
      <body className="min-h-full antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
