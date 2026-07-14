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

RUN mkdir -p /app/data

# Download the database from GitHub release backup
ARG GH_TOKEN
RUN apt-get update && apt-get install -y curl && \
    curl -sL -H "Authorization: token $GH_TOKEN" \
    -H "Accept: application/octet-stream" \
    -o /app/data/seedchat.db \
    "https://api.github.com/repos/SEEDTUT/seedchat/releases/assets/476280238" && \
    rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=8080
ENV DB_PATH=/app/data/seedchat.db
EXPOSE 8080

CMD ["node", "server/index.js"]
