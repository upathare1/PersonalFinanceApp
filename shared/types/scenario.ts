/** All rates are annual percentages (e.g. 6.5 means 6.5%). All amounts are USD. */
export interface Scenario {
  years: number
  monthlyBudget: number
  homePrice: number
  downPaymentAmount: number
  mortgageRatePercent: number
  marginalFederalTaxRatePercent: number
  mortgageTermYears: number
  appreciationPercent: number
  annualPropertyTax: number
  propertyTaxGrowthPercent: number
  annualMaintenance: number
  maintenanceGrowthPercent: number
  annualInsurance: number
  insuranceGrowthPercent: number
  monthlyHoa: number
  hoaGrowthPercent: number
  purchaseCostPercent: number
  saleCostPercent: number
  monthlyRent: number
  rentGrowthPercent: number
  annualRentersInsurance: number
  stockReturnPercent: number
  longTermCapitalGainsTaxRatePercent: number
}
