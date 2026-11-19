export const taxYears = [2025, 2026, 2027] as const
export type TaxYear = typeof taxYears[number]
export const defaultTaxYear: TaxYear = 2026

export interface TaxBracket {
  from: number
  to?: number
  ratePercent: number
}

export interface CalculatorConfig {
  federalStandardDeduction: number
  massachusettsSurtaxFloor: number
  socialSecurityMaximumTaxableWage: number
  federalTaxBrackets: TaxBracket[]
}

function brackets(upperBounds: number[], rates: number[]): TaxBracket[] {
  return rates.map((ratePercent, index) => ({
    from: index === 0 ? 0 : upperBounds[index - 1]!,
    to: upperBounds[index],
    ratePercent
  }))
}

const federalRates = [10, 12, 22, 24, 32, 35, 37]
const californiaRates = [1, 2, 4, 6, 8, 9.3, 10.3, 11.3, 12.3]

// IRS Rev. Procs. 2024-40, 2025-32 and 2026-35; 26 USC §164 for SALT.
const federal = {
  2025: { standardDeduction: 15750, bounds: [11925, 48475, 103350, 197300, 250525, 626350], gainsZero: 48350, gainsFifteen: 533400, saltCap: 40000, saltPhaseout: 500000 },
  2026: { standardDeduction: 16100, bounds: [12400, 50400, 105700, 201775, 256225, 640600], gainsZero: 49450, gainsFifteen: 545500, saltCap: 40400, saltPhaseout: 505000 },
  2027: { standardDeduction: 16600, bounds: [12800, 52025, 109125, 208325, 264550, 661375], gainsZero: 51050, gainsFifteen: 563200, saltCap: 40804, saltPhaseout: 510050 }
}

// FTB Schedule X and inflation adjustments (October 2025 and October 2026).
const california = {
  2025: { standardDeduction: 5706, exemptionCredit: 153, brackets: brackets([11079, 26264, 41452, 57542, 72724, 371479, 445771, 742953], californiaRates) },
  2026: { standardDeduction: 5900, exemptionCredit: 158, brackets: brackets([11456, 27157, 42861, 59498, 75197, 384109, 460927, 768213], californiaRates) }
}

const wageBase = { 2025: 176100, 2026: 184500, 2027: 192300 }
const massachusettsSurtax = { 2025: 1083150, 2026: 1107750 }

export function resolveTaxYear(value: unknown): TaxYear {
  return value === 2025 || value === 2026 || value === 2027 ? value : defaultTaxYear
}

export function getTaxYearRules(year: TaxYear) {
  const stateRulesYear = year === 2027 ? 2026 : year
  return {
    federal: federal[year],
    california: california[stateRulesYear],
    massachusettsSurtaxFloor: massachusettsSurtax[stateRulesYear],
    socialSecurityMaximumTaxableWage: wageBase[year],
    stateRulesYear
  }
}

export function createCalculatorConfig(year: TaxYear): CalculatorConfig {
  const rules = getTaxYearRules(year)
  return {
    federalStandardDeduction: rules.federal.standardDeduction,
    massachusettsSurtaxFloor: rules.massachusettsSurtaxFloor,
    socialSecurityMaximumTaxableWage: rules.socialSecurityMaximumTaxableWage,
    federalTaxBrackets: brackets(rules.federal.bounds, federalRates)
  }
}
