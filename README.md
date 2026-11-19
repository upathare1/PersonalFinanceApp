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

`GET /api/healthz` provides a health check. Each calculator uses the common navigation, theme, and application shell. Page caching keeps inputs in memory when switching sections; reloading clears unsaved page state. Existing scenario import/export remains available. Tax estimates currently support single, full-year residents in Massachusetts, California, and New York.

Tax estimates support 2025, 2026 (the default), and 2027. Advanced Configurations retains separate overrides for each year, and JSON exports include the selected year. Older tax presets without a year are treated as 2026.

Federal figures are based on IRS revenue procedures [2024-40](https://www.irs.gov/pub/irs-drop/rp-24-40.pdf), [2025-32](https://www.irs.gov/pub/irs-drop/rp-25-32.pdf), and [2026-35](https://www.irs.gov/pub/irs-drop/rp-26-35.pdf), and the [SALT limits](https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section164). Wage bases come from the [Social Security Administration](https://www.ssa.gov/oact/cola/cbb.html). State figures come from [Massachusetts DOR](https://www.mass.gov/info-details/massachusetts-4-surtax-on-taxable-income) and the California FTB's [2025](https://www.ftb.ca.gov/about-ftb/newsroom/tax-news/2025/10.html) and [2026](https://www.ftb.ca.gov/about-ftb/newsroom/tax-news/2026/10.html) indexing releases. The 2027 state estimates carry forward 2026 values where new figures have not been published.

Results are estimates for planning purposes.

## Attribution

Derived from Upamanyu Pathare’s MortgageApp, CreditApp, and TaxApp, licensed under AGPL-3.0. See LICENSE. Original sources: https://github.com/upathare1/MortgageApp, https://github.com/upathare1/CreditApp, https://github.com/upathare1/TaxApp.

## New York and New York City

The New York estimate assumes a single full-year resident who cannot be claimed as a dependent. The optional full-year NYC resident checkbox adds city income tax, with state and city tax shown separately. Both affect total taxes and the automatic state/local withholding estimate. New saves include NYC residency and NY-specific inputs; legacy saves default to 2026 and NYC residency off.

State calculations use the official rounded schedules and tax-benefit recapture worksheets for 2025 and 2026, and enacted 2027 rules in [NY Tax Law §601](https://www.nysenate.gov/legislation/laws/TAX/601). See [2025 IT-201 instructions](https://www.tax.ny.gov/forms/current-forms/it/it201i.htm) and [2026 IT-2105 instructions](https://www.tax.ny.gov/pdf/current_forms/it/it2105i.pdf). School tax and household credits are modeled; other credits (including earned income credits), dependents, part-year/nonresident returns, Yonkers taxes, and self-employment MCTMT are excluded.

NY uses the $8,000 standard deduction unless the user enters a larger New York itemized deduction **after all IT-196 limits**. Federal mortgage interest, property taxes, and withholding entries do not automatically create a New York itemized deduction. Optional NY additions/subtractions cover amounts not represented in the common inputs. State-exempt interest entered above is already subtracted; do not enter it twice. NYC school tax credits are refundable, so net city tax can be negative. Bracket schedules are used for planning estimates rather than the low-income tax-table lookup, so small rounding differences from a filed return are possible.
