# Build:  docker build -t chupim-web .

FROM node:26-alpine AS build
WORKDIR /opt/chupim-web
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
COPY client ./client
COPY views ./views
COPY public ./public
RUN npm run build && npm prune --omit=dev

FROM node:26-alpine
# tini as PID 1 forwards signals, so the container stops on SIGTERM
RUN apk add --no-cache tini
WORKDIR /opt/chupim-web
COPY --from=build /opt/chupim-web/node_modules ./node_modules
COPY --from=build /opt/chupim-web/dist ./dist
COPY package.json LICENSE.txt ./
COPY views ./views
COPY --from=build /opt/chupim-web/public ./public

USER node
EXPOSE 3000
ENTRYPOINT ["/sbin/tini", "--", "node", "dist/start.js"]
