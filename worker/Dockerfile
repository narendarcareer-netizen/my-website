FROM node:24-alpine AS runner
WORKDIR /app
COPY worker/package.json worker/package-lock.json ./worker/
RUN cd worker && npm ci --omit=dev=false
COPY worker ./worker
COPY lib/jobs/platform ./lib/jobs/platform
WORKDIR /app/worker
ENV NODE_ENV=production
CMD ["npm","run","start"]
