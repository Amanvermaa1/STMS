FROM node:22-alpine AS build
WORKDIR /app/server
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app/server
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/server/dist ./dist
COPY drizzle ./drizzle
EXPOSE 4000
CMD ["node", "dist/server.js"]
