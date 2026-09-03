# Backend — Express + Postgres
FROM node:20-alpine

WORKDIR /app

# Copy package files first for better layer caching
COPY package*.json ./
RUN npm install --omit=dev

# Copy source
COPY src ./src
COPY scripts ./scripts
COPY prisma ./prisma

# Uploads dir for local file storage (S3 optional in production)
RUN mkdir -p uploads

ENV NODE_ENV=production
ENV PORT=10000

EXPOSE 10000

# Render/Railway set DATABASE_URL at runtime; run migrations on boot.
CMD ["sh", "-c", "node scripts/applyMigrations.js && node src/server.js"]
