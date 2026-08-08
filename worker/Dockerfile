# syntax=docker/dockerfile:1
FROM node:22-alpine

WORKDIR /app

# Install the worker package dependencies first so this layer can be cached.
# The start script uses tsx, so worker devDependencies are intentionally installed.
COPY worker/package.json worker/package-lock.json ./worker/
RUN npm ci --prefix ./worker --include=dev

# Preserve the paths used by worker imports:
#   /app/worker
#   /app/lib
COPY worker ./worker
COPY lib ./lib

WORKDIR /app/worker
ENV NODE_ENV=production

CMD ["npm", "run", "start"]
