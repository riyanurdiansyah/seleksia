FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build Next.js
RUN npm run build

# --- RUNNER ---
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Salin folder hasil build dan dependencies yang diperlukan saja
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000
EXPOSE 6001
EXPOSE 6002

# Default command (akan di-override di docker-compose)
CMD ["npm", "start"]
