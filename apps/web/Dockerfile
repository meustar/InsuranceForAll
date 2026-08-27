# Next.js 16 production. Node 24 LTS. 외부 API 키·NEXT_PUBLIC_* 비밀을 굽지 않는다.
# 베이스는 공식 멀티아키. linux/amd64를 굽지 않는다.
FROM node:24-bookworm-slim AS deps

WORKDIR /workspace/apps/web

COPY apps/web/package.json apps/web/package-lock.json ./
RUN npm ci

FROM node:24-bookworm-slim AS builder

WORKDIR /workspace

ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /workspace/apps/web/node_modules ./apps/web/node_modules
COPY apps/web ./apps/web
COPY design ./design

WORKDIR /workspace/apps/web
RUN npm run build && npm prune --omit=dev

FROM node:24-bookworm-slim AS runner

WORKDIR /workspace/apps/web

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /workspace/design /workspace/design
COPY --from=builder /workspace/apps/web ./

USER node

EXPOSE 3000

CMD ["npm", "run", "start", "--", "--hostname", "0.0.0.0", "--port", "3000"]
