FROM node:20-slim AS build

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-slim AS production

WORKDIR /app
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY server/ ./server/
COPY schema.sql ./schema.sql
COPY public/ ./public/

# Debug: 验证 default-avatar.png 是否存在
RUN ls -la /app/dist/default-avatar.png /app/public/default-avatar.png 2>&1 || echo "FILES NOT FOUND"

RUN mkdir -p /app/data

ENV NODE_ENV=production
ENV PORT=8080
ENV DB_PATH=/app/data/seedchat.db
EXPOSE 8080

CMD ["node", "server/index.js"]
