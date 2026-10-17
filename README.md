# Personal Finance

One Nuxt application for mortgage comparisons, credit card rewards, and income tax estimates. The calculators, domain logic, and server endpoints are integrated into this codebase; the original apps are not runtime dependencies.

## Development

Requires Node.js 24 and npm.

```sh
npm ci
npm run dev
```

## Checks and production

```sh
npm run typecheck
npm run lint
npm run build
node .output/server/index.mjs
```

The server listens on port 3000 by default. A single Dockerfile builds and serves the entire application:

```sh
docker build -t personal-finance .
docker run --rm -p 3000:3000 personal-finance
```

## Calculators

| Page | Calculation endpoint | Source |
| --- | --- | --- |
| `/mortgage` | `POST /api/mortgage` | MortgageApp |
| `/credit/card-value` and `/credit/wallet-maximizer` | `POST /api/credit` | CreditApp |
| `/taxes` | `POST /api/taxes` | TaxApp |

`GET /api/healthz` provides a health check. Each calculator uses the common navigation, theme, and application shell. Page caching keeps inputs in memory when switching sections; reloading clears unsaved page state. Existing scenario import/export remains available. Tax estimates currently support single filers in Massachusetts and California.

The existing calculator formulas and catalogs were migrated without changes. This consolidation does not independently validate their financial assumptions or update tax tables and card offers. Results are estimates for planning purposes.

## Attribution

Derived from Upamanyu Pathare’s MortgageApp, CreditApp, and TaxApp, licensed under AGPL-3.0. See LICENSE. Original sources: https://github.com/upathare1/MortgageApp, https://github.com/upathare1/CreditApp, https://github.com/upathare1/TaxApp.
