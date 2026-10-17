interface IncomePayload {
  wageIncome?: number
  taxableBenefits?: number
  interestIncome?: number
  longTermCapitalGains?: number
  shortTermCapitalGains?: number
  otherInvestmentIncome?: number
}

interface AdjustmentsPayload {
  retirement401kContributions?: number
  healthInsurancePayments?: number
  hsaContributions?: number
}

interface OptionalDeductionsPayload {
  mortgageInterest?: number
  propertyTaxes?: number
  stateTaxesWithholding?: number
  investmentExpenses?: number
  massachusettsRent?: number
  carryOverCapitalLoss?: number
}

interface InterestBreakdownPayload {
  stateTaxExempt?: number
  notStateTaxExempt?: number
}

interface HsaBreakdownPayload {
  employeeContributions?: number
  employerContributions?: number
}

interface ConfigTaxBracketPayload {
  from?: number
  to?: number
  ratePercent?: number
}

interface CalculatorConfigPayload {
  federalStandardDeduction?: number
  massachusettsSurtaxFloor?: number
  socialSecurityMaximumTaxableWage?: number
  federalTaxBrackets?: ConfigTaxBracketPayload[]
}

type TaxState = 'MA' | 'CA'

interface CalculatePayload {
  taxState?: TaxState
  income?: IncomePayload
  adjustments?: AdjustmentsPayload
  optionalDeductions?: OptionalDeductionsPayload
  interestBreakdown?: InterestBreakdownPayload
  hsaBreakdown?: HsaBreakdownPayload
  calculatorConfig?: CalculatorConfigPayload
}

interface MarginalIncomeDeltas {
  wageIncome?: number
  otherInvestmentIncome?: number
  longTermCapitalGains?: number
}

interface CoreCalculationResults {
  federalOrdinaryIncome: number
  ficaWage: number
  stateTaxableIncome: number
  longTermTaxableIncome: number
  netInvestmentTaxableIncome: number
  federalTax: number
  ficaTax: number
  stateTax: number
  longTermTax: number
  netInvestmentIncomeTax: number
  totalTax: number
  retirement401kContributions: number
  hsaEmployeeContributionAmount: number
  effectiveTaxRate: number
  netIncome: number
  netIncomeMinusInvestmentIncome: number
}

const massachusettsPersonalExemption = 4400
const longTermTaxZeroRateThreshold = 49450
const longTermTaxFifteenRateThreshold = 545500
const baseSaltDeductionCap = 40400
const minimumSaltDeductionCap = 10000
const saltDeductionPhaseoutThreshold = 500000
const saltDeductionPhaseoutRate = 0.30

// FTB's 2026 estimated-tax instructions direct taxpayers to use 2025 rates and amounts.
const californiaStandardDeduction = 5706
const californiaPersonalExemptionCredit = 153

const californiaTaxBrackets: ConfigTaxBracketPayload[] = [
  { from: 0, to: 11079, ratePercent: 1 },
  { from: 11079, to: 26264, ratePercent: 2 },
  { from: 26264, to: 41452, ratePercent: 4 },
  { from: 41452, to: 57542, ratePercent: 6 },
  { from: 57542, to: 72724, ratePercent: 8 },
  { from: 72724, to: 371479, ratePercent: 9.3 },
  { from: 371479, to: 445771, ratePercent: 10.3 },
  { from: 445771, to: 742953, ratePercent: 11.3 },
  { from: 742953, ratePercent: 12.3 }
]

const defaultFederalTaxBrackets: ConfigTaxBracketPayload[] = [
  { from: 0, to: 12400, ratePercent: 10 },
  { from: 12400, to: 50400, ratePercent: 12 },
  { from: 50400, to: 105700, ratePercent: 22 },
  { from: 105700, to: 201775, ratePercent: 24 },
  { from: 201775, to: 256225, ratePercent: 32 },
  { from: 256225, to: 640600, ratePercent: 35 },
  { from: 640600, to: undefined, ratePercent: 37 }
]

const normalizeAmount = (value: number | undefined) => {
  const amount = Number(value ?? 0)

  return Number.isFinite(amount) ? Math.max(amount, 0) : 0
}

const calculateProgressiveTax = (
  taxableIncome: number,
  brackets: ConfigTaxBracketPayload[] = defaultFederalTaxBrackets
) => {
  const incomeAmount = Math.max(taxableIncome, 0)

  return brackets.reduce((tax, bracket) => {
    const bracketFrom = normalizeAmount(bracket.from)
    const bracketTop = bracket.to === undefined ? incomeAmount : normalizeAmount(bracket.to)
    const bracketRate = normalizeAmount(bracket.ratePercent) / 100
    const taxableInBracket = Math.max(Math.min(incomeAmount, bracketTop) - bracketFrom, 0)

    return tax + taxableInBracket * bracketRate
  }, 0)
}

const calculateSaltDeductionCap = (federalOrdinaryIncome: number) =>
  Math.max(
    baseSaltDeductionCap
    - saltDeductionPhaseoutRate * Math.max(federalOrdinaryIncome - saltDeductionPhaseoutThreshold, 0),
    minimumSaltDeductionCap
  )

