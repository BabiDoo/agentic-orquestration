# Multi-stage Dockerfile para AdzHub Microkernel Harness
FROM node:22-alpine AS builder

WORKDIR /app

# Copia manifests de pacotes
COPY package*.json ./
COPY packages/contracts/package*.json ./packages/contracts/
COPY packages/policy/package*.json ./packages/policy/
COPY packages/data/package*.json ./packages/data/
COPY packages/tools/package*.json ./packages/tools/
COPY packages/verify/package*.json ./packages/verify/
COPY packages/apps/creative-analysis/package*.json ./packages/apps/creative-analysis/
COPY packages/runtime/package*.json ./packages/runtime/
COPY apps/web/package*.json ./apps/web/

RUN npm ci

# Copia código-fonte e compila
COPY . .
RUN npm run build

# Stage de Produção
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

COPY --from=builder /app ./

EXPOSE 3000

# Healthcheck interno do container
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

CMD ["npm", "run", "start", "-w", "@adzhub/web"]
