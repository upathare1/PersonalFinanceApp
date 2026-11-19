import { calculateCoreResults, calculateMarginalTaxRate, type CalculatePayload } from '../utils/income-tax'

export default defineEventHandler(async (event) => {
  const payload = await readBody<CalculatePayload>(event)
  const coreResults = calculateCoreResults(payload ?? {})

  return {
    ...coreResults,
    marginalTaxRateWageIncome: calculateMarginalTaxRate(payload ?? {}, { wageIncome: 1 }),
    marginalTaxRateInvestmentIncome: calculateMarginalTaxRate(payload ?? {}, { otherInvestmentIncome: 1 }),
    marginalTaxRateLongTermIncome: calculateMarginalTaxRate(payload ?? {}, { longTermCapitalGains: 1 })
  }
})
