FROM node:20-alpine AS build
WORKDIR /w
COPY package.json package-lock.json* ./
RUN npm ci || npm install
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /srv
COPY --from=build /w/dist ./app
COPY server/server.mjs ./server.mjs
ENV LAN=1 PORT=8080
EXPOSE 8080
CMD ["node", "server.mjs"]
