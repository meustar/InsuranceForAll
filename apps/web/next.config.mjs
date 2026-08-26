import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");
const apiInternalUrl = (process.env.API_INTERNAL_URL || "http://localhost:8000").replace(/\/$/, "");

/** @type {import('next').NextConfig} */
const nextConfig = {
  typedRoutes: false,
  outputFileTracingRoot: repoRoot,
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
