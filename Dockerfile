FROM node:16.14-alpine3.14

WORKDIR /opt/chupim-web
EXPOSE 3000

COPY ./bin /opt/chupim-web/bin
COPY ./public /opt/chupim-web/public
COPY ./routes /opt/chupim-web/routes
COPY ./views /opt/chupim-web/views
COPY ./web /opt/chupim-web/web
COPY ./app.js /opt/chupim-web/app.js
COPY ./index.js /opt/chupim-web/index.js
COPY ./start.js /opt/chupim-web/start.js
COPY ./package.json /opt/chupim-web/package.json
COPY ./package-lock.json /opt/chupim-web/package-lock.json
COPY ./LICENSE.txt /opt/chupim-web/LICENSE.txt

RUN ["npm", "install"]

ENTRYPOINT [ "npm", "start" ]
