FROM node:23-slim
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*
RUN npm install -g npm@11.7.0 @nestjs/cli@10.1.17 pnpm@10.2.1

USER node

WORKDIR /home/node/app

COPY --chown=node:node . .

RUN CI=true DATABASE_URL=postgresql://root:root@localhost:5432/root pnpm install --frozen-lockfile

EXPOSE 3000

COPY --chown=node:node entrypoint.sh /home/node/app/
RUN chmod +x /home/node/app/entrypoint.sh

CMD ["/home/node/app/entrypoint.sh"]
