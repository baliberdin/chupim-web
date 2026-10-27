# Build:  docker build --build-context chupim=../chupim -t chupim-web .
# The "chupim" build context provides the chupim lib while it is used as a
# local dependency (file:../chupim). Remove the lib stage once it is on npm.

FROM node:26-alpine AS lib
WORKDIR /opt/chupim
COPY --from=chupim package.json package-lock.json tsconfig.json tsconfig.build.json ./
RUN npm ci
COPY --from=chupim src ./src
RUN npm run build

FROM node:26-alpine AS build
COPY --from=lib /opt/chupim/package.json /opt/chupim/
COPY --from=lib /opt/chupim/dist /opt/chupim/dist
WORKDIR /opt/chupim-web
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev

FROM node:26-alpine
# tini as PID 1 forwards signals, so the container stops on SIGTERM
RUN apk add --no-cache tini
COPY --from=lib /opt/chupim/package.json /opt/chupim/
COPY --from=lib /opt/chupim/dist /opt/chupim/dist
WORKDIR /opt/chupim-web
COPY --from=build /opt/chupim-web/node_modules ./node_modules
COPY --from=build /opt/chupim-web/dist ./dist
COPY package.json LICENSE.txt ./
COPY views ./views
COPY public ./public

USER node
EXPOSE 3000
ENTRYPOINT ["/sbin/tini", "--", "node", "dist/start.js"]
