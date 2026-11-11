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

## Hosting policy

Hosted web deployments use Vercel only. `Dockerfile` and `nginx/` are retained historical tooling,
not production instructions. Do not add web containers on backend hosts.

## Vercel environments

Vercel is the authoritative hosted web deployment. Configure `main` as the Production Branch and
keep `develop` as a long-lived Preview branch. On Vercel Pro or Enterprise, `develop` can instead
track a custom environment named `staging`.

Configure these public build-time variables in the Vercel project:

| Vercel target | Git branch | Variable |
| --- | --- | --- |
| Production | `main` | `VITE_API_BASE_URL=https://api.boardbuddy.kr/api` |
| Preview, scoped to branch | `develop` | `VITE_API_BASE_URL=https://api-stg.boardbuddy.kr/api` |

Set `VITE_KAKAO_JAVASCRIPT_KEY` separately for Production and for the `develop` Preview branch.
Assign `boardbuddy.kr` and `www.boardbuddy.kr` only to Production. A persistent domain such as
`stg.boardbuddy.kr` can be assigned to `develop`; feature branches keep their generated Preview
URLs.

`vercel.json` deliberately contains no API rewrite. A Vercel build fails when
`VITE_API_BASE_URL` is absent, preventing a frontend from silently using the wrong backend.

## Architecture and validation

Use Node.js 22.13 or newer and the `pnpm@11.9.0` version pinned in `package.json`.
Run `pnpm test`, `pnpm typecheck`, `pnpm lint`, and `pnpm build` before submitting changes.
Start with the sibling backend's [service onboarding guide](https://github.com/SnowBuddySnow/BoardBuddy_Backend/blob/develop/docs/onboarding.md)
and [the HTTP endpoint contract](docs/endpoint-migration.md). `src/services` owns HTTP calls;
`src/types/api.ts` describes their payloads. The web never connects to MySQL directly.
