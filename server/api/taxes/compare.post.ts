import { calculateCoreResults, type CalculatePayload } from '../../utils/income-tax'
import { getTaxYearRules, resolveTaxYear } from '../../../shared/utils/tax-years'

const locations = [
  { id: 'MA', label: 'Massachusetts', taxState: 'MA', nycResident: false },
  { id: 'CA', label: 'California', taxState: 'CA', nycResident: false },
  { id: 'NY', label: 'New York outside NYC', taxState: 'NY', nycResident: false },
  { id: 'NYC', label: 'New York City', taxState: 'NY', nycResident: true }
] as const

export default defineEventHandler(async (event) => {
  const scenario = await readBody<CalculatePayload>(event) ?? {}
  const taxYear = resolveTaxYear(scenario.taxYear)
  const sourceState = scenario.taxState === 'CA' || scenario.taxState === 'NY' ? scenario.taxState : 'MA'
  const stateRulesYear = getTaxYearRules(taxYear).stateRulesYear

  const rows = locations.map((location) => {
    const sameState = sourceState === location.taxState
    const isCalculatorLocation = sameState && (sourceState !== 'NY' || (scenario.nycResident === true) === location.nycResident)
    const inputs = {
      ...scenario,
      taxState: location.taxState,
      nycResident: location.nycResident,
      interestBreakdown: sameState
        ? scenario.interestBreakdown
        : { stateTaxExempt: 0, notStateTaxExempt: scenario.income?.interestIncome }
    }
    const initial = calculateCoreResults(inputs)
    const results = isCalculatorLocation
      ? initial
      : calculateCoreResults({
          ...inputs,
          optionalDeductions: {
            ...inputs.optionalDeductions,
            stateTaxesWithholding: Math.round(Math.max(0, initial.stateTax + initial.cityTax) * 100) / 100
          }
        })

    return {
      id: location.id,
      label: location.label,
      isCalculatorLocation,
      provisional: location.taxState !== 'NY' && stateRulesYear !== taxYear,
      incomeExcludingBenefits: results.incomeExcludingBenefits,
      federalTax: results.federalTax + results.longTermTax + results.netInvestmentIncomeTax,
      payrollTax: results.ficaTax,
      stateTax: results.stateTax,
      cityTax: results.cityTax,
      retirement: results.retirement401kContributions,
      hsa: results.hsaEmployeeContributionAmount,
      insurance: results.healthInsurancePayments,
      netIncome: results.netIncome,
      totalTax: results.totalTax
    }
  })

  return { taxYear, stateRulesYear, rows }
})
