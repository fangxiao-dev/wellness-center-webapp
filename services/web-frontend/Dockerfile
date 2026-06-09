FROM node:24-alpine

WORKDIR /app/services/web-frontend

COPY services/web-frontend/package.json services/web-frontend/package-lock.json ./
RUN npm ci

COPY services/web-frontend/src /app/services/web-frontend/src
COPY web /app/web

EXPOSE 4100

CMD ["npm", "start"]
