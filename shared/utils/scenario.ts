import type { Scenario } from '../types/scenario'

/** Illustrative inputs, not market forecasts. Return fresh state for each scenario. */
export function createDefaultScenario(): Scenario {
  return {
    years: 30,
    monthlyBudget: 0,
    homePrice: 600000,
    downPaymentAmount: 120000,
    mortgageRatePercent: 6.5,
    marginalFederalTaxRatePercent: 24,
    mortgageTermYears: 30,
    appreciationPercent: 3,
    annualPropertyTax: 7200,
    propertyTaxGrowthPercent: 2,
    annualMaintenance: 6000,
    maintenanceGrowthPercent: 2,
    annualInsurance: 1800,
    insuranceGrowthPercent: 2,
    monthlyHoa: 100,
    hoaGrowthPercent: 2,
    purchaseCostPercent: 3,
    saleCostPercent: 6,
    monthlyRent: 2800,
    rentGrowthPercent: 3,
    annualRentersInsurance: 240,
    stockReturnPercent: 7,
    longTermCapitalGainsTaxRatePercent: 15
  }
}
