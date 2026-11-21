import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { setTimeout } from 'node:timers/promises'

const port = 3198
const base = `http://127.0.0.1:${port}`
const server = spawn(process.execPath, ['.output/server/index.mjs'], {
  env: { ...process.env, HOST: '127.0.0.1', PORT: String(port) },
  stdio: ['ignore', 'pipe', 'pipe']
})
let output = ''
server.stdout.on('data', (chunk) => {
  output += chunk
})
server.stderr.on('data', (chunk) => {
  output += chunk
})

async function post(path, body) {
  return fetch(`${base}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
}

try {
  let ready = false
  for (let attempt = 0; attempt < 100; attempt++) {
    if (server.exitCode !== null) throw new Error(output)
    try {
      const health = await fetch(`${base}/api/healthz`)
      if (health.ok) {
        ready = true
        break
      }
    } catch {
      // Retry while the production server is starting.
    }
    await setTimeout(200)
  }
  assert.ok(ready, `Server failed to start: ${output}`)
  for (const path of ['/', '/mortgage', '/credit/card-value', '/credit/wallet-maximizer', '/taxes']) {
    const response = await fetch(`${base}${path}`)
    const html = await response.text()
    assert.equal(response.status, 200, `${path}: ${html}\n${output}`)
    assert.ok(html.includes('Personal Finance'), `Shared shell missing on ${path}`)
    assert.ok(!html.includes('<iframe'), `Unexpected embedded app on ${path}`)
  }
  assert.equal((await fetch(`${base}/credit/unknown`)).status, 404)
  const mortgageResponse = await post('/api/mortgage', {})
  assert.equal(mortgageResponse.status, 200)
  const mortgage = await mortgageResponse.json()
  assert.equal(mortgage.months, 360)
  assert.ok(Number.isFinite(mortgage.buyer.terminalValue))
  assert.ok(Number.isFinite(mortgage.renter.terminalValue))
  assert.equal((await post('/api/mortgage', { homePrice: 'invalid' })).status, 400)
  const creditResponse = await post('/api/credit', {
    spending: { restaurantDelivery: 450, travel: 250, travelPortal: 300, groceries: 650, remaining: 900 },
    walletCardIds: ['chase-sapphire-preferred', 'chase-freedom-unlimited'],
    optimizeWallet: true
  })
  assert.equal(creditResponse.status, 200)
  const credit = await creditResponse.json()
  assert.equal(credit.totalMonthlySpend, 2550)
  assert.ok(Number.isFinite(credit.netAnnualValue))
  assert.ok(credit.optimalWallet.cardIds.length > 0)
  for (const taxState of ['MA', 'CA']) {
    const response = await post('/api/taxes', { taxState, income: { wageIncome: 100000 } })
    assert.equal(response.status, 200)
    const taxes = await response.json()
    assert.ok(taxes.totalTax > 0)
    assert.ok(taxes.netIncome > 0 && taxes.netIncome < 100000)
    assert.ok(Number.isFinite(taxes.marginalTaxRateWageIncome))
  }
  async function taxesFor(taxYear, taxState, wageIncome, calculatorConfig) {
    const response = await post('/api/taxes', { taxYear, taxState, income: { wageIncome }, calculatorConfig })
    assert.equal(response.status, 200)
    return response.json()
  }
  const expected = [
    { year: 2025, federalTax: 13449, caTax: 5054.98, wageBase: 176100, maFloor: 1083150 },
    { year: 2026, federalTax: 13170, caTax: 4910.86, wageBase: 184500, maFloor: 1107750 },
    { year: 2027, federalTax: 12889.5, caTax: 4910.86, wageBase: 192300, maFloor: 1107750 }
  ]
  for (const { year, federalTax, caTax, wageBase, maFloor } of expected) {
    const ca = await taxesFor(year, 'CA', 100000)
    assert.ok(Math.abs(ca.federalTax - federalTax) < 0.01, `${year} federal tax`)
    assert.ok(Math.abs(ca.stateTax - caTax) < 0.02, `${year} California tax`)
    const ma = await taxesFor(year, 'MA', 1200000)
    const expectedFica = wageBase * 0.062 + 1200000 * 0.0145 + 1000000 * 0.009
    assert.ok(Math.abs(ma.ficaTax - expectedFica) < 0.01, `${year} Social Security wage base`)
    assert.ok(Math.abs(ma.stateTax - (ma.stateTaxableIncome * 0.05 + (ma.stateTaxableIncome - maFloor) * 0.04)) < 0.01, `${year} MA surtax threshold`)
  }
  assert.deepEqual(await taxesFor(undefined, 'CA', 100000), await taxesFor(2026, 'CA', 100000))
  const overridden = await taxesFor(2027, 'MA', 100000, { federalStandardDeduction: 20000 })
  assert.equal(overridden.federalOrdinaryIncome, 80000)
  async function newYorkResult(taxYear, nycResident = false, extra = {}) {
    const response = await post('/api/taxes', { taxYear, taxState: 'NY', nycResident, income: { wageIncome: 100000 }, ...extra })
    assert.equal(response.status, 200)
    return response.json()
  }
  for (const [year, expectedTax] of [[2025, 4952], [2026, 4860.65], [2027, 4768.3]]) {
    const outsideCity = await newYorkResult(year)
    const city = await newYorkResult(year, true)
    assert.equal(outsideCity.stateTaxableIncome, 92000)
    assert.ok(Math.abs(outsideCity.stateTax - expectedTax) < 0.01, `NY ${year} schedule`)
    assert.equal(outsideCity.cityTax, 0)
    assert.ok(Math.abs(city.cityTax - 3174.52) < 0.01, 'NYC school credits and income tax')
    assert.equal(city.stateTax, outsideCity.stateTax)
    assert.ok(Math.abs(city.totalTax - outsideCity.totalTax - city.cityTax) < 0.01)
    assert.ok(Math.abs(outsideCity.netIncome - city.netIncome - city.cityTax) < 0.01)
  }
  const recapture = await newYorkResult(2026, false, { income: { wageIncome: 150000 } })
  assert.ok(Math.abs(recapture.stateTax - 8291.19545) < 0.01, 'NY recapture phase-in')
  assert.ok(Math.abs((await newYorkResult(2026, false, { income: { wageIncome: 200000 } })).stateTax - 11328) < 0.01, 'Full first-tier recapture')
  for (const year of [2025, 2026, 2027]) {
    assert.ok(Math.abs((await newYorkResult(year, false, { income: { wageIncome: 300000 } })).stateTax - 20002.1) < 0.01, 'Second recapture tier')
  }
  const nyGains = await newYorkResult(2026, false, { income: { longTermCapitalGains: 100000 } })
  assert.equal(nyGains.stateTaxableIncome, 92000)
  const itemizedNy = await newYorkResult(2026, false, { newYorkInputs: { itemizedDeduction: 20000, additions: 1000, subtractions: 2000 } })
  assert.equal(itemizedNy.stateTaxableIncome, 79000)
  const noCityOnMa = await post('/api/taxes', { taxState: 'MA', nycResident: true, income: { wageIncome: 100000 } })
  assert.equal((await noCityOnMa.json()).cityTax, 0)
  assert.deepEqual(await newYorkResult(undefined), await newYorkResult(2026))
  const comparisonScenario = {
    taxYear: 2027,
    taxState: 'NY',
    nycResident: true,
    income: { wageIncome: 170000, taxableBenefits: 2500, interestIncome: 2000 },
    adjustments: { retirement401kContributions: 12000, healthInsurancePayments: 3000 },
    hsaBreakdown: { employeeContributions: 1800, employerContributions: 500 },
    optionalDeductions: { mortgageInterest: 14000, stateTaxesWithholding: 800, massachusettsRent: 3000 }
  }
  const calculatorResponse = await post('/api/taxes', comparisonScenario)
  const comparisonResponse = await post('/api/taxes/compare', comparisonScenario)
  assert.equal(calculatorResponse.status, 200)
  assert.equal(comparisonResponse.status, 200)
  const calculator = await calculatorResponse.json()
  const comparison = await comparisonResponse.json()
  const currentLocation = comparison.rows.find(row => row.isCalculatorLocation)
  assert.equal(currentLocation.id, 'NYC')
  assert.equal(currentLocation.netIncome, calculator.netIncome, 'Current location preserves the calculator result')
  const states = 'AK AL AR AZ CA CO CT DE FL GA HI IA ID IL IN KS KY LA MA MD ME MI MN MO MS MT NC ND NE NH NJ NM NV NY OH OK OR PA RI SC SD TN TX UT VA VT WA WI WV WY'.split(' ')
  assert.deepEqual(comparison.rows.map(row => row.id).sort(), [...states, 'NYC'].sort())
  assert.equal(comparison.rows.find(row => row.id === 'MA').provisional, true)
  assert.equal(comparison.rows.find(row => row.id === 'NY').provisional, false)
  assert.equal(comparison.rows.find(row => row.id === 'TX').provisional, false)
  for (const row of comparison.rows) {
    assert.equal(row.incomeExcludingBenefits, 172000)
    assert.equal(row.hsa, 1800)
    assert.ok(Math.abs(row.incomeExcludingBenefits - row.totalTax - row.retirement - row.hsa - row.insurance - row.netIncome) < 0.01)
  }
  const nyOutsideCity = comparison.rows.find(row => row.id === 'NY')
  assert.equal(nyOutsideCity.cityTax, 0)
  const otherLocationResponse = await post('/api/taxes', {
    ...comparisonScenario,
    nycResident: false,
    optionalDeductions: { ...comparisonScenario.optionalDeductions, stateTaxesWithholding: Math.round(nyOutsideCity.stateTax * 100) / 100 }
  })
  assert.equal((await otherLocationResponse.json()).netIncome, nyOutsideCity.netIncome, 'Other locations estimate their own withholding')
  for (const year of [2025, 2026, 2027]) {
    const scenario = { taxYear: year, taxState: 'IL', income: { wageIncome: 100000 } }
    const response = await post('/api/taxes/compare', scenario)
    assert.equal(response.status, 200)
    const { rows } = await response.json()
    assert.equal(rows.length, 51)
    assert.equal(rows.find(row => row.isCalculatorLocation).id, 'IL')
    for (const row of rows) {
      assert.ok(Number.isFinite(row.stateTax) && Number.isFinite(row.netIncome), row.id)
      if (row.id === 'NYC') continue
      const single = await taxesFor(year, row.id, 100000)
      // Alabama, Missouri and Oregon may use federal tax as a deduction.
      if (!['AL', 'MO', 'OR'].includes(row.id)) {
        assert.ok(Math.abs(row.stateTax - single.stateTax) < 0.01, `Tax parity for ${row.id} in ${year}`)
      }
    }
    for (const id of ['AK', 'FL', 'NH', 'NV', 'SD', 'TN', 'TX', 'WA', 'WY']) {
      assert.equal(rows.find(row => row.id === id).stateTax, 0, id)
    }
  }
  const stateCases = [
    { year: 2026, state: 'IL', wage: 100000, tax: (100000 - 2925) * 0.0495 },
    { year: 2026, state: 'NC', wage: 100000, tax: (100000 - 12750) * 0.0399 },
    { year: 2026, state: 'SC', wage: 45000, tax: 31360 * 0.0521 - 966 },
    { year: 2026, state: 'IN', wage: 100000, tax: 99000 * 0.0295 },
    { year: 2027, state: 'IN', wage: 100000, tax: 99000 * 0.029 },
    { year: 2027, state: 'CO', wage: 141600, tax: 5175 }
  ]
  for (const { year, state, wage, tax } of stateCases) {
    const result = await taxesFor(year, state, wage)
    assert.ok(Math.abs(result.stateTax - tax) < 0.01, `${state} ${year} state tax`)
  }
  const close = (actual, expected, label) => assert.ok(Math.abs(actual - expected) < 0.01, `${label}: ${actual} vs ${expected}`)
  const auditedCases = [
    { year: 2025, state: 'AR', wage: 14500, tax: 0 },
    { year: 2025, state: 'AR', wage: 15000, tax: 47 - 29 },
    { year: 2025, state: 'AR', wage: 97471, tax: 3338 - 29 },
    { year: 2026, state: 'AL', wage: 25999, taxable: 25999 - 3000 - 1500 - (25999 - 16100) * 0.1 },
    { year: 2026, state: 'CO', wage: 300000, taxable: 283900 },
    { year: 2026, state: 'CO', wage: 300001, taxable: 299001 },
    { year: 2025, state: 'ME', wage: 100000, taxable: 79850 },
    { year: 2026, state: 'ME', wage: 403500, taxable: 400850 },
    { year: 2027, state: 'ME', wage: 100000, taxable: 77950, tax: 5037.65 },
    { year: 2026, state: 'MN', wage: 350000, taxable: 338722 },
    { year: 2027, state: 'NE', wage: 100000, taxable: 90900, tax: 852.67 + (90900 - 25570) * 0.0399 - 181 },
    { year: 2027, state: 'NC', wage: 100000, tax: (100000 - 12750) * 0.0349 },
    { year: 2025, state: 'RI', wage: 254251, taxable: 254251 - (10900 + 5100) * 0.75 },
    { year: 2026, state: 'RI', wage: 268450, taxable: 268450 - (11200 + 5250) * 0.75 },
    { year: 2026, state: 'RI', wage: 268451, taxable: 268451 - (11200 + 5250) * 0.5 },
    { year: 2025, state: 'UT', wage: 30000, tax: 30000 * 0.045 - (15750 * 0.06 - (30000 - 18213) * 0.013) },
    { year: 2026, state: 'UT', wage: 30000, tax: 30000 * 0.0445 - (16100 * 0.06 - (30000 - 18696) * 0.013) },
    { year: 2025, state: 'VT', wage: 62900, taxable: 49950, tax: 49400 * 0.0335 + 550 * 0.066 },
    { year: 2026, state: 'VT', wage: 62900, tax: 49950 * 0.0335 },
    { year: 2027, state: 'VA', wage: 100000, taxable: 89870 },
    { year: 2025, state: 'WI', wage: 60000, taxable: 50594, tax: 14680 * 0.035 + (50480 - 14680) * 0.044 + 114 * 0.053 },
    { year: 2026, state: 'WI', wage: 25000, taxable: 10925.6 }
  ]
  for (const { year, state, wage, tax, taxable } of auditedCases) {
    const result = await taxesFor(year, state, wage)
    if (tax !== undefined) close(result.stateTax, tax, `${state} ${year} audited state tax`)
    if (taxable !== undefined) close(result.stateTaxableIncome, taxable, `${state} ${year} audited taxable income`)
  }
  const montana = await post('/api/taxes', { taxYear: 2027, taxState: 'MT', income: { wageIncome: 80000, longTermCapitalGains: 10000 } })
  assert.equal(montana.status, 200)
  close((await montana.json()).stateTax, 63400 * 0.047 + 1600 * 0.03 + 8400 * 0.041, 'Montana 2027 capital-gains stacking')
  const oklahoma = await post('/api/taxes', {
    taxYear: 2026,
    taxState: 'OK',
    income: { wageIncome: 100000 },
    optionalDeductions: { stateTaxesWithholding: 20000 }
  })
  assert.equal(oklahoma.status, 200)
  assert.equal((await oklahoma.json()).stateTaxableIncome, 99000, 'Oklahoma follows federal itemization')
  for (const id of ['MT', 'NE', 'NC', 'VA']) assert.equal(comparison.rows.find(row => row.id === id).provisional, false, id)
  assert.equal(comparison.rows.find(row => row.id === 'ME').provisional, true, 'Maine 2027 phaseouts remain provisional')
  const washington = { taxState: 'WA', taxYear: 2026, income: { longTermCapitalGains: 1390000 } }
  const wa = await (await post('/api/taxes', washington)).json()
  assert.equal(wa.stateTaxableIncome, 1100000)
  assert.ok(Math.abs(wa.stateTax - 79900) < 0.01)
  const exemptWa = await (await post('/api/taxes', { ...washington, washingtonEligibleGains: 0 })).json()
  assert.equal(exemptWa.stateTax, 0)
  const lowIncomeResponse = await post('/api/taxes/compare', { taxState: 'NY', nycResident: true, income: { wageIncome: 8000 } })
  const lowIncomeNyc = (await lowIncomeResponse.json()).rows.find(row => row.id === 'NYC')
  assert.equal(lowIncomeNyc.cityTax, -63, 'Refundable NYC credits remain signed')
  console.log('Passed: calculator routes, mortgage and credit calculations, and 2025–2027 tax defaults, overrides, and comparisons for all 50 states plus NYC.')
} finally {
  const exited = once(server, 'exit')
  server.kill()
  await exited
}
