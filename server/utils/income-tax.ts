import { resolveTaxState, type TaxState } from '../../shared/utils/tax-states'
import { calculateOtherStateTax } from './other-state-tax'
import { calculateNewYorkTaxes, type NewYorkInputs } from './new-york-tax'
import { californiaBehavioralHealthTax, createCalculatorConfig, getTaxYearRules, massachusettsIncomeTaxRates, resolveTaxYear } from '../../shared/utils/tax-years'

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

export interface CalculatePayload {
  taxYear?: unknown
  taxState?: TaxState
  washingtonEligibleGains?: number
  nycResident?: boolean
  newYorkInputs?: NewYorkInputs
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
  cityTax: number
  cityTaxCredits: number
  longTermTax: number
  netInvestmentIncomeTax: number
  totalTax: number
  incomeExcludingBenefits: number
  healthInsurancePayments: number
  retirement401kContributions: number
  hsaEmployeeContributionAmount: number
  effectiveTaxRate: number
  netIncome: number
  netIncomeMinusInvestmentIncome: number
}

const massachusettsPersonalExemption = 4400
const minimumSaltDeductionCap = 10000
const saltDeductionPhaseoutRate = 0.30

const normalizeAmount = (value: number | undefined) => {
  const amount = Number(value ?? 0)

  return Number.isFinite(amount) ? Math.max(amount, 0) : 0
}

const calculateProgressiveTax = (
  taxableIncome: number,
  brackets: ConfigTaxBracketPayload[]
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

const calculateSaltDeductionCap = (federalOrdinaryIncome: number, baseSaltDeductionCap: number, saltDeductionPhaseoutThreshold: number) =>
  Math.max(
    baseSaltDeductionCap
    - saltDeductionPhaseoutRate * Math.max(federalOrdinaryIncome - saltDeductionPhaseoutThreshold, 0),
    minimumSaltDeductionCap
  )

export const calculateCoreResults = (
  payload: CalculatePayload,
  deltas: MarginalIncomeDeltas = {}
): CoreCalculationResults => {
  const taxState = resolveTaxState(payload.taxState)
  const income = payload.income ?? {}
  const adjustments = payload.adjustments ?? {}
  const optionalDeductions = payload.optionalDeductions ?? {}
  const interestBreakdown = payload.interestBreakdown ?? {}
  const hsaBreakdown = payload.hsaBreakdown ?? {}
  const taxYear = resolveTaxYear(payload.taxYear)
  const rules = getTaxYearRules(taxYear)
  const defaults = createCalculatorConfig(taxYear)
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
  const federalStandardDeduction = normalizeAmount(calculatorConfig.federalStandardDeduction) || defaults.federalStandardDeduction
  const massachusettsSurtaxFloor = normalizeAmount(calculatorConfig.massachusettsSurtaxFloor) || defaults.massachusettsSurtaxFloor
  const socialSecurityMaximumTaxableWage
    = normalizeAmount(calculatorConfig.socialSecurityMaximumTaxableWage) || defaults.socialSecurityMaximumTaxableWage
  const federalTaxBrackets = calculatorConfig.federalTaxBrackets?.length
    ? calculatorConfig.federalTaxBrackets
    : defaults.federalTaxBrackets
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
  let saltDeductionCap = rules.federal.saltCap
  let federalOrdinaryIncome = calculateFederalOrdinaryIncome(saltDeductionCap)

  for (let index = 0; index < 24; index += 1) {
    const nextSaltDeductionCap = calculateSaltDeductionCap(federalOrdinaryIncome, rules.federal.saltCap, rules.federal.saltPhaseout)
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
  const californiaDeduction = Math.max(rules.california.standardDeduction, mortgageInterest)
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
  const newYork = taxState === 'NY'
    ? calculateNewYorkTaxes(
        taxYear,
        Math.max(0, totalIncome - retirement401kContributions - hsaEmployeeContributionAmount
        - healthInsurancePayments - federalCapitalLossDeduction - investmentExpenses),
        stateTaxExemptInterest,
        payload.nycResident === true,
        payload.newYorkInputs
      )
    : undefined
  const federalTax = calculateProgressiveTax(federalOrdinaryIncome, federalTaxBrackets)
  const longTermTaxRate = federalOrdinaryIncome <= rules.federal.gainsZero
    ? 0
    : federalOrdinaryIncome <= rules.federal.gainsFifteen
      ? 0.15
      : 0.20
  const longTermTax = longTermTaxableIncome * longTermTaxRate
  const massachusettsTax = Math.min(massachusettsTaxableIncome, massachusettsSurtaxFloor) * (massachusettsIncomeTaxRates.base / 100)
    + Math.max(massachusettsTaxableIncome - massachusettsSurtaxFloor, 0) * (massachusettsIncomeTaxRates.aboveSurtaxFloor / 100)
  const californiaIncomeTax = calculateProgressiveTax(
    californiaTaxableIncome,
    rules.california.brackets
  )
  const californiaBehavioralHealthServicesTax = Math.max(californiaTaxableIncome - californiaBehavioralHealthTax.from, 0)
    * (californiaBehavioralHealthTax.ratePercent / 100)
  const californiaTax = Math.max(
    californiaIncomeTax
    + californiaBehavioralHealthServicesTax
    - rules.california.exemptionCredit,
    0
  )
  const stateTaxesInFederalItemized = Math.min(stateTaxesWithholding, saltDeductionCap)
  const stateResult = newYork ?? (taxState === 'CA'
    ? { taxableIncome: californiaTaxableIncome, stateTax: californiaTax }
    : taxState === 'MA'
      ? { taxableIncome: massachusettsTaxableIncome, stateTax: massachusettsTax }
      : calculateOtherStateTax({
          state: taxState,
          year: taxYear,
          totalIncome,
          retirement: retirement401kContributions,
          healthInsurance: healthInsurancePayments,
          employeeHsa: hsaEmployeeContributionAmount,
          employerHsa: normalizeAmount(hsaBreakdown.employerContributions),
          exemptInterest: Math.min(interestIncome, stateTaxExemptInterest),
          capitalLoss: carryOverCapitalLoss,
          longTermGains: longTermCapitalGains,
          shortTermGains: shortTermCapitalGains,
          netInvestmentIncome,
          washingtonEligibleGains: payload.washingtonEligibleGains === undefined
            ? undefined
            : normalizeAmount(payload.washingtonEligibleGains),
          federalStandard: defaults.federalStandardDeduction,
          federalItemized: mortgageInterest + Math.min(stateAndPropertyTaxesPaid, saltDeductionCap),
          stateTaxesInFederalItemized,
          federalIncomeTax: federalTax + longTermTax,
          ficaTax,
          mortgageInterest,
          propertyTaxes
        }))
  const { taxableIncome: stateTaxableIncome, stateTax } = stateResult
  const cityTax = newYork?.cityTax ?? 0
  const cityTaxCredits = newYork?.cityTaxCredits ?? 0
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
  const totalTax = federalTax + stateTax + cityTax + ficaTax + netInvestmentIncomeTax + longTermTax
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
    cityTax,
    cityTaxCredits,
    longTermTax,
    netInvestmentIncomeTax,
    totalTax,
    incomeExcludingBenefits: effectiveTaxRateDenominator,
    healthInsurancePayments,
    retirement401kContributions,
    hsaEmployeeContributionAmount,
    effectiveTaxRate,
    netIncome,
    netIncomeMinusInvestmentIncome
  }
}

export const calculateMarginalTaxRate = (payload: CalculatePayload, deltas: MarginalIncomeDeltas) => {
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
