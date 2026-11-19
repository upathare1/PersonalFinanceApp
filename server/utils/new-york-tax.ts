import type { TaxYear } from '../../shared/utils/tax-years'

export interface NewYorkInputs {
  additions?: number
  subtractions?: number
  itemizedDeduction?: number
}

const starts = [0, 8500, 11700, 13900, 80650, 215400, 1077550, 5000000, 25000000]
const schedules = {
  2025: { rates: [4, 4.5, 5.25, 5.5, 6, 6.85, 9.65, 10.3, 10.9], bases: [0, 340, 484, 600, 4271, 12356, 71413, 449929, 2509929], recapture: [568, 1831, 2399, 32571] },
  2026: { rates: [3.9, 4.4, 5.15, 5.4, 5.9, 6.85, 9.65, 10.3, 10.9], bases: [0, 332, 473, 586, 4191, 12141, 71198, 449714, 2509714], recapture: [567, 2047, 2614, 32786] },
  2027: { rates: [3.8, 4.3, 5.05, 5.3, 5.8, 6.85, 9.65, 10.3, 10.9], bases: [0, 323, 461, 572, 4110, 11926, 70983, 449499, 2509499], recapture: [568, 2261, 2829, 33001] }
}

// NY Tax Law §601(c), (d-4), (d-5), (d-6); 2025 IT-201-I and 2026 IT-2105-I.
// Official schedules use rounded base amounts. Do not reconstruct them by summing bands.
export function newYorkStateTaxBeforeCredits(year: TaxYear, agi: number, taxable: number) {
  const schedule = schedules[year]
  const index = starts.findLastIndex(from => taxable > from)
  const band = Math.max(0, index)
  const baseTax = schedule.bases[band]! + Math.max(0, taxable - starts[band]!) * schedule.rates[band]! / 100
  const phase = (floor: number) => Math.round(Math.min(1, Math.max(0, (agi - floor) / 50000)) * 10000) / 10000
  if (agi <= 107650) return baseTax
  if (agi > 25000000) return taxable * 0.109
  if (taxable <= 215400) {
    const targetTax = taxable * schedule.rates[4]! / 100
    return baseTax + (targetTax - baseTax) * phase(107650)
  }
  const [first, second, third, fourth] = schedule.recapture
  if (taxable <= 1077550) return baseTax + first! + second! * phase(215400)
  if (taxable <= 5000000) return baseTax + third! + 30172 * phase(1077550)
  return baseTax + fourth! + 32500 * phase(5000000)
}

const amount = (value: number | undefined) => Number.isFinite(value) ? Math.max(0, value!) : 0

export function calculateNewYorkTaxes(year: TaxYear, federalAgi: number, exemptInterest: number, nycResident: boolean, inputs: NewYorkInputs = {}) {
  const adjustedGrossIncome = Math.max(0, federalAgi - exemptInterest + amount(inputs.additions) - amount(inputs.subtractions))
  // Caller supplies the NY itemized total AFTER IT-196 limitations; federal itemization is independent.
  const deduction = Math.max(8000, amount(inputs.itemizedDeduction))
  const taxableIncome = Math.max(0, adjustedGrossIncome - deduction)
  const householdCredit = federalAgi <= 5000
    ? 75
    : federalAgi <= 6000
      ? 60
      : federalAgi <= 7000
        ? 50
        : federalAgi <= 20000 ? 45 : federalAgi <= 25000 ? 40 : federalAgi <= 28000 ? 20 : 0
  const stateTax = Math.max(0, newYorkStateTaxBeforeCredits(year, adjustedGrossIncome, taxableIncome) - householdCredit)
  let cityTax = 0
  let cityTaxCredits = 0
  if (nycResident) {
    // Full-year, single, not claimable as a dependent. NYC credits: IT-201 lines 48, 69 and 69a.
    const cityBaseTax = taxableIncome <= 12000
      ? taxableIncome * 0.03078
      : taxableIncome <= 25000
        ? 369 + (taxableIncome - 12000) * 0.03762
        : taxableIncome <= 50000
          ? 858 + (taxableIncome - 25000) * 0.03819
          : 1813 + (taxableIncome - 50000) * 0.03876
    const household = federalAgi <= 10000 ? 15 : federalAgi <= 12500 ? 10 : 0
    const fixedSchoolCredit = federalAgi <= 250000 ? 63 : 0
    const rateReduction = taxableIncome > 500000
      ? 0
      : taxableIncome <= 12000 ? taxableIncome * 0.00171 : 21 + (taxableIncome - 12000) * 0.00228
    cityTaxCredits = Math.min(cityBaseTax, household) + fixedSchoolCredit + rateReduction
    // School-tax credits are refundable, so net NYC tax may be negative.
    cityTax = cityBaseTax - cityTaxCredits
  }
  return { adjustedGrossIncome, taxableIncome, stateTax, cityTax, cityTaxCredits }
}
