import { isProvisionalStateEstimate, resolveTaxState, stateOptions } from '../../../shared/utils/tax-states'
import { calculateCoreResults, type CalculatePayload } from '../../utils/income-tax'
import { resolveTaxYear } from '../../../shared/utils/tax-years'

const locations = [
  ...stateOptions.map(({ label, value }) => ({
    id: value,
    label: value === 'NY' ? 'New York outside NYC' : label,
    taxState: value,
    nycResident: false
  })),
  { id: 'NYC', label: 'New York City', taxState: 'NY', nycResident: true }
] as const

export default defineEventHandler(async (event) => {
  const scenario = await readBody<CalculatePayload>(event) ?? {}
  const taxYear = resolveTaxYear(scenario.taxYear)
  const sourceState = resolveTaxState(scenario.taxState)

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
      provisional: isProvisionalStateEstimate(location.taxState, taxYear),
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

  return { taxYear, rows }
})
