import type { ComparisonResult, StrategyResult } from '../../shared/types/calculation'
import type { Scenario } from '../../shared/types/scenario'

function updateStockAccount(balance: number, basis: number, contribution: number, monthlyRate: number, taxRate: number) {
  const grownBalance = balance * (1 + monthlyRate)
  if (contribution >= 0) {
    return {
      balance: grownBalance + contribution,
      basis: basis + contribution,
      realizedTax: 0,
      feasible: true
    }
  }

  const cashNeeded = -contribution
  if (grownBalance <= 0) {
    return { balance: grownBalance - cashNeeded, basis, realizedTax: 0, feasible: false }
  }

  // A withdrawal is a stock sale. Gross up the sale so its after-tax proceeds
  // cover the required cash, then remove the proportional cost basis sold.
  const gainRatio = Math.max(0, grownBalance - basis) / grownBalance
  const grossSale = cashNeeded / (1 - gainRatio * taxRate)
  if (grossSale > grownBalance) {
    return { balance: grownBalance - grossSale, basis: 0, realizedTax: grossSale - cashNeeded, feasible: false }
  }
  const basisRemoved = Math.min(basis, grossSale * basis / grownBalance)
  return {
    balance: grownBalance - grossSale,
    basis: Math.max(0, basis - basisRemoved),
    realizedTax: grossSale - cashNeeded,
    feasible: true
  }
}
function annualizedIrr(initialCapital: number, monthlyCashFlows: number[], terminalValue: number): number | null {
  const cashFlows = [-initialCapital, ...monthlyCashFlows.map((flow, index) => index === monthlyCashFlows.length - 1 ? terminalValue - flow : -flow)]
  const npv = (rate: number) => cashFlows.reduce((sum, flow, month) => sum + flow / ((1 + rate) ** month), 0)
  // A -50% monthly lower bound avoids numeric overflow over long horizons.
  // Portfolio returns below this bound are not economically meaningful here.
  let low = -0.5
  let high = 1
  let lowValue = npv(low)
  let highValue = npv(high)

  while (lowValue * highValue > 0 && high < 1024) {
    high *= 2
    highValue = npv(high)
  }
  if (!Number.isFinite(lowValue) || !Number.isFinite(highValue) || lowValue * highValue > 0) return null

  for (let i = 0; i < 200; i++) {
    const mid = (low + high) / 2
    const midValue = npv(mid)
    if (Math.abs(midValue) < 0.000001) {
      return ((1 + mid) ** 12 - 1) * 100
    }
    if (lowValue * midValue <= 0) high = mid
    else {
      low = mid
      lowValue = midValue
    }
  }
  return ((1 + ((low + high) / 2)) ** 12 - 1) * 100
}

function liquidateStock(grossValue: number, basis: number, taxRate: number) {
  const tax = Math.max(0, grossValue - basis) * taxRate
  return { tax, netValue: grossValue - tax }
}