const calculateCoreResults = (
  payload: CalculatePayload,
  deltas: MarginalIncomeDeltas = {}
): CoreCalculationResults => {
  const taxState: TaxState = payload.taxState === 'CA' ? 'CA' : 'MA'
  const income = payload.income ?? {}
  const adjustments = payload.adjustments ?? {}
  const optionalDeductions = payload.optionalDeductions ?? {}
  const interestBreakdown = payload.interestBreakdown ?? {}
  const hsaBreakdown = payload.hsaBreakdown ?? {}
  const calculatorConfig = payload.calculatorConfig ?? {}

  const wageIncome = normalizeAmount(income.wageIncome) + normalizeAmount(deltas.wageIncome)
  const taxableBenefits = normalizeAmount(income.taxableBenefits)
  const interestIncome = normalizeAmount(income.interestIncome)
  const longTermCapitalGains = normalizeAmount(income.longTermCapitalGains)
    + normalizeAmount(deltas.longTermCapitalGains)
  const shortTermCapitalGains = normalizeAmount(income.shortTermCapitalGains)
  const otherInvestmentIncome = normalizeAmount(income.otherInvestmentIncome)
    + normalizeAmount(deltas.otherInvestmentIncome)
  const retirement401kContributions = normalizeAmount(adjustments.retirement401kContributions)
  const healthInsurancePayments = normalizeAmount(adjustments.healthInsurancePayments)
  const hsaEmployeeContributionAmount = normalizeAmount(hsaBreakdown.employeeContributions)
  const mortgageInterest = normalizeAmount(optionalDeductions.mortgageInterest)
  const propertyTaxes = normalizeAmount(optionalDeductions.propertyTaxes)
  const stateTaxesWithholding = normalizeAmount(optionalDeductions.stateTaxesWithholding)
  const investmentExpenses = normalizeAmount(optionalDeductions.investmentExpenses)
  const massachusettsRent = normalizeAmount(optionalDeductions.massachusettsRent)
  const carryOverCapitalLoss = normalizeAmount(optionalDeductions.carryOverCapitalLoss)
  const stateTaxExemptInterest = normalizeAmount(interestBreakdown.stateTaxExempt)
  const notStateTaxExemptInterest = normalizeAmount(interestBreakdown.notStateTaxExempt)
  const federalStandardDeduction = normalizeAmount(calculatorConfig.federalStandardDeduction) || 16100
  const massachusettsSurtaxFloor = normalizeAmount(calculatorConfig.massachusettsSurtaxFloor) || 1107750
  const socialSecurityMaximumTaxableWage
    = normalizeAmount(calculatorConfig.socialSecurityMaximumTaxableWage) || 184500
  const federalTaxBrackets = calculatorConfig.federalTaxBrackets?.length
    ? calculatorConfig.federalTaxBrackets
    : defaultFederalTaxBrackets
  const grossIncome = wageIncome
    + taxableBenefits
    + interestIncome
    + shortTermCapitalGains
    + otherInvestmentIncome
  const totalIncome = grossIncome + longTermCapitalGains
  const capitalLossAfterGains = Math.max(
    carryOverCapitalLoss - (longTermCapitalGains + shortTermCapitalGains),
    0
  )
  const federalCapitalLossDeduction = Math.min(3000, capitalLossAfterGains)
  const stateAndPropertyTaxesPaid = stateTaxesWithholding + propertyTaxes
  const calculateFederalOrdinaryIncome = (saltDeductionCap: number) => {
    const stateAndPropertyTaxDeduction = Math.min(stateAndPropertyTaxesPaid, saltDeductionCap)
    const itemizedOrStandardDeduction = Math.max(
      federalStandardDeduction,
      stateAndPropertyTaxDeduction + mortgageInterest
    )

    return Math.max(
      grossIncome
      - retirement401kContributions
      - hsaEmployeeContributionAmount
      - investmentExpenses
      - healthInsurancePayments
      - itemizedOrStandardDeduction
      - federalCapitalLossDeduction,
      0
    )
  }
  let saltDeductionCap = baseSaltDeductionCap
  let federalOrdinaryIncome = calculateFederalOrdinaryIncome(saltDeductionCap)

  for (let index = 0; index < 24; index += 1) {
    const nextSaltDeductionCap = calculateSaltDeductionCap(federalOrdinaryIncome)
    const nextFederalOrdinaryIncome = calculateFederalOrdinaryIncome(nextSaltDeductionCap)

    if (
      Math.abs(nextSaltDeductionCap - saltDeductionCap) < 0.000001
      && Math.abs(nextFederalOrdinaryIncome - federalOrdinaryIncome) < 0.000001
    ) {
      federalOrdinaryIncome = nextFederalOrdinaryIncome
      break
    }

    saltDeductionCap = nextSaltDeductionCap
    federalOrdinaryIncome = nextFederalOrdinaryIncome
  }
  const longTermTaxableIncome = longTermCapitalGains
  const grossNetInvestmentIncome = interestIncome
    + otherInvestmentIncome
    + longTermCapitalGains
    + shortTermCapitalGains
  const netInvestmentIncome = Math.max(grossNetInvestmentIncome - investmentExpenses, 0)
  const ficaWage = Math.max(
    wageIncome + taxableBenefits - hsaEmployeeContributionAmount - healthInsurancePayments,
    0
  )
  const ficaTax = Math.min(socialSecurityMaximumTaxableWage * 0.062, 0.062 * ficaWage)
    + 0.0145 * ficaWage
    + 0.009 * Math.max(ficaWage - 200000, 0)
  const interestCapitalLossDeduction = Math.min(
    notStateTaxExemptInterest,
    capitalLossAfterGains,
    2000
  )
  const massachusettsTaxableIncome = Math.max(
    grossIncome
    + longTermTaxableIncome
    - retirement401kContributions
    - hsaEmployeeContributionAmount
    - healthInsurancePayments
    - investmentExpenses
    - Math.min(massachusettsRent, 3000)
    - Math.min(ficaTax, 2000)
    - massachusettsPersonalExemption
    - interestCapitalLossDeduction
    - stateTaxExemptInterest,
    0
  )
  const californiaDeduction = Math.max(californiaStandardDeduction, mortgageInterest)
  const californiaTaxableIncome = Math.max(
    grossIncome
    + longTermTaxableIncome
    - retirement401kContributions
    - hsaEmployeeContributionAmount
    - healthInsurancePayments
    - investmentExpenses
    - californiaDeduction
    - federalCapitalLossDeduction
    - stateTaxExemptInterest,
    0
  )
  const stateTaxableIncome = taxState === 'CA'
    ? californiaTaxableIncome
    : massachusettsTaxableIncome
  const federalTax = calculateProgressiveTax(federalOrdinaryIncome, federalTaxBrackets)
  const longTermTaxRate = federalOrdinaryIncome <= longTermTaxZeroRateThreshold
    ? 0
    : federalOrdinaryIncome <= longTermTaxFifteenRateThreshold
      ? 0.15
      : 0.20
  const longTermTax = longTermTaxableIncome * longTermTaxRate
  const massachusettsTax = Math.min(massachusettsTaxableIncome, massachusettsSurtaxFloor) * 0.05
    + Math.max(massachusettsTaxableIncome - massachusettsSurtaxFloor, 0) * 0.09
  const californiaIncomeTax = calculateProgressiveTax(
    californiaTaxableIncome,
    californiaTaxBrackets
  )
  const californiaBehavioralHealthServicesTax = Math.max(californiaTaxableIncome - 1000000, 0) * 0.01
  const californiaTax = Math.max(
    californiaIncomeTax
    + californiaBehavioralHealthServicesTax
    - californiaPersonalExemptionCredit,
    0
  )
  const stateTax = taxState === 'CA' ? californiaTax : massachusettsTax
  const netInvestmentThresholdIncome = federalOrdinaryIncome
    + longTermTaxableIncome
    + interestIncome
    + shortTermCapitalGains
    + otherInvestmentIncome
  const netInvestmentTaxableIncome = Math.min(
    netInvestmentIncome,
    Math.max(netInvestmentThresholdIncome - 200000, 0)
  )
  const netInvestmentIncomeTax = netInvestmentTaxableIncome * 0.038
  const totalTax = federalTax + stateTax + ficaTax + netInvestmentIncomeTax + longTermTax
  const netIncome = totalIncome
    - taxableBenefits
    - retirement401kContributions
    - hsaEmployeeContributionAmount
    - healthInsurancePayments
    - totalTax
  const netIncomeMinusInvestmentIncome = netIncome
    - shortTermCapitalGains
    - longTermCapitalGains
    - otherInvestmentIncome
    - interestIncome
  const effectiveTaxRateDenominator = totalIncome - taxableBenefits
  const effectiveTaxRate = effectiveTaxRateDenominator <= 0 ? 0 : totalTax / effectiveTaxRateDenominator

  return {
    federalOrdinaryIncome,
    ficaWage,
    stateTaxableIncome,
    longTermTaxableIncome,
    netInvestmentTaxableIncome,
    federalTax,
    ficaTax,
    stateTax,
    longTermTax,
    netInvestmentIncomeTax,
    totalTax,
    retirement401kContributions,
    hsaEmployeeContributionAmount,
    effectiveTaxRate,
    netIncome,
    netIncomeMinusInvestmentIncome
  }
}

const calculateMarginalTaxRate = (payload: CalculatePayload, deltas: MarginalIncomeDeltas) => {
  const incomeDelta = Object.values(deltas).reduce((total, delta) => total + normalizeAmount(delta), 0)
  const income = payload.income ?? {}
  const hasBaselineIncome = Object.values(income).some(value => normalizeAmount(value) > 0)

  if (incomeDelta <= 0 || !hasBaselineIncome) {
    return 0
  }

  const baseNetIncome = calculateCoreResults(payload).netIncome
  const marginalNetIncome = calculateCoreResults(payload, deltas).netIncome

  return 1 - (marginalNetIncome - baseNetIncome) / incomeDelta
}

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
