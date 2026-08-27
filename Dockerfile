FROM node:22.23.2-alpine3.24 AS build

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN pnpm install --frozen-lockfile

COPY . .

ARG KAKAO_JS_PUBLIC_KEY=""
ARG VITE_OPERATING_MODE_OVERRIDE=""
ARG VITE_API_BASE_URL="/api"

RUN VITE_KAKAO_JAVASCRIPT_KEY="${KAKAO_JS_PUBLIC_KEY}" \
    VITE_OPERATING_MODE_OVERRIDE="${VITE_OPERATING_MODE_OVERRIDE}" \
    VITE_API_BASE_URL="${VITE_API_BASE_URL}" \
    pnpm run build

FROM nginx:1.30.4-alpine3.24

# The official nginx image renders files under /etc/nginx/templates at startup.
# Restrict substitution to this application setting so nginx variables such as
# $host and $request_uri remain intact in the generated configuration.
ENV BACKEND_UPSTREAM=http://boardbuddy-backend:8080 \
    NGINX_ENVSUBST_FILTER=^BACKEND_UPSTREAM$

COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/nginx-health | grep -qx healthy || exit 1
