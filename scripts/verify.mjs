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
  console.log('Passed: calculator routes, mortgage and credit calculations, and 2025–2027 federal, state, and payroll tax defaults and overrides.')
} finally {
  const exited = once(server, 'exit')
  server.kill()
  await exited
}
