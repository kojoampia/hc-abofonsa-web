# Angular 22 SSR (spec AD-5): the site's purpose is discovery, so pages render server-side for
# crawlable HTML and a fast first paint over Ghanaian mobile networks. That means a Node runtime,
# not a static nginx image — nginx sits in front of this container in production (Phase 20).
FROM node:24-alpine AS build
WORKDIR /src
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:24-alpine
RUN addgroup -S app && adduser -S app -G app
WORKDIR /app
COPY --from=build /src/dist/abofonsa-web ./dist/abofonsa-web
USER app
EXPOSE 4000
ENV NODE_ENV=production \
    PORT=4000
HEALTHCHECK --interval=30s --timeout=3s --start-period=20s \
  CMD wget -qO- http://localhost:4000/ >/dev/null || exit 1
CMD ["node", "dist/abofonsa-web/server/server.mjs"]
