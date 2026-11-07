ARG NODE_VERSION=20.18.0

################################################################################
# 1. Base stage
FROM node:${NODE_VERSION}-alpine as base
WORKDIR /usr/src/app

################################################################################
# 2. Dependencies stage (installs all packages including devDependencies)
FROM base as deps
RUN --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=package-lock.json,target=package-lock.json \
    --mount=type=cache,target=/root/.npm \
    npm ci

################################################################################
# 3. Build stage (copies source code and builds Next.js)
FROM deps as build
ARG NEXT_PUBLIC_API_URL=http://localhost:8000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
COPY . .
RUN npm run build

################################################################################
# 4. Final production stage (only copies what is needed to run)
FROM base as final
ENV NODE_ENV=production

# Copy files needed at runtime from previous stages with node user ownership
COPY --chown=node:node package.json .
COPY --chown=node:node --from=deps /usr/src/app/node_modules ./node_modules
COPY --chown=node:node --from=build /usr/src/app/.next ./.next
COPY --chown=node:node --from=build /usr/src/app/public ./public
COPY --chown=node:node --from=build /usr/src/app/next.config.ts ./

USER node

EXPOSE 3000

CMD ["npm", "start"]