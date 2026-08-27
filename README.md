# BoardBuddy Web

BoardBuddy Web is the frontend client for the BoardBuddy application. It is built using React, TypeScript, and Vite.

## Getting Started

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Set up environment variables:
   Copy `.env.example` to `.env` and configure any necessary keys.
   ```bash
   cp .env.example .env
   ```

3. Start the development server:
   ```bash
   pnpm run dev
   ```

## Scripts

- `pnpm run dev`: Starts the Vite development server.
- `pnpm run typecheck`: Type-checks the app.
- `pnpm run build`: Builds the app for production.
- `pnpm run lint`: Lints the source code using ESLint.
- `pnpm run preview`: Locally previews the production build.

## Production nginx image

The production image builds the Vite application and serves it with nginx. nginx also proxies
same-origin `/api/*` requests to the backend, provides SPA history fallback, caches hashed Vite
assets, and exposes `/nginx-health` for container health checks.

Build the image with the public Kakao JavaScript key required by the frontend:

```bash
docker build \
  --build-arg KAKAO_JS_PUBLIC_KEY='<public-javascript-key>' \
  -t boardbuddy-web:local .
```

When the web and backend containers share a Docker network and the backend container is named
`boardbuddy-backend`, the default upstream works without additional configuration:

```bash
docker run --rm \
  --network boardbuddy-network \
  -p 8081:80 \
  boardbuddy-web:local
```

Override the upstream when the backend uses another internal address:

```bash
docker run --rm \
  -e BACKEND_UPSTREAM='http://backend:8080' \
  -p 8081:80 \
  boardbuddy-web:local
```

`BACKEND_UPSTREAM` must remain an internal HTTP endpoint. Expose nginx rather than Spring Boot's
port 8080. Production internet traffic must terminate TLS before reaching this HTTP listener, or
nginx must be given a separate TLS server configuration and certificates for the final domain.
