# ---------- Etapa de build ----------
FROM node:20-alpine AS build

# Prisma necesita openssl para su motor (schema-engine / query-engine).
# Sin esto, "npx prisma generate" y "prisma migrate deploy" fallan en Alpine.
RUN apk add --no-cache openssl

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma

RUN npm install

COPY . .

RUN npx prisma generate
RUN npm run build

# ---------- Etapa final ----------
FROM node:20-alpine

RUN apk add --no-cache openssl

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
COPY prisma ./prisma

RUN npm install --omit=dev
RUN npx prisma generate

COPY --from=build /app/dist ./dist

RUN mkdir -p uploads/siniestros

EXPOSE 4000

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
