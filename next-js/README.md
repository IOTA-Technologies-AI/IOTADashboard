## Prerequisites

- Node.js >=20 (Recommended)

## Installation

**Using Yarn (Recommended)**

```sh
yarn install
yarn dev
```

**Using Npm**

```sh
npm i
npm run dev
```

## Build

```sh
yarn build
# or
npm run build
```

## Mock server

By default we provide demo data from : `https://api-dev-minimal-[version].vercel.app`

To set up your local server:

- **Guide:** [https://docs.minimals.cc/mock-server](https://docs.minimals.cc/mock-server).

- **Resource:** [Download](https://www.dropbox.com/scl/fo/bopqsyaatc8fbquswxwww/AKgu6V6ZGmxtu22MuzsL5L4?rlkey=8s55vnilwz2d8nsrcmdo2a6ci&dl=0).

## Full version

## Starter version

## Deployment trigger: updated README on 2026-01-04 to kick off a fresh Vercel build.

**NOTE:**
_When copying folders remember to also copy hidden files like .env. This is important because .env files often contain environment variables that are crucial for the application to run correctly._

## Environment variables

Create a `.env.local` at the project root. Minimum needed for Supabase + API integration:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_API_BASE_URL=https://your-api-base.example.com
NEXT_PUBLIC_SERVER_URL=https://your-server-url.example.com    # optional; used for links
NEXT_PUBLIC_ASSETS_DIR=/assets                                # optional; CDN path override
NEXT_PUBLIC_APP_ENV=development|staging|production             # optional; telemetry/env tagging
NEXT_PUBLIC_COST_CENTER_API_ENABLED=false                     # set true to call cost-center APIs
```

Optional providers (fill only if you use them):

- Firebase: `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`, `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`, `NEXT_PUBLIC_FIREBASE_APPID`, `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`
- AWS Amplify: `NEXT_PUBLIC_AWS_AMPLIFY_USER_POOL_ID`, `NEXT_PUBLIC_AWS_AMPLIFY_USER_POOL_WEB_CLIENT_ID`, `NEXT_PUBLIC_AWS_AMPLIFY_REGION`
- Auth0: `NEXT_PUBLIC_AUTH0_CLIENT_ID`, `NEXT_PUBLIC_AUTH0_DOMAIN`, `NEXT_PUBLIC_AUTH0_CALLBACK_URL`
- Azure AD app roles (optional overrides; defaults baked in): `NEXT_PUBLIC_AZURE_ROLE_REGULAR`, `NEXT_PUBLIC_AZURE_ROLE_MANAGER`, `NEXT_PUBLIC_AZURE_ROLE_ADMIN`, `NEXT_PUBLIC_AZURE_ROLE_SUPERADMIN`

Notes:

- Role mapping works automatically for your current Azure app roles; env overrides are only needed if you add new GUIDs/values later.
- After changing role assignments in Entra ID, users must sign out/in so new roles appear in the token.
