FROM node:24-alpine

WORKDIR /app/services/web-backend

COPY services/web-backend/package.json services/web-backend/package-lock.json ./
RUN npm ci

COPY services/web-backend/src /app/services/web-backend/src
COPY web /app/web

EXPOSE 4102

CMD ["npm", "start"]
