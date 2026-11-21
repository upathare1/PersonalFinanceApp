import { getStateSchedule } from '../../shared/utils/state-income-tax-rules'
import type { TaxState } from '../../shared/utils/tax-states'
import type { TaxYear } from '../../shared/utils/tax-years'

interface StateTaxInputs {
  year: TaxYear
  state: TaxState
  totalIncome: number
  retirement: number
  healthInsurance: number
  employeeHsa: number
  employerHsa: number
  exemptInterest: number
  capitalLoss: number
  longTermGains: number
  shortTermGains: number
  netInvestmentIncome: number
  washingtonEligibleGains?: number
  federalStandard: number
  federalItemized: number
  stateTaxesInFederalItemized: number
  federalIncomeTax: number
  ficaTax: number
  mortgageInterest: number
  propertyTaxes: number
}

const positive = (value: number) => Math.max(0, value)
const stepsOver = (value: number, threshold: number, step: number) => Math.ceil(positive(value - threshold) / step)
const stateItemizes = new Set<TaxState>(['AL', 'AR', 'AZ', 'DE', 'GA', 'HI', 'ID', 'KS', 'KY', 'ME', 'MD', 'MN', 'MO', 'MS', 'MT', 'NC', 'NE', 'NM', 'OK', 'OR', 'VA'])
const federalTaxableStart = new Set<TaxState>(['CO', 'IA', 'ND', 'SC'])
const capitalGainsExclusion: Partial<Record<TaxState, number>> = { AR: 0.5, AZ: 0.25, ND: 0.4, SC: 0.44, WI: 0.3 }

function applyBrackets(income: number, brackets: readonly (readonly [number, number])[]) {
  return brackets.reduce((tax, [from, rate], index) => {
    const to = brackets[index + 1]?.[0] ?? income
    return tax + positive(Math.min(income, to) - from) * rate / 100
  }, 0)
}

