# 1단계: 빌드 스테이지
FROM node:20-alpine AS builder
WORKDIR /app

# 빌드 시 필요한 시스템 라이브러리 설치 (알파인용)
RUN apk add --no-cache openssl libc6-compat

COPY package*.json ./
COPY prisma ./prisma/

RUN npm install

COPY . .

# Prisma 클라이언트 생성 및 빌드
RUN npx prisma generate
RUN npm run build

# 2단계: 실행 스테이지
FROM node:20-alpine AS runner
WORKDIR /app

# [핵심] 실행 환경에서도 반드시 라이브러리 설치 필요
# libc6-compat는 Prisma 엔진이 알파인에서 돌아가게 해주는 핵심 라이브러리입니다.
RUN apk add --no-cache openssl libc6-compat

ENV NODE_ENV=production

# 빌드 스테이지 결과물 복사
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/src ./src

# 실행 환경의 바이너리 재생성
RUN npx prisma generate

EXPOSE 3001

CMD ["node", "dist/server.js"]