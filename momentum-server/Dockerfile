# ============================================
# Momentum Server - Dockerfile
# ============================================

# Development stage
FROM node:20-alpine AS development

WORKDIR /app

# Install dependencies for native modules (argon2)
RUN apk add --no-cache python3 make g++

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

COPY . .

RUN npx prisma generate

EXPOSE 3001

CMD ["npm", "run", "start:dev"]

# ============================================
# Production build stage
# ============================================
FROM node:20-alpine AS build

WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package*.json ./
COPY --from=development /app/node_modules ./node_modules
COPY . .

RUN npx prisma generate
RUN npm run build

RUN npm ci --only=production && npm cache clean --force

# ============================================
# Production stage
# ============================================
FROM node:20-alpine AS production

WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package*.json ./
COPY --from=build /app/prisma ./prisma

EXPOSE 3001

CMD ["npm", "run", "start:prod"]

