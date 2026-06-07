FROM node:20
WORKDIR /app
COPY server/package*.json ./
RUN npm ci --omit=dev
COPY server/dist/ ./dist/
ENV NODE_ENV=production
CMD ["node", "dist/index.js"]
