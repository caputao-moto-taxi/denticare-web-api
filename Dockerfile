FROM node:23-slim
RUN npm install -g @nestjs/cli@10.1.17

USER node

WORKDIR /home/node/app

COPY --chown=node:node . .

RUN npm install

EXPOSE 3000

COPY --chown=node:node entrypoint.sh /home/node/app/
RUN chmod +x /home/node/app/entrypoint.sh

CMD ["/home/node/app/entrypoint.sh"]
