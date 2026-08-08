# syntax=docker/dockerfile:1
FROM node:22-alpine

WORKDIR /app

# Shared /app/lib modules resolve their runtime packages from /app/node_modules.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Install worker runtime dependencies separately. tsx is a production dependency
# because it is the executable used by the worker start command.
COPY worker/package.json worker/package-lock.json ./worker/
RUN npm ci --prefix ./worker --omit=dev

# Preserve the paths used by worker imports:
#   /app/worker
#   /app/lib
COPY worker ./worker
COPY lib ./lib

WORKDIR /app/worker
ENV NODE_ENV=production

CMD ["npm", "run", "start"]
