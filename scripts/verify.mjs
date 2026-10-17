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
  console.log('Passed: all calculator routes, shared shell, route validation, mortgage calculations and input validation, credit wallet optimization, MA and CA taxes.')
} finally {
  const exited = once(server, 'exit')
  server.kill()
  await exited
}
