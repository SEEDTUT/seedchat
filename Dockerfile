FROM node:20-slim AS build

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-slim AS production

WORKDIR /app
RUN apt-get update && apt-get install -y python3 make g++ curl && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY server/ ./server/
COPY schema.sql ./schema.sql
COPY public/ ./public/

# Download initial database backup from GitHub release
RUN mkdir -p /app/data && \
    curl -sL -H "Accept: application/octet-stream" \
    -o /app/data/seedchat_initial.db \
    "https://github.com/SEEDTUT/seedchat/releases/download/db-backup-1784004294039/seedchat.db"

ENV NODE_ENV=production
ENV PORT=8080
ENV DB_PATH=/app/data/seedchat.db
EXPOSE 8080

CMD ["sh", "-c", "if [ ! -f /app/data/seedchat.db ]; then cp /app/data/seedchat_initial.db /app/data/seedchat.db; fi && node server/index.js"]