export function calculateOtherStateTax(inputs: StateTaxInputs) {
  const { state, year, federalStandard, federalItemized, mortgageInterest, propertyTaxes, federalIncomeTax } = inputs
  if (state === 'WA') {
    // WA DOR capital gains excise tax, RCW §§82.87.040 and 82.87.060.
    const eligible = Math.min(inputs.longTermGains, inputs.washingtonEligibleGains ?? inputs.longTermGains)
    const taxableIncome = positive(eligible - (year === 2025 ? 278000 : 290000))
    const stateTax = taxableIncome * 0.07 + positive(taxableIncome - 1000000) * 0.029
    return { taxableIncome, stateTax }
  }

  const rules = getStateSchedule(state, year)
  if (!rules) return { taxableIncome: 0, stateTax: 0 }

  const netGains = positive(inputs.longTermGains + inputs.shortTermGains - inputs.capitalLoss)
  const netLongTermGains = Math.min(inputs.longTermGains, netGains)
  const federalCapitalLoss = Math.min(inputs.capitalLoss, inputs.longTermGains + inputs.shortTermGains + 3000)
  const capitalLoss = state === 'NJ' || state === 'PA' ? 0 : federalCapitalLoss
  const retirement = state === 'PA' ? 0 : inputs.retirement
  const healthInsurance = state === 'NJ' ? 0 : inputs.healthInsurance
  const employeeHsa = state === 'NJ' ? 0 : inputs.employeeHsa
  const employerHsa = state === 'NJ' ? inputs.employerHsa : 0
  const federalAgi = positive(inputs.totalIncome - inputs.retirement - inputs.healthInsurance - inputs.employeeHsa - federalCapitalLoss)
  const agi = positive(inputs.totalIncome - retirement - healthInsurance - employeeHsa + employerHsa - inputs.exemptInterest - capitalLoss)
  let deduction = rules.deduction === 'federal' ? federalStandard : rules.deduction ?? 0
  let exemption = rules.exemption ?? 0
  let credit = rules.credit ?? 0

  if (federalTaxableStart.has(state) && (state !== 'SC' || year === 2025)) {
    if (federalItemized > federalStandard) {
      deduction = federalItemized - inputs.stateTaxesInFederalItemized
    }
  } else if (stateItemizes.has(state)) {
    const supportedItemized = mortgageInterest + propertyTaxes
    const followsFederalElection = state === 'MD' || state === 'OK' || state === 'VA'
    if (followsFederalElection) {
      if (federalItemized > federalStandard) deduction = supportedItemized
    } else {
      deduction = Math.max(deduction, supportedItemized)
    }
  }

  let incomeSubtractions = netLongTermGains * (capitalGainsExclusion[state] ?? 0)
  let additionalTax = 0
  switch (state) {
    case 'AL': {
      // Form 40. Schedule A includes payroll taxes, property taxes and mortgage interest.
      const standard = Math.max(2500, 3000 - 25 * Math.floor(positive(agi - 25500) / 500))
      deduction = Math.max(standard, mortgageInterest + propertyTaxes + inputs.ficaTax)
      incomeSubtractions += federalIncomeTax
      break
    }
    case 'CO':
      // Colorado caps the federal deduction for high-AGI single filers.
      if (federalAgi > 300000) deduction = Math.min(deduction, year === 2025 ? 12000 : 1000)
      break
    case 'CT': {
      exemption = positive(15000 - 1000 * stepsOver(agi, 30000, 1000))
      // CT-1040, Tables C and D. Restore the lower-rate benefit at higher AGI.
      additionalTax = Math.min(250, 25 * stepsOver(agi, 56500, 5000))
        + Math.min(250, 25 * stepsOver(agi, 105000, 5000))
        + 90 * Math.min(30, stepsOver(agi, 200000, 5000))
        + Math.min(450, 50 * stepsOver(agi, 500000, 5000))
      break
    }
    case 'IL':
      if (federalAgi > 250000) exemption = 0
      credit += propertyTaxes * 0.05 * Number(federalAgi <= 250000)
      break
    case 'ME': {
      // 1040ME worksheets. The 2027 bands are published, while the
      // separate phaseout thresholds use 2026 amounts until confirmed.
      const deductionThreshold = year === 2025 ? 100000 : 102250
      const exemptionThreshold = year === 2025 ? 333450 : 341000
      deduction *= 1 - Math.min(1, positive(agi - deductionThreshold) / 75000)
      exemption *= 1 - Math.min(1, positive(agi - exemptionThreshold) / 125000)
      break
    }
    case 'MD':
      exemption = federalAgi <= 100000 ? 3200 : federalAgi <= 125000 ? 1600 : federalAgi <= 150000 ? 800 : 0
      if (federalAgi > 350000) additionalTax = netLongTermGains * 0.02
      break
    case 'MN': {
      const lower = year === 2025 ? 238950 : 244400
      const upper = year === 2025 ? 330300 : 337800
      const phaseout = positive(Math.min(federalAgi, upper) - lower) * 0.03 + positive(federalAgi - upper) * 0.10
      deduction -= Math.min(deduction * 0.8, phaseout)
      additionalTax = positive(inputs.netInvestmentIncome - inputs.exemptInterest - inputs.capitalLoss - 1000000) * 0.01
      break
    }
    case 'MO': {
      incomeSubtractions += netGains
      const percentage = federalAgi <= 25000 ? 0.35 : federalAgi <= 50000 ? 0.25 : federalAgi <= 100000 ? 0.15 : federalAgi <= 125000 ? 0.05 : 0
      incomeSubtractions += Math.min(5000, federalIncomeTax * percentage)
      break
    }
    case 'MT':
      // Eligible net long-term gains are taxed on a separate schedule.
      incomeSubtractions += netLongTermGains
      break
    case 'NJ':
      deduction = Math.min(propertyTaxes, 15000)
      if (agi <= 10000) return { taxableIncome: 0, stateTax: 0 }
      break
    case 'NM':
      incomeSubtractions += Math.min(2500, netGains)
      break
    case 'OH':
      exemption = agi <= 40000 ? 2400 : agi <= 80000 ? 2150 : 1900
      if (agi - exemption > 26050) additionalTax = year === 2025 ? 360.69 : 332
      break
    case 'OR': {
      const cap = year === 2025 ? 8500 : 8750
      const tiers = Math.min(5, stepsOver(federalAgi, 125000, 5000))
      incomeSubtractions += Math.min(federalIncomeTax, Math.round(cap * (1 - tiers / 5) / 50) * 50)
      if (federalAgi > 100000) credit = 0
      break
    }
    case 'RI': {
      const threshold = year === 2025 ? 254250 : 261000
      const step = year === 2025 ? 7250 : 7450
      const remaining = 1 - Math.min(4, stepsOver(agi, threshold, step)) * 0.25
      deduction *= remaining
      exemption *= remaining
      break
    }
    case 'SC':
      if (year !== 2025) {
        const reductionFraction = Math.min(1, positive(federalAgi - 40000) / 55000)
        deduction -= Math.floor(deduction * reductionFraction / 10) * 10
      }
      break
    case 'UT':
      credit = positive(Math.max(federalStandard, mortgageInterest + propertyTaxes) * 0.06
        - positive(agi - (year === 2025 ? 18213 : 18696)) * 0.013)
      break
    case 'WI': {
      const maximum = year === 2025 ? 13560 : 13960
      const threshold = year === 2025 ? 19550 : 20120
      deduction = positive(maximum - positive(agi - threshold) * 0.12)
      break
    }
  }

  const taxableIncome = positive(agi - deduction - exemption - incomeSubtractions)
  let tax = applyBrackets(taxableIncome, rules.brackets) + additionalTax
  if (state === 'AR') {
    if (year === 2025 && inputs.totalIncome <= 17500 && deduction === rules.deduction) {
      // AR1000F single low-income table uses AGI before the standard deduction.
      const lowIncome = Math.round(positive(agi - incomeSubtractions))
      const lowIncomeTax = lowIncome <= 14643 ? 0 : lowIncome <= 14700 ? 29 : 33 + (Math.ceil(lowIncome / 100) - 148) * 7
      return { taxableIncome: lowIncome, stateTax: positive(lowIncomeTax - credit) }
    }
    if (year === 2025 && taxableIncome >= 94701) {
      // DFA 2025 indexed brackets, including the $100 transition bands.
      const wholeDollars = Math.round(taxableIncome)
      const band = Math.floor((wholeDollars - 94701) / 100)
      const taxTableDeduction = Math.max(89.30, 399.30 - 10 * band)
      const midpoint = 94750 + band * 100
      tax = wholeDollars > 100000
        ? 3809 + (wholeDollars - 100000) * 0.039
        : Math.round(midpoint * 0.039 - taxTableDeduction)
    } else if (year !== 2025 && taxableIncome > 94700) {
      // Use a continuous estimate between the two 2026 estimated-tax schedules.
      const highSchedule = 3618 + (taxableIncome - 100000) * 0.037
      const transition = Math.min(1, (taxableIncome - 94700) / (97600 - 94700))
      tax += (highSchedule - tax) * transition
    }
  }
  if (state === 'CT') {
    const creditThresholds = [18800, 19300, 19800, 20300, 20800, 21300, 21800, 22300, 25000, 25500, 26000, 26500,
      31300, 31800, 32300, 32800, 33300, 60000, 60500, 61000, 61500, 62000, 62500, 63000, 63500, 64000, 64500]
    const creditRates = [75, 70, 65, 60, 55, 50, 45, 40, 35, 30, 25, 20, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1]
    const creditIndex = creditThresholds.findIndex(limit => agi <= limit)
    const personalCredit = (creditRates[creditIndex] ?? 0) / 100
    tax *= 1 - personalCredit
  }
  if (state === 'MT') {
    const taxableGains = Math.min(netLongTermGains, positive(agi - deduction))
    const lowerRateCapacity = positive((rules.brackets[1]?.[0] ?? 0) - taxableIncome)
    const lowerRateGains = Math.min(taxableGains, lowerRateCapacity)
    tax += lowerRateGains * 0.03 + (taxableGains - lowerRateGains) * 0.041
    return { taxableIncome: taxableIncome + taxableGains, stateTax: positive(tax - credit) }
  }
  return { taxableIncome, stateTax: positive(tax - credit) }
}