export function calculateComparison(scenario: Scenario): ComparisonResult {
  const months = Math.max(1, Math.round(scenario.years * 12))
  const mortgageMonths = Math.max(1, Math.round(scenario.mortgageTermYears * 12))
  const loanAmount = Math.max(0, scenario.homePrice - scenario.downPaymentAmount)
  const mortgageMonthlyRate = scenario.mortgageRatePercent / 100 / 12
  const stockMonthlyRate = (1 + scenario.stockReturnPercent / 100) ** (1 / 12) - 1
  const federalTaxRate = scenario.marginalFederalTaxRatePercent / 100
  const capitalGainsTaxRate = scenario.longTermCapitalGainsTaxRatePercent / 100
  const purchaseCosts = scenario.homePrice * scenario.purchaseCostPercent / 100
  const initialCapital = scenario.downPaymentAmount + purchaseCosts
  const fixedMonthlyBudget = scenario.monthlyBudget > 0 ? scenario.monthlyBudget : null
  const mortgagePayment = loanAmount === 0
    ? 0
    : mortgageMonthlyRate === 0
      ? loanAmount / mortgageMonths
      : loanAmount * mortgageMonthlyRate / (1 - (1 + mortgageMonthlyRate) ** -mortgageMonths)

  let mortgageBalance = loanAmount
  let buyerStock = 0
  let buyerStockBasis = 0
  let renterStock = initialCapital
  let renterStockBasis = initialCapital
  let buyerRealizedStockTax = 0
  let renterRealizedStockTax = 0
  let totalInterestDeduction = 0
  let totalPropertyTaxDeduction = 0
  let totalTaxSavings = 0
  let cashFlowIsFeasible = true
  const sharedCashFlows: number[] = []
  const housingDecisionContributions: number[] = []

  for (let month = 0; month < months; month++) {
    const year = Math.floor(month / 12)
    const propertyTax = scenario.annualPropertyTax * ((1 + scenario.propertyTaxGrowthPercent / 100) ** year) / 12
    const maintenance = scenario.annualMaintenance * ((1 + scenario.maintenanceGrowthPercent / 100) ** year) / 12
    const insurance = scenario.annualInsurance * ((1 + scenario.insuranceGrowthPercent / 100) ** year) / 12
    const hoa = scenario.monthlyHoa * ((1 + scenario.hoaGrowthPercent / 100) ** year)
    const rent = scenario.monthlyRent * ((1 + scenario.rentGrowthPercent / 100) ** year)
    const rentersInsurance = scenario.annualRentersInsurance / 12

    let interest = 0
    let payment = 0
    if (month < mortgageMonths && mortgageBalance > 0) {
      interest = mortgageBalance * mortgageMonthlyRate
      payment = Math.min(mortgagePayment, mortgageBalance + interest)
      mortgageBalance = Math.max(0, mortgageBalance - (payment - interest))
    }

    const taxSavings = (interest + propertyTax) * federalTaxRate
    const buyerHousingCost = payment + propertyTax + maintenance + insurance + hoa - taxSavings
    // Continue the scheduled mortgage-payment cash flow after payoff so the
    // buyer invests that freed-up amount for the rest of the comparison.
    const ownershipPathBudget = mortgagePayment + propertyTax + maintenance + insurance + hoa - taxSavings
    const sharedCashFlow = fixedMonthlyBudget ?? ownershipPathBudget
    const renterHousingCost = rent + rentersInsurance
    const buyerContribution = sharedCashFlow - buyerHousingCost
    const renterContribution = sharedCashFlow - renterHousingCost
    sharedCashFlows.push(sharedCashFlow)
    // Comparable rent is the monthly value of housing consumed in either path.
    // Removing it from the shared household budget leaves the incremental cash
    // committed to the housing decision: the renter invests this amount, while
    // the owner receives the same value as avoided rent.
    housingDecisionContributions.push(renterContribution)
    const buyerAccount = updateStockAccount(buyerStock, buyerStockBasis, buyerContribution, stockMonthlyRate, capitalGainsTaxRate)
    buyerStock = buyerAccount.balance
    buyerStockBasis = buyerAccount.basis
    buyerRealizedStockTax += buyerAccount.realizedTax
    const renterAccount = updateStockAccount(renterStock, renterStockBasis, renterContribution, stockMonthlyRate, capitalGainsTaxRate)
    renterStock = renterAccount.balance
    renterStockBasis = renterAccount.basis
    renterRealizedStockTax += renterAccount.realizedTax
    if (!buyerAccount.feasible || !renterAccount.feasible) cashFlowIsFeasible = false
    totalInterestDeduction += interest
    totalPropertyTaxDeduction += propertyTax
    totalTaxSavings += taxSavings
  }

  const buyerStockLiquidation = liquidateStock(buyerStock, buyerStockBasis, capitalGainsTaxRate)
  const renterStockLiquidation = liquidateStock(renterStock, renterStockBasis, capitalGainsTaxRate)
  const grossHomeValue = scenario.homePrice * ((1 + scenario.appreciationPercent / 100) ** scenario.years)
  const sellingCosts = grossHomeValue * scenario.saleCostPercent / 100
  const taxableHomeGain = Math.max(0, grossHomeValue - sellingCosts - scenario.homePrice - purchaseCosts - 250000)
  const homeCapitalGainsTax = taxableHomeGain * capitalGainsTaxRate
  const netHomeProceeds = Math.max(0, grossHomeValue - sellingCosts - mortgageBalance - homeCapitalGainsTax)
  const buyerTerminalValue = netHomeProceeds + buyerStockLiquidation.netValue
  const renterTerminalValue = renterStockLiquidation.netValue

  const strategy = (terminalValue: number, grossStockValue: number, netStockValue: number, stockTax: number, stockContributions: number): StrategyResult => ({
    annualizedIrrPercent: cashFlowIsFeasible ? annualizedIrr(initialCapital, housingDecisionContributions, terminalValue) : null,
    terminalValue,
    grossStockValue,
    netStockValue,
    stockTax,
    stockContributions
  })

  return {
    buyer: {
      ...strategy(buyerTerminalValue, buyerStock, buyerStockLiquidation.netValue, buyerStockLiquidation.tax + buyerRealizedStockTax, buyerStockBasis),
      grossHomeValue,
      mortgageBalance,
      sellingCosts,
      homeCapitalGainsTax,
      netHomeProceeds,
      totalInterestDeduction,
      totalPropertyTaxDeduction,
      totalTaxSavings
    },
    renter: strategy(renterTerminalValue, renterStock, renterStockLiquidation.netValue, renterStockLiquidation.tax + renterRealizedStockTax, renterStockBasis),
    initialCapital,
    months,
    totalSharedCashFlow: sharedCashFlows.reduce((sum, value) => sum + value, 0),
    effectiveMonthlyBudget: sharedCashFlows.reduce((sum, value) => sum + value, 0) / months,
    cashFlowIsFeasible
  }
}
