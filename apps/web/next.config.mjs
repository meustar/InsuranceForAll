import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");
const apiInternalUrl = (process.env.API_INTERNAL_URL || "http://localhost:8000").replace(/\/$/, "");

/** @type {import('next').NextConfig} */
const nextConfig = {
  typedRoutes: false,
  outputFileTracingRoot: repoRoot,
  /**
   * 로컬 UAT가 127.0.0.1로 열리면 청크가 막혀 onSubmit이 없고 생년월일이 GET query로 샌다.
   */
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  turbopack: {
    root: repoRoot,
  },
  /**
   * 브라우저는 같은 출처의 /api만 호출하고, 서버 내부 주소는 번들에 노출하지 않는다.
   */
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiInternalUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
