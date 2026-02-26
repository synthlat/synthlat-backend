FROM node:24-alpine

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm i

COPY config.discremy.js ./
COPY src/ ./src/

CMD ["npm", "start"]