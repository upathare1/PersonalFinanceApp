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

`GET /api/healthz` provides a health check. Each calculator uses the common navigation, theme, and application shell. Page caching keeps inputs in memory when switching sections; reloading clears unsaved page state. Existing scenario import/export remains available. Tax estimates support single, full-year residents in all 50 states.

Tax estimates support 2025, 2026 (the default), and 2027. Advanced Configurations retains separate overrides for each year, and JSON exports include the selected year. Older tax presets without a year are treated as 2026.

Federal figures are based on IRS revenue procedures [2024-40](https://www.irs.gov/pub/irs-drop/rp-24-40.pdf), [2025-32](https://www.irs.gov/pub/irs-drop/rp-25-32.pdf), and [2026-35](https://www.irs.gov/pub/irs-drop/rp-26-35.pdf), and the [SALT limits](https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section164). Wage bases come from the [Social Security Administration](https://www.ssa.gov/oact/cola/cbb.html). State figures come from [Massachusetts DOR](https://www.mass.gov/info-details/massachusetts-4-surtax-on-taxable-income) and the California FTB's [2025](https://www.ftb.ca.gov/about-ftb/newsroom/tax-news/2025/10.html) and [2026](https://www.ftb.ca.gov/about-ftb/newsroom/tax-news/2026/10.html) indexing releases. The 2027 state estimates carry forward 2026 values where new figures have not been published.

Results are estimates for planning purposes.

## Attribution

Derived from Upamanyu Pathare’s MortgageApp, CreditApp, and TaxApp, licensed under AGPL-3.0. See LICENSE. Original sources: https://github.com/upathare1/MortgageApp, https://github.com/upathare1/CreditApp, https://github.com/upathare1/TaxApp.

## State income tax coverage

Calculator and Compare support all 50 states for single, full-year residents who cannot be claimed as a dependent. Compare also includes a separate NYC resident scenario. State schedules are individually editable in `shared/utils/state-income-tax-rules.ts`. Calculation rules that need more than a rate schedule are in `server/utils/other-state-tax.ts`. MA, CA, and NY/NYC retain their existing calculation paths. There is no external tax service or model dependency.

The new state estimates use the applicable marginal schedule, supported deductions and exemptions, and selected credits and adjustments. Examples include Alabama and Oregon's federal tax deductions, Connecticut's tax-benefit adjustments, Missouri's capital-gains subtraction, New Jersey's treatment of wages and health savings contributions, and Washington's capital-gains excise. The model uses marginal formulas for planning. It does not reproduce every state return, tax table, credit, rebate, alternative minimum tax, or itemized-deduction worksheet. Local income taxes other than NYC and state payroll premiums are outside the comparison. Some preferential gain rules treat the combined long-term gains and qualified dividends input as capital gains. For Washington, use the separate eligible-gains field to exclude dividends and exempt assets. State years are marked provisional when they use prior-year figures or preliminary schedules. The [state-by-state audit](STATE-TAX-AUDIT.md) records the source checks, implemented corrections, and unresolved amounts.

The [Federation of Tax Administrators’ forms directory](https://taxadmin.org/state-tax-forms/) links each state’s agency and forms. Schedule values were cross-checked against published [2025](https://taxfoundation.org/data/all/state/state-income-tax-rates/) and [2026](https://taxfoundation.org/data/all/state/state-income-tax-rates-2026/) summaries and available state instructions. Examples of primary references used for state-specific rules are below.

| State | Primary reference |
| --- | --- |
| Alabama | [Form 40 instructions](https://www.revenue.alabama.gov/wp-content/uploads/2026/01/25f40bk.pdf) |
| Arkansas | [2025 resident return instructions](https://www.dfa.arkansas.gov/wp-content/uploads/2025_AR1000F_and_AR1000NR_Instructions.pdf), [2026 estimated tax](https://www.dfa.arkansas.gov/wp-content/uploads/2026_Final_AR1000ES_2.pdf) |
| Colorado | [Income Tax Guide](https://tax.colorado.gov/individual-income-tax-guide), [Amendment 87 schedules](https://www.leg.colorado.gov/ballots/graduated-income-tax-2/files/blue-book) |
| Connecticut | [Form CT-1040 instructions](https://portal.ct.gov/-/media/drs/forms/2025/income/2025-ct-1040-instructions_1225.pdf) |
| Georgia | [Department of Revenue tax updates](https://dor.georgia.gov/taxes/important-tax-updates) |
| Hawaii | [Department of Taxation FAQ](https://tax.hawaii.gov/FAQ/) |
| Idaho | [Rate schedule](https://tax.idaho.gov/taxes/income-tax/individual-income/individual-income-tax-rate-schedule/) |
| Indiana | [Individual rates](https://www.in.gov/dor/resources/tax-rates-and-reports/rates-fees-and-penalties/) |
| Kentucky | [2026 standard deduction](https://revenue.ky.gov/News/Pages/Kentucky-DOR-Announces-2026-Standard-Deduction.aspx), [2027 standard deduction](https://revenue.ky.gov/News/Pages/Kentucky-DOR-Announces-2027-Standard-Deduction.aspx) |
| Maine | [2026 rate computation](https://www.maine.gov/revenue/sites/maine.gov.revenue/files/2026-05/ind_tax_rate_sched_2026_rev.pdf) |
| Maryland | [2025 resident booklet](https://www.marylandcomptroller.gov/content/dam/mdcomp/tax/instructions/2025/resident-booklet.pdf), [capital gains bulletin](https://www.marylandcomptroller.gov/legal-library/tb-58-dec-29-2025.html) |
| Minnesota | [2026 M1 instructions](https://www.revenue.state.mn.us/sites/default/files/2026-11/m1-inst-26_0.pdf), [net investment income tax](https://www.revenue.state.mn.us/mndor-pp/20626) |
| Missouri | [Capital-gains subtraction](https://dor.mo.gov/faq/taxation/individual/capital-gains-subtraction.html) |
| Nebraska | [Enacted rate changes](https://revenue.nebraska.gov/about/2023-nebraska-legislative-changes) |
| New Jersey | [NJ-1040 instructions](https://www.nj.gov/treasury/taxation/pdf/current/1040i.pdf) |
| North Dakota | [2026 estimated tax schedules](https://www.tax.nd.gov/sites/www/files/documents/forms/individual/2025-iit/28709-form-nd-1es-2026.pdf) |
| Ohio | [Annual tax rates](https://tax.ohio.gov/individual/file-now/annual-tax-rates), [Ohio Revised Code §5747.02](https://codes.ohio.gov/ohio-revised-code/chapter-5747) |
| Oregon | [2025 resident tax guide](https://www.oregon.gov/obtp/Documents/2025%20OR%2017.pdf) |
| Rhode Island | [Inflation adjustments](https://tax.ri.gov/sites/g/files/xkgbur541/files/2025-11/ADV_2025_22_Inflation_Adjustments.pdf) |
| South Carolina | [2026 Act 110 guidance](https://dor.sc.gov/sites/dor/files/policies/IL26-20.pdf) |
| Washington | [Capital gains rates](https://dor.wa.gov/about/statistics-reports/tax-manuals/tax-reference-manual/capital-gains-tax), [annual deductions](https://dor.wa.gov/taxes-rates/other-taxes/capital-gains-tax/do-you-owe-capital-gains-tax) |
| West Virginia | [2026 income tax rate cut](https://tax.wv.gov/Individuals/Pages/PersonalIncomeTaxReductionBill.aspx) |
| Wisconsin | [2025 Form 1 instructions](https://www.revenue.wi.gov/TaxForms2025/2025-Form1-Inst.pdf), [2026 rate schedules](https://www.revenue.wi.gov/TaxForms2026/2026-Form1-ES-Inst.pdf) |

## New York and New York City

The New York estimate assumes a single full-year resident who cannot be claimed as a dependent. The optional full-year NYC resident checkbox adds city income tax, with state and city tax shown separately. Both affect total taxes and the automatic state/local withholding estimate. New saves include NYC residency and NY-specific inputs; legacy saves default to 2026 and NYC residency off.

State calculations use the official rounded schedules and tax-benefit recapture worksheets for 2025 and 2026, and enacted 2027 rules in [NY Tax Law §601](https://www.nysenate.gov/legislation/laws/TAX/601). See [2025 IT-201 instructions](https://www.tax.ny.gov/forms/current-forms/it/it201i.htm) and [2026 IT-2105 instructions](https://www.tax.ny.gov/pdf/current_forms/it/it2105i.pdf). School tax and household credits are modeled; other credits (including earned income credits), dependents, part-year/nonresident returns, Yonkers taxes, and self-employment MCTMT are excluded.

NY uses the $8,000 standard deduction unless the user enters a larger New York itemized deduction **after all IT-196 limits**. Federal mortgage interest, property taxes, and withholding entries do not automatically create a New York itemized deduction. Optional NY additions/subtractions cover amounts not represented in the common inputs. State-exempt interest entered above is already subtracted; do not enter it twice. NYC school tax credits are refundable, so net city tax can be negative. Bracket schedules are used for planning estimates rather than the low-income tax-table lookup, so small rounding differences from a filed return are possible.
