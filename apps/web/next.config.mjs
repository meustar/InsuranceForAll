import path from "node:path";
import { fileURLToPath } from "node:url";

const appDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(appDir, "../..");
const apiInternalUrl = (process.env.API_INTERNAL_URL || "http://localhost:8000").replace(/\/$/, "");

/** @type {import('next').NextConfig} */
const nextConfig = {
  typedRoutes: false,
  /**
   * Next 16는 outputFileTracingRoot와 turbopack.root를 같은 값으로 맞춘다.
   * 모노레포 루트를 쓰면 일부 상대 import가 깨질 수 있어 lib는 `@/`를 쓴다.
   */
  outputFileTracingRoot: repoRoot,
  turbopack: {
    root: repoRoot,
  },
  /**
   * 로컬 UAT가 127.0.0.1로 열리면 청크가 막혀 onSubmit이 없고 생년월일이 GET query로 샌다.
   */
  allowedDevOrigins: ["127.0.0.1", "localhost"],
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
