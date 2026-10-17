export interface StrategyResult {
  annualizedIrrPercent: number | null
  terminalValue: number
  grossStockValue: number
  netStockValue: number
  stockTax: number
  stockContributions: number
}

export interface ComparisonResult {
  buyer: StrategyResult & {
    grossHomeValue: number
    mortgageBalance: number
    sellingCosts: number
    homeCapitalGainsTax: number
    netHomeProceeds: number
    totalInterestDeduction: number
    totalPropertyTaxDeduction: number
    totalTaxSavings: number
  }
  renter: StrategyResult
  initialCapital: number
  months: number
  totalSharedCashFlow: number
  effectiveMonthlyBudget: number
  cashFlowIsFeasible: boolean
}
