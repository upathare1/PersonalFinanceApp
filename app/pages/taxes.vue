<script setup lang="ts">
import { isProvisionalStateEstimate, resolveTaxState, stateOptions, taxStates, type TaxState } from '#shared/utils/tax-states'
import { getStateSchedule } from '#shared/utils/state-income-tax-rules'
import { californiaBehavioralHealthTax, createCalculatorConfig, defaultTaxYear, getTaxYearRules, massachusettsIncomeTaxRates, newYorkBracketStarts, newYorkCityBrackets, newYorkStateSchedules, resolveTaxYear, taxYears, type CalculatorConfig, type TaxYear } from '#shared/utils/tax-years'

type IncomeKey
  = | 'wageIncome'
    | 'taxableBenefits'
    | 'interestIncome'
    | 'longTermCapitalGains'
    | 'shortTermCapitalGains'
    | 'otherInvestmentIncome'

type AdjustmentKey
  = | 'retirement401kContributions'
    | 'healthInsurancePayments'
    | 'hsaContributions'

type OptionalDeductionKey
  = | 'mortgageInterest'
    | 'propertyTaxes'
    | 'stateTaxesWithholding'
    | 'investmentExpenses'
    | 'massachusettsRent'
    | 'carryOverCapitalLoss'

interface IncomeInput {
  key: IncomeKey
  label: string
  description: string
  examples?: string[]
  icon: string
}

interface AdjustmentInput {
  key: AdjustmentKey
  label: string
  description: string
  icon: string
}

interface OptionalDeductionInput {
  key: OptionalDeductionKey
  label: string
  description: string
  tooltip?: string
  icon: string
}

type NumberInputValue = string | number

interface CalculationPayload {
  taxYear: TaxYear
  taxState: TaxState
  washingtonEligibleGains?: number
  nycResident: boolean
  newYorkInputs: { additions: number, subtractions: number, itemizedDeduction: number }
  income: Record<IncomeKey, number | undefined>
  adjustments: Record<AdjustmentKey, number | undefined>
  optionalDeductions: Record<OptionalDeductionKey, number>
  interestBreakdown: {
    stateTaxExempt: number
    notStateTaxExempt: number
  }
  hsaBreakdown: {
    employeeContributions: number
    employerContributions: number
  }
  calculatorConfig: CalculatorConfig
}

interface CalculationResults {
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
  retirement401kContributions: number
  hsaEmployeeContributionAmount: number
  effectiveTaxRate: number
  marginalTaxRateWageIncome: number
  marginalTaxRateInvestmentIncome: number
  marginalTaxRateLongTermIncome: number
  netIncome: number
  netIncomeMinusInvestmentIncome: number
}

const incomeInputs: IncomeInput[] = [
  {
    key: 'wageIncome',
    label: 'Wage Income',
    description: 'W-2 wages, salary, bonuses, and earned compensation.',
    icon: 'i-lucide-briefcase-business'
  },
  {
    key: 'taxableBenefits',
    label: 'Taxable Benefits',
    description: 'Employer-provided benefits or fringe benefits treated as taxable income.',
    examples: ['Gym', 'Bike Share Memberships'],
    icon: 'i-lucide-badge-dollar-sign'
  },
  {
    key: 'interestIncome',
    label: 'Interest Income',
    description: 'Bank interest, CDs, Treasury interest, and taxable bond interest.',
    icon: 'i-lucide-landmark'
  },
  {
    key: 'longTermCapitalGains',
    label: 'Long Term Capital Gains and Qualified Dividends',
    description: 'Long-term capital gains plus dividends eligible for preferred tax rates.',
    icon: 'i-lucide-chart-line'
  },
  {
    key: 'shortTermCapitalGains',
    label: 'Short Term Capital Gains and Non-Qualified Dividends',
    description: 'Short-term capital gains plus dividends taxed at ordinary income rates.',
    icon: 'i-lucide-trending-up'
  },
  {
    key: 'otherInvestmentIncome',
    label: 'Other Investment Income',
    description: 'Rent, passive income, royalties, or other investment returns.',
    icon: 'i-lucide-wallet-cards'
  }
]

const adjustmentInputs: AdjustmentInput[] = [
  {
    key: 'retirement401kContributions',
    label: '401(k) Contributions',
    description: 'Pre-tax retirement contributions withheld from wages.',
    icon: 'i-lucide-piggy-bank'
  },
  {
    key: 'healthInsurancePayments',
    label: 'Health Insurance Payments',
    description: 'Premiums or payroll deductions for health coverage.',
    icon: 'i-lucide-heart-pulse'
  },
  {
    key: 'hsaContributions',
    label: 'HSA Contributions',
    description: 'Health savings account contributions for the tax year.',
    icon: 'i-lucide-shield-plus'
  }
]

const optionalDeductionInputs: OptionalDeductionInput[] = [
  {
    key: 'mortgageInterest',
    label: 'Mortgage Interest',
    description: 'Mortgage interest that may qualify for deduction treatment.',
    icon: 'i-lucide-house'
  },
  {
    key: 'propertyTaxes',
    label: 'Property Taxes',
    description: 'Property taxes paid that may qualify for deduction treatment.',
    icon: 'i-lucide-landmark'
  },
  {
    key: 'stateTaxesWithholding',
    label: 'State / Local Tax Withholding',
    description: 'Automatically tracks calculated state and NYC taxes (after modeled credits), but can be edited manually.',
    icon: 'i-lucide-file-minus'
  },
  {
    key: 'investmentExpenses',
    label: 'Eligible Investment Expenses',
    description: 'Eligible investment-related expenses for the tax year.',
    tooltip: 'Enter only the deductible amount after applicable limits. Eligible investment interest (such as margin interest, subject to itemization and limits) and qualifying rental expenses can reduce taxable income and net investment income. Investment advisory, management, and custodial fees generally cannot.',
    icon: 'i-lucide-receipt-text'
  },
  {
    key: 'massachusettsRent',
    label: 'Rent (Massachusetts)',
    description: 'Rent paid for Massachusetts deduction calculations.',
    icon: 'i-lucide-building-2'
  },
  {
    key: 'carryOverCapitalLoss',
    label: 'Carry-Over Capital Loss',
    description: 'Capital losses carried over from prior tax years.',
    icon: 'i-lucide-trending-down'
  }
]

const income = reactive<Record<IncomeKey, number | undefined>>({
  wageIncome: undefined,
  taxableBenefits: undefined,
  interestIncome: undefined,
  longTermCapitalGains: undefined,
  shortTermCapitalGains: undefined,
  otherInvestmentIncome: undefined
})

const adjustments = reactive<Record<AdjustmentKey, number | undefined>>({
  retirement401kContributions: undefined,
  healthInsurancePayments: undefined,
  hsaContributions: undefined
})

const optionalDeductions = reactive<Record<OptionalDeductionKey, number>>({
  mortgageInterest: 0,
  propertyTaxes: 0,
  stateTaxesWithholding: 0,
  investmentExpenses: 0,
  massachusettsRent: 0,
  carryOverCapitalLoss: 0
})

const selectedYear = ref<TaxYear>(defaultTaxYear)
const yearOptions = taxYears.map(year => ({ label: String(year), value: year }))
const stateRulesYear = computed(() => getTaxYearRules(selectedYear.value).stateRulesYear)
const configsByYear = reactive<Record<TaxYear, CalculatorConfig>>({
  2025: createCalculatorConfig(2025),
  2026: createCalculatorConfig(2026),
  2027: createCalculatorConfig(2027)
})
const calculatorConfig = computed(() => configsByYear[selectedYear.value])

const selectedState = ref<TaxState>('MA')
const nycResident = ref(false)
const washingtonEligibleGains = ref<number>()
const newYorkInputs = reactive({ additions: 0, subtractions: 0, itemizedDeduction: 0 })
const newYorkFields = [
  { key: 'additions' as const, label: 'New York additions to income', description: 'Taxable NY additions not included above, such as other-state municipal bond interest.' },
  { key: 'subtractions' as const, label: 'New York subtractions from income', description: 'Eligible NY subtractions not already entered, such as qualifying pension income. Do not repeat state-exempt interest.' },
  { key: 'itemizedDeduction' as const, label: 'New York itemized deduction (after limits)', description: 'Optional: enter your total allowable IT-196 deduction after all NY limits. Otherwise the $8,000 standard deduction applies. Federal mortgage/property tax entries do not automatically populate this total.' }
]
const selectedStateName = computed(() => taxStates[selectedState.value])
const selectedStateBrackets = computed<readonly (readonly [number, number])[] | undefined>(() => {
  switch (selectedState.value) {
    case 'MA':
      return [
        [0, massachusettsIncomeTaxRates.base],
        [Math.max(calculatorConfig.value.massachusettsSurtaxFloor, 0) || getTaxYearRules(selectedYear.value).massachusettsSurtaxFloor, massachusettsIncomeTaxRates.aboveSurtaxFloor]
      ]
    case 'CA':
      return getTaxYearRules(selectedYear.value).california.brackets.map(({ from, ratePercent }) => [from, ratePercent])
    case 'NY':
      return newYorkStateSchedules[selectedYear.value].rates.map((rate, index) => [newYorkBracketStarts[index]!, rate])
    default:
      return getStateSchedule(selectedState.value, selectedYear.value)?.brackets
  }
})
const interestBreakdownExpanded = ref(false)
const hsaBreakdownExpanded = ref(false)
const optionalDeductionsExpanded = ref(false)
const calculatorAssumptionsExpanded = ref(false)
const interestStateTaxExempt = ref<number | undefined>(undefined)
const hsaEmployerContributions = ref<number | undefined>(undefined)
const importInput = ref<HTMLInputElement | null>(null)
const calculationError = ref<string | null>(null)
const exportFileName = ref(`tax-calculator-inputs-${new Date().toISOString().slice(0, 10)}.json`)
const exportDialogOpen = ref(false)
const defaultCalculationResults: CalculationResults = {
  federalOrdinaryIncome: 0,
  ficaWage: 0,
  stateTaxableIncome: 0,
  longTermTaxableIncome: 0,
  netInvestmentTaxableIncome: 0,
  federalTax: 0,
  ficaTax: 0,
  stateTax: 0,
  cityTax: 0,
  cityTaxCredits: 0,
  longTermTax: 0,
  netInvestmentIncomeTax: 0,
  totalTax: 0,
  retirement401kContributions: 0,
  hsaEmployeeContributionAmount: 0,
  effectiveTaxRate: 0,
  marginalTaxRateWageIncome: 0,
  marginalTaxRateInvestmentIncome: 0,
  marginalTaxRateLongTermIncome: 0,
  netIncome: 0,
  netIncomeMinusInvestmentIncome: 0
}
const calculationResults = ref<CalculationResults>({ ...defaultCalculationResults })

const normalizeAmount = (value: number | undefined) => Math.max(value ?? 0, 0)
const clampAmount = (value: number | undefined, max: number) => Math.min(normalizeAmount(value), max)

const interestIncomeTotal = computed(() => normalizeAmount(income.interestIncome))
const hsaContributionTotal = computed(() => normalizeAmount(adjustments.hsaContributions))

const stateTaxExemptInterest = computed({
  get: () => clampAmount(interestStateTaxExempt.value, interestIncomeTotal.value),
  set: (value: number | undefined) => {
    interestStateTaxExempt.value = clampAmount(value, interestIncomeTotal.value)
  }
})

const notStateTaxExemptInterest = computed({
  get: () => interestIncomeTotal.value - stateTaxExemptInterest.value,
  set: (value: number | undefined) => {
    interestStateTaxExempt.value = interestIncomeTotal.value - clampAmount(value, interestIncomeTotal.value)
  }
})

const hsaEmployerContributionAmount = computed({
  get: () => clampAmount(hsaEmployerContributions.value, hsaContributionTotal.value),
  set: (value: number | undefined) => {
    hsaEmployerContributions.value = clampAmount(value, hsaContributionTotal.value)
  }
})

const hsaEmployeeContributionAmount = computed({
  get: () => hsaContributionTotal.value - hsaEmployerContributionAmount.value,
  set: (value: number | undefined) => {
    hsaEmployerContributions.value = hsaContributionTotal.value - clampAmount(value, hsaContributionTotal.value)
  }
})

watch(interestIncomeTotal, (total) => {
  interestStateTaxExempt.value = clampAmount(interestStateTaxExempt.value, total)
})

watch(hsaContributionTotal, (total) => {
  hsaEmployerContributions.value = clampAmount(hsaEmployerContributions.value, total)
})

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(value)

const formatNumberInput = (value: number | undefined) =>
  new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 2
  }).format(value ?? 0)

const parseNumberInput = (value: NumberInputValue) => {
  const parsedValue = Number(String(value).replaceAll(',', ''))

  return Number.isFinite(parsedValue) ? parsedValue : 0
}

const parseOptionalNumberInput = (value: NumberInputValue) => {
  const stringValue = String(value).trim()

  if (!stringValue) {
    return undefined
  }

  return parseNumberInput(stringValue)
}

const formatPercent = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value)

const resetCalculatorConfig = () => {
  configsByYear[selectedYear.value] = createCalculatorConfig(selectedYear.value)
}

const addFederalTaxBracket = () => {
  const lastBracket = calculatorConfig.value.federalTaxBrackets.at(-1)

  calculatorConfig.value.federalTaxBrackets.push({
    from: lastBracket?.to ?? lastBracket?.from ?? 0,
    ratePercent: lastBracket?.ratePercent ?? 0
  })
}

const removeFederalTaxBracket = (index: number) => {
  if (calculatorConfig.value.federalTaxBrackets.length <= 1) {
    return
  }

  calculatorConfig.value.federalTaxBrackets.splice(index, 1)
}

const normalizeJsonFileName = (fileName: string) => {
  const trimmedFileName = fileName.trim()
  const fallbackFileName = `tax-calculator-inputs-${new Date().toISOString().slice(0, 10)}`
  const baseFileName = trimmedFileName || fallbackFileName

  return baseFileName.toLowerCase().endsWith('.json')
    ? baseFileName
    : `${baseFileName}.json`
}

const optionalDeductionTotalPlaceholder = computed(() => {
  const mortgageInterest = optionalDeductions.mortgageInterest
  const propertyTaxes = optionalDeductions.propertyTaxes
  const stateTaxesWithholding = optionalDeductions.stateTaxesWithholding
  const investmentExpenses = optionalDeductions.investmentExpenses
  const massachusettsRent = optionalDeductions.massachusettsRent
  const carryOverCapitalLoss = optionalDeductions.carryOverCapitalLoss

  // TODO: Replace with your actual optional deduction formula.
  const applicableRent = selectedState.value === 'MA' ? massachusettsRent : 0

  return mortgageInterest + propertyTaxes + stateTaxesWithholding + investmentExpenses + applicableRent + carryOverCapitalLoss
})

const activeTaxView = ref('calculator')
const taxViews = [
  { label: 'Calculator', value: 'calculator', slot: 'calculator', icon: 'i-lucide-calculator' },
  { label: 'Compare', value: 'compare', slot: 'compare', icon: 'i-lucide-chart-bar' }
]

const calculationPayload = computed<CalculationPayload>(() => ({
  taxYear: selectedYear.value,
  taxState: selectedState.value,
  washingtonEligibleGains: washingtonEligibleGains.value,
  nycResident: selectedState.value === 'NY' && nycResident.value,
  newYorkInputs: { ...newYorkInputs },
  income: { ...income },
  adjustments: { ...adjustments },
  optionalDeductions: { ...optionalDeductions },
  interestBreakdown: {
    stateTaxExempt: stateTaxExemptInterest.value,
    notStateTaxExempt: notStateTaxExemptInterest.value
  },
  hsaBreakdown: {
    employeeContributions: hsaEmployeeContributionAmount.value,
    employerContributions: hsaEmployerContributionAmount.value
  },
  calculatorConfig: {
    federalStandardDeduction: calculatorConfig.value.federalStandardDeduction,
    massachusettsSurtaxFloor: calculatorConfig.value.massachusettsSurtaxFloor,
    socialSecurityMaximumTaxableWage: calculatorConfig.value.socialSecurityMaximumTaxableWage,
    federalTaxBrackets: calculatorConfig.value.federalTaxBrackets.map(bracket => ({ ...bracket }))
  }
}))

const stateTaxInputSignature = computed(() => JSON.stringify({
  taxYear: selectedYear.value,
  taxState: selectedState.value,
  washingtonEligibleGains: washingtonEligibleGains.value,
  nycResident: selectedState.value === 'NY' && nycResident.value,
  newYorkInputs: { ...newYorkInputs },
  income: { ...income },
  adjustments: { ...adjustments },
  deductions: {
    mortgageInterest: optionalDeductions.mortgageInterest,
    propertyTaxes: optionalDeductions.propertyTaxes,
    investmentExpenses: optionalDeductions.investmentExpenses,
    massachusettsRent: optionalDeductions.massachusettsRent,
    carryOverCapitalLoss: optionalDeductions.carryOverCapitalLoss
  },
  interestBreakdown: {
    stateTaxExempt: stateTaxExemptInterest.value,
    notStateTaxExempt: notStateTaxExemptInterest.value
  },
  hsaEmployeeContributions: hsaEmployeeContributionAmount.value,
  stateConfig: {
    massachusettsSurtaxFloor: calculatorConfig.value.massachusettsSurtaxFloor,
    socialSecurityMaximumTaxableWage: calculatorConfig.value.socialSecurityMaximumTaxableWage
  }
}))

let calculationRequestId = 0
let lastAutoWithholdingSignature = ''

watch(
  calculationPayload,
  async (payload) => {
    const requestId = ++calculationRequestId
    const requestedStateTaxSignature = stateTaxInputSignature.value

    try {
      const results = await $fetch<CalculationResults>('/api/taxes', {
        method: 'POST',
        body: payload
      })

      if (requestId === calculationRequestId) {
        calculationResults.value = results
        calculationError.value = null

        if (requestedStateTaxSignature !== lastAutoWithholdingSignature) {
          lastAutoWithholdingSignature = requestedStateTaxSignature
          optionalDeductions.stateTaxesWithholding = Math.round(Math.max(0, results.stateTax + results.cityTax) * 100) / 100
        }
      }
    } catch (error) {
      if (requestId === calculationRequestId) {
        console.error(error)
        calculationResults.value = { ...defaultCalculationResults }
        calculationError.value = 'Calculations are temporarily unavailable.'
      }
    }
  },
  { immediate: true }
)

const exportInputs = () => {
  const data = {
    version: 4,
    taxYear: selectedYear.value,
    exportedAt: new Date().toISOString(),
    taxState: selectedState.value,
    washingtonEligibleGains: washingtonEligibleGains.value,
    nycResident: selectedState.value === 'NY' && nycResident.value,
    newYorkInputs: { ...newYorkInputs },
    income: { ...income },
    adjustments: { ...adjustments },
    optionalDeductions: { ...optionalDeductions },
    calculatorConfig: {
      federalStandardDeduction: calculatorConfig.value.federalStandardDeduction,
      massachusettsSurtaxFloor: calculatorConfig.value.massachusettsSurtaxFloor,
      socialSecurityMaximumTaxableWage: calculatorConfig.value.socialSecurityMaximumTaxableWage,
      federalTaxBrackets: calculatorConfig.value.federalTaxBrackets.map(bracket => ({ ...bracket }))
    },
    interestBreakdown: {
      stateTaxExempt: stateTaxExemptInterest.value,
      notStateTaxExempt: notStateTaxExemptInterest.value
    },
    hsaBreakdown: {
      employeeContributions: hsaEmployeeContributionAmount.value,
      employerContributions: hsaEmployerContributionAmount.value
    }
  }

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = normalizeJsonFileName(exportFileName.value)
  link.click()
  URL.revokeObjectURL(url)
  exportDialogOpen.value = false
}

const importInputs = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]

  if (!file) {
    return
  }

  try {
    const importedData = JSON.parse(await file.text()) as {
      taxYear?: unknown
      taxState?: unknown
      washingtonEligibleGains?: number
      nycResident?: boolean
      newYorkInputs?: Partial<typeof newYorkInputs>
      income?: Partial<Record<IncomeKey, number>>
      adjustments?: Partial<Record<AdjustmentKey, number>>
      optionalDeductions?: Partial<Record<OptionalDeductionKey, number>>
      calculatorConfig?: Partial<CalculatorConfig>
      interestBreakdown?: {
        stateTaxExempt?: number
        notStateTaxExempt?: number
      }
      hsaBreakdown?: {
        employeeContributions?: number
        employerContributions?: number
      }
    }

    selectedYear.value = resolveTaxYear(importedData.taxYear)
    selectedState.value = resolveTaxState(importedData.taxState)
    washingtonEligibleGains.value = importedData.washingtonEligibleGains === undefined
      ? undefined
      : normalizeAmount(importedData.washingtonEligibleGains)
    nycResident.value = selectedState.value === 'NY' && importedData.nycResident === true
    for (const field of newYorkFields) {
      newYorkInputs[field.key] = normalizeAmount(importedData.newYorkInputs?.[field.key])
    }

    for (const input of incomeInputs) {
      income[input.key] = importedData.income?.[input.key]
    }

    for (const input of adjustmentInputs) {
      adjustments[input.key] = importedData.adjustments?.[input.key]
    }

    for (const input of optionalDeductionInputs) {
      optionalDeductions[input.key] = importedData.optionalDeductions?.[input.key] ?? 0
    }

    const defaults = createCalculatorConfig(selectedYear.value)
    const overrides = importedData.calculatorConfig
    configsByYear[selectedYear.value] = {
      federalStandardDeduction: overrides?.federalStandardDeduction ?? defaults.federalStandardDeduction,
      massachusettsSurtaxFloor: overrides?.massachusettsSurtaxFloor ?? defaults.massachusettsSurtaxFloor,
      socialSecurityMaximumTaxableWage: overrides?.socialSecurityMaximumTaxableWage ?? defaults.socialSecurityMaximumTaxableWage,
      federalTaxBrackets: (overrides?.federalTaxBrackets ?? defaults.federalTaxBrackets).map(bracket => ({ ...bracket }))
    }

    stateTaxExemptInterest.value = importedData.interestBreakdown?.stateTaxExempt ?? 0

    if (importedData.hsaBreakdown) {
      hsaEmployerContributionAmount.value = importedData.hsaBreakdown.employerContributions
        ?? hsaContributionTotal.value - normalizeAmount(importedData.hsaBreakdown.employeeContributions)
    } else {
      hsaEmployerContributionAmount.value = 0
    }

    interestBreakdownExpanded.value = !!importedData.interestBreakdown
    hsaBreakdownExpanded.value = !!importedData.hsaBreakdown
    optionalDeductionsExpanded.value = !!importedData.optionalDeductions
    calculatorAssumptionsExpanded.value = !!importedData.calculatorConfig
  } finally {
    target.value = ''
  }
}
</script>

<template>
  <UContainer class="py-8 sm:py-10">
    <UTabs
      v-model="activeTaxView"
      :items="taxViews"
      :unmount-on-hide="false"
      size="md"
      color="primary"
      :ui="{
        root: 'items-start gap-6',
        list: 'w-fit gap-0.5 rounded-lg border border-default bg-muted',
        trigger: 'min-h-9 text-xs font-semibold data-[state=active]:text-primary sm:text-sm',
        leadingIcon: 'size-4',
        indicator: 'bg-default ring ring-default'
      }"
    >
      <template #calculator>
        <div class="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div class="max-w-4xl">
            <h1 class="text-3xl font-semibold tracking-normal text-highlighted sm:text-4xl">
              Income Tax Calculator
            </h1>

            <p class="mt-3 text-base leading-7 text-muted">
              To estimate your net income and state and federal taxes, enter income, contributions, and deductions amounts below. The tax calculator assumes a "Single" filing status for a full-year resident of {{ selectedStateName }}.
            </p>
          </div>

          <div class="grid w-full shrink-0 grid-cols-1 gap-3 min-[420px]:grid-cols-[6.5rem_minmax(0,1fr)] sm:w-[23rem]">
            <UFormField
              label="Tax year"
              name="taxYear"
            >
              <USelect
                v-model="selectedYear"
                :items="yearOptions"
                value-key="value"
                size="xl"
                class="w-full"
                aria-label="Tax year"
              />
            </UFormField>

            <UFormField
              label="State of residence"
              name="taxState"
            >
              <USelectMenu
                v-model="selectedState"
                :items="stateOptions"
                value-key="value"
                size="xl"
                class="w-full"
                aria-label="State of residence"
                :ui="{
                  value: 'min-w-0 overflow-visible text-clip whitespace-normal text-left',
                  itemLabel: 'min-w-0 overflow-visible text-clip whitespace-normal'
                }"
              />
            </UFormField>
          </div>
        </div>

        <section
          v-if="selectedState === 'NY'"
          class="mb-6 space-y-4 rounded-lg border border-default p-5"
          aria-label="New York residency and adjustments"
        >
          <UCheckbox
            v-model="nycResident"
            label="Full-year New York City resident"
            description="Adds NYC resident income tax. Working in NYC alone does not make you a city resident."
          />
          <p class="text-sm leading-6 text-muted">
            Estimates assume a single filer who cannot be claimed as a dependent. Includes state tax-benefit recapture, household credits, and NYC school-tax credits. Other credits, Yonkers taxes, and self-employment MCTMT are not modeled.
          </p>
          <details>
            <summary class="cursor-pointer text-sm font-medium text-primary">
              New York income adjustments and itemized deductions
            </summary>
            <div class="mt-4 grid gap-4 sm:grid-cols-3">
              <UFormField
                v-for="field in newYorkFields"
                :key="field.key"
                :label="field.label"
                :description="field.description"
              >
                <UInput
                  :model-value="formatNumberInput(newYorkInputs[field.key])"
                  inputmode="decimal"
                  class="w-full"
                  :aria-label="field.label"
                  @update:model-value="newYorkInputs[field.key] = parseNumberInput($event)"
                />
              </UFormField>
            </div>
          </details>
        </section>

        <UAlert
          v-if="isProvisionalStateEstimate(selectedState, selectedYear)"
          class="mb-6"
          color="warning"
          variant="soft"
          icon="i-lucide-info"
          :title="`Provisional ${selectedYear} state estimate`"
          :description="selectedState === 'MA'
            ? `The Massachusetts surtax threshold defaults to the ${stateRulesYear} amount until the ${selectedYear} threshold is published. You can override it in Advanced Configurations.`
            : `Some ${selectedYear} state figures use prior-year values, preliminary schedules, or published estimates.`"
        />

        <section
          v-if="selectedState === 'WA'"
          class="mb-6 rounded-lg border border-default p-5"
          aria-label="Washington capital gains"
        >
          <UFormField
            label="Long-term gains taxable in Washington before the state deduction"
            description="Leave blank to use the full long-term gains input. Enter the eligible amount if it includes qualified dividends or exempt gains such as real estate. Enter 0 when none of it qualifies."
          >
            <UInput
              :model-value="washingtonEligibleGains === undefined ? '' : formatNumberInput(washingtonEligibleGains)"
              inputmode="decimal"
              class="w-full max-w-xs"
              aria-label="Long-term gains taxable in Washington before the state deduction"
              @update:model-value="washingtonEligibleGains = parseOptionalNumberInput($event)"
            />
          </UFormField>
        </section>

        <details
          v-if="selectedStateBrackets"
          class="mb-6 rounded-lg border border-default p-4"
        >
          <summary class="cursor-pointer text-sm font-medium text-primary">
            {{ selectedStateName }} state income tax rates
          </summary>
          <dl class="mt-3 grid max-w-md grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1 text-sm">
            <template
              v-for="[from, rate] in selectedStateBrackets"
              :key="from"
            >
              <dt>{{ ['MA', 'CA', 'NY'].includes(selectedState) ? 'Taxable income' : 'Income' }} over {{ formatCurrency(from) }}</dt>
              <dd class="text-right tabular-nums">
                {{ rate }}%
              </dd>
            </template>
          </dl>
          <p
            v-if="selectedState === 'CA'"
            class="mt-3 text-sm text-muted"
          >
            California adds a {{ californiaBehavioralHealthTax.ratePercent }}% Behavioral Health Services Tax on taxable income over {{ formatCurrency(californiaBehavioralHealthTax.from) }}.
          </p>
          <p
            v-if="selectedState === 'NY'"
            class="mt-3 text-sm text-muted"
          >
            New York State's tax-benefit recapture can increase the tax calculated from these brackets.
          </p>
          <template v-if="selectedState === 'NY' && nycResident">
            <h3 class="mt-4 text-sm font-medium text-highlighted">
              New York City resident income tax rates
            </h3>
            <dl class="mt-2 grid max-w-md grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1 text-sm">
              <template
                v-for="{ from, ratePercent } in newYorkCityBrackets"
                :key="from"
              >
                <dt>Taxable income over {{ formatCurrency(from) }}</dt>
                <dd class="text-right tabular-nums">
                  {{ ratePercent }}%
                </dd>
              </template>
            </dl>
          </template>
          <p class="mt-3 text-sm text-muted">
            State-specific deductions and credits can affect the estimate. Local income taxes outside NYC and separate state payroll charges are excluded.
          </p>
        </details>

        <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div class="space-y-6">
            <section class="rounded-lg border border-default bg-default">
              <div class="border-b border-default px-5 py-4 sm:px-6">
                <h2 class="text-lg font-semibold text-highlighted">
                  Income Details
                </h2>
              </div>

              <div class="divide-y divide-default">
                <div
                  v-for="input in incomeInputs"
                  :key="input.key"
                  class="grid gap-4 px-5 py-5 sm:grid-cols-[1fr_240px] sm:items-center sm:px-6"
                >
                  <div class="flex gap-3">
                    <div class="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <UIcon
                        :name="input.icon"
                        class="size-5"
                      />
                    </div>

                    <div>
                      <UFormField
                        :label="input.label"
                        :name="input.key"
                        class="[&>label]:text-base [&>label]:font-semibold"
                      >
                        <p class="mt-1 text-sm leading-6 text-muted">
                          {{ input.description }}
                          <template v-if="input.examples?.length">
                            Examples:
                            <span
                              v-for="(example, index) in input.examples"
                              :key="example"
                            >
                              {{ example }}{{ index === input.examples.length - 1 ? '.' : ', ' }}
                            </span>
                          </template>
                        </p>
                      </UFormField>
                    </div>
                  </div>

                  <UInput
                    :model-value="formatNumberInput(income[input.key])"
                    type="text"
                    :min="0"
                    :step="100"
                    inputmode="decimal"
                    placeholder="0"
                    icon="i-lucide-dollar-sign"
                    size="xl"
                    class="w-full"
                    @update:model-value="income[input.key] = parseNumberInput($event)"
                  />

                  <div
                    v-if="input.key === 'interestIncome'"
                    class="sm:col-span-2"
                  >
                    <UButton
                      :icon="interestBreakdownExpanded ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
                      color="neutral"
                      variant="ghost"
                      size="sm"
                      class="px-0"
                      :label="interestBreakdownExpanded ? 'Hide interest breakdown' : 'Show interest breakdown'"
                      @click="interestBreakdownExpanded = !interestBreakdownExpanded"
                    />

                    <div
                      v-if="interestBreakdownExpanded"
                      class="mt-3 grid gap-3 rounded-lg border border-default bg-muted/30 p-4 sm:grid-cols-2"
                    >
                      <UFormField
                        :label="`${selectedStateName} Tax Exempt`"
                        name="stateTaxExemptInterest"
                      >
                        <UInput
                          :model-value="formatNumberInput(stateTaxExemptInterest)"
                          type="text"
                          :min="0"
                          :max="interestIncomeTotal"
                          :step="100"
                          inputmode="decimal"
                          placeholder="0"
                          icon="i-lucide-dollar-sign"
                          class="w-full"
                          @update:model-value="stateTaxExemptInterest = parseNumberInput($event)"
                        />
                      </UFormField>

                      <UFormField
                        :label="`Not ${selectedStateName} Tax Exempt`"
                        name="notStateTaxExemptInterest"
                      >
                        <UInput
                          :model-value="formatNumberInput(notStateTaxExemptInterest)"
                          type="text"
                          :min="0"
                          :max="interestIncomeTotal"
                          :step="100"
                          inputmode="decimal"
                          placeholder="0"
                          icon="i-lucide-dollar-sign"
                          class="w-full"
                          @update:model-value="notStateTaxExemptInterest = parseNumberInput($event)"
                        />
                      </UFormField>

                      <p class="text-sm text-muted sm:col-span-2">
                        Breakdown total: {{ formatCurrency(stateTaxExemptInterest + notStateTaxExemptInterest) }}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section class="rounded-lg border border-default bg-default">
              <div class="border-b border-default px-5 py-4 sm:px-6">
                <h2 class="text-lg font-semibold text-highlighted">
                  Adjustments & Contributions
                </h2>
              </div>

              <div class="divide-y divide-default">
                <div
                  v-for="input in adjustmentInputs"
                  :key="input.key"
                  class="grid gap-4 px-5 py-5 sm:grid-cols-[1fr_240px] sm:items-center sm:px-6"
                >
                  <div class="flex gap-3">
                    <div class="flex size-10 shrink-0 items-center justify-center rounded-md bg-info/10 text-info">
                      <UIcon
                        :name="input.icon"
                        class="size-5"
                      />
                    </div>

                    <div>
                      <UFormField
                        :label="input.label"
                        :name="input.key"
                        class="[&>label]:text-base [&>label]:font-semibold"
                      >
                        <p class="mt-1 text-sm leading-6 text-muted">
                          {{ input.description }}
                        </p>
                      </UFormField>
                    </div>
                  </div>

                  <UInput
                    :model-value="formatNumberInput(adjustments[input.key])"
                    type="text"
                    :min="0"
                    :step="100"
                    inputmode="decimal"
                    placeholder="0"
                    icon="i-lucide-dollar-sign"
                    size="xl"
                    class="w-full"
                    @update:model-value="adjustments[input.key] = parseNumberInput($event)"
                  />

                  <div
                    v-if="input.key === 'hsaContributions'"
                    class="sm:col-span-2"
                  >
                    <UButton
                      :icon="hsaBreakdownExpanded ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
                      color="neutral"
                      variant="ghost"
                      size="sm"
                      class="px-0"
                      :label="hsaBreakdownExpanded ? 'Hide HSA breakdown' : 'Show HSA breakdown'"
                      @click="hsaBreakdownExpanded = !hsaBreakdownExpanded"
                    />

                    <div
                      v-if="hsaBreakdownExpanded"
                      class="mt-3 grid gap-3 rounded-lg border border-default bg-muted/30 p-4 sm:grid-cols-2"
                    >
                      <UFormField
                        label="Employee Contributions"
                        name="hsaEmployeeContributions"
                      >
                        <UInput
                          :model-value="formatNumberInput(hsaEmployeeContributionAmount)"
                          type="text"
                          :min="0"
                          :max="hsaContributionTotal"
                          :step="100"
                          inputmode="decimal"
                          placeholder="0"
                          icon="i-lucide-dollar-sign"
                          class="w-full"
                          @update:model-value="hsaEmployeeContributionAmount = parseNumberInput($event)"
                        />
                      </UFormField>

                      <UFormField
                        label="Employer Contributions"
                        name="hsaEmployerContributions"
                      >
                        <UInput
                          :model-value="formatNumberInput(hsaEmployerContributionAmount)"
                          type="text"
                          :min="0"
                          :max="hsaContributionTotal"
                          :step="100"
                          inputmode="decimal"
                          placeholder="0"
                          icon="i-lucide-dollar-sign"
                          class="w-full"
                          @update:model-value="hsaEmployerContributionAmount = parseNumberInput($event)"
                        />
                      </UFormField>

                      <p class="text-sm text-muted sm:col-span-2">
                        Breakdown total: {{ formatCurrency(hsaEmployeeContributionAmount + hsaEmployerContributionAmount) }}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section class="rounded-lg border border-default bg-default">
              <button
                type="button"
                class="flex w-full items-center justify-between gap-3 border-b border-default px-5 py-4 text-left sm:px-6"
                @click="optionalDeductionsExpanded = !optionalDeductionsExpanded"
              >
                <span>
                  <span class="block text-lg font-semibold text-highlighted">
                    Optional Deductions
                  </span>
                  <span class="mt-1 block text-sm text-muted">
                    {{ formatCurrency(optionalDeductionTotalPlaceholder) }} currently entered
                  </span>
                </span>

                <UIcon
                  :name="optionalDeductionsExpanded ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
                  class="size-5 shrink-0 text-muted"
                />
              </button>

              <div
                v-if="optionalDeductionsExpanded"
                class="divide-y divide-default"
              >
                <template
                  v-for="input in optionalDeductionInputs"
                  :key="input.key"
                >
                  <div
                    v-if="input.key !== 'massachusettsRent' || selectedState === 'MA'"
                    class="grid gap-4 px-5 py-5 sm:grid-cols-[1fr_240px] sm:items-center sm:px-6"
                  >
                    <div class="flex gap-3">
                      <div class="flex size-10 shrink-0 items-center justify-center rounded-md bg-warning/10 text-warning">
                        <UIcon
                          :name="input.icon"
                          class="size-5"
                        />
                      </div>

                      <div>
                        <UFormField
                          :label="input.label"
                          :name="input.key"
                          class="[&>label]:text-base [&>label]:font-semibold"
                        >
                          <template #label>
                            <span class="inline-flex items-center gap-1">
                              {{ input.label }}
                              <UTooltip
                                v-if="input.tooltip"
                                :text="input.tooltip"
                                :ui="{
                                  content: 'max-w-[min(20rem,calc(100vw-2rem))] h-auto',
                                  text: 'whitespace-normal overflow-visible text-clip break-words'
                                }"
                              >
                                <UButton
                                  icon="i-lucide-circle-help"
                                  color="neutral"
                                  variant="ghost"
                                  size="xs"
                                  class="size-5 shrink-0 p-0"
                                  :aria-label="`${input.label} description`"
                                />
                              </UTooltip>
                            </span>
                          </template>
                          <p class="mt-1 text-sm leading-6 text-muted">
                            {{ input.description }}
                          </p>
                        </UFormField>
                      </div>
                    </div>

                    <UInput
                      :model-value="formatNumberInput(optionalDeductions[input.key])"
                      type="text"
                      :min="0"
                      :step="100"
                      inputmode="decimal"
                      placeholder="0"
                      icon="i-lucide-dollar-sign"
                      size="xl"
                      class="w-full"
                      @update:model-value="optionalDeductions[input.key] = parseNumberInput($event)"
                    />
                  </div>
                </template>
              </div>
            </section>

            <section class="rounded-lg border border-default bg-default">
              <button
                type="button"
                class="flex w-full items-center justify-between gap-3 border-b border-default px-5 py-4 text-left sm:px-6"
                @click="calculatorAssumptionsExpanded = !calculatorAssumptionsExpanded"
              >
                <span>
                  <span class="block text-lg font-semibold text-highlighted">
                    Advanced Configurations
                  </span>
                  <span class="mt-1 block text-sm text-muted">
                    Federal brackets, standard deduction, Social Security wage base<span v-if="selectedState === 'MA'">, and Massachusetts surtax floor</span>
                  </span>
                </span>

                <UIcon
                  :name="calculatorAssumptionsExpanded ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
                  class="size-5 shrink-0 text-muted"
                />
              </button>

              <div
                v-if="calculatorAssumptionsExpanded"
                class="space-y-6 px-5 py-5 sm:px-6"
              >
                <div class="grid gap-4 md:grid-cols-3">
                  <UFormField
                    label="Federal Standard Deduction"
                    name="federalStandardDeduction"
                    class="[&>label]:flex [&>label]:min-h-10 [&>label]:items-end"
                  >
                    <UInput
                      :model-value="formatNumberInput(calculatorConfig.federalStandardDeduction)"
                      type="text"
                      :min="0"
                      :step="100"
                      inputmode="decimal"
                      icon="i-lucide-dollar-sign"
                      class="w-full"
                      @update:model-value="calculatorConfig.federalStandardDeduction = parseNumberInput($event)"
                    />
                  </UFormField>

                  <UFormField
                    v-if="selectedState === 'MA'"
                    label="Massachusetts Surtax Floor"
                    name="massachusettsSurtaxFloor"
                    class="[&>label]:flex [&>label]:min-h-10 [&>label]:items-end"
                  >
                    <UInput
                      :model-value="formatNumberInput(calculatorConfig.massachusettsSurtaxFloor)"
                      type="text"
                      :min="0"
                      :step="1000"
                      inputmode="decimal"
                      icon="i-lucide-dollar-sign"
                      class="w-full"
                      @update:model-value="calculatorConfig.massachusettsSurtaxFloor = parseNumberInput($event)"
                    />
                  </UFormField>

                  <UFormField
                    label="Social Security Wage Ceiling"
                    name="socialSecurityMaximumTaxableWage"
                    class="[&>label]:flex [&>label]:min-h-10 [&>label]:items-end"
                  >
                    <UInput
                      :model-value="formatNumberInput(calculatorConfig.socialSecurityMaximumTaxableWage)"
                      type="text"
                      :min="0"
                      :step="100"
                      inputmode="decimal"
                      icon="i-lucide-dollar-sign"
                      class="w-full"
                      @update:model-value="calculatorConfig.socialSecurityMaximumTaxableWage = parseNumberInput($event)"
                    />
                  </UFormField>
                </div>

                <div>
                  <div class="mb-3 flex items-center justify-between gap-3">
                    <h3 class="text-sm font-semibold text-highlighted">
                      {{ selectedYear }} Federal Tax Brackets
                    </h3>

                    <div class="flex items-center gap-2">
                      <UButton
                        label="Reset to year defaults"
                        icon="i-lucide-rotate-ccw"
                        color="neutral"
                        variant="ghost"
                        size="sm"
                        @click="resetCalculatorConfig"
                      />

                      <UButton
                        label="Add Bracket"
                        icon="i-lucide-plus"
                        color="neutral"
                        variant="subtle"
                        size="sm"
                        @click="addFederalTaxBracket"
                      />
                    </div>
                  </div>

                  <div class="overflow-x-auto">
                    <table class="w-full min-w-[640px] text-left text-sm">
                      <thead class="border-b border-default text-muted">
                        <tr>
                          <th class="py-2 pr-3 font-medium">
                            From
                          </th>
                          <th class="px-3 py-2 font-medium">
                            To
                          </th>
                          <th class="px-3 py-2 font-medium">
                            Rate %
                          </th>
                          <th class="py-2 pl-3 text-right font-medium">
                            Actions
                          </th>
                        </tr>
                      </thead>

                      <tbody class="divide-y divide-default">
                        <tr
                          v-for="(bracket, index) in calculatorConfig.federalTaxBrackets"
                          :key="index"
                        >
                          <td class="py-3 pr-3">
                            <UInput
                              :model-value="formatNumberInput(bracket.from)"
                              type="text"
                              :min="0"
                              :step="100"
                              inputmode="decimal"
                              icon="i-lucide-dollar-sign"
                              class="w-full"
                              @update:model-value="bracket.from = parseNumberInput($event)"
                            />
                          </td>

                          <td class="px-3 py-3">
                            <UInput
                              :model-value="bracket.to === undefined ? '' : formatNumberInput(bracket.to)"
                              type="text"
                              :min="0"
                              :step="100"
                              inputmode="decimal"
                              placeholder="No cap"
                              icon="i-lucide-dollar-sign"
                              class="w-full"
                              @update:model-value="bracket.to = parseOptionalNumberInput($event)"
                            />
                          </td>

                          <td class="px-3 py-3">
                            <UInput
                              v-model.number="bracket.ratePercent"
                              type="number"
                              :min="0"
                              :step="0.01"
                              inputmode="decimal"
                              class="w-full"
                            />
                          </td>

                          <td class="py-3 pl-3 text-right">
                            <UButton
                              icon="i-lucide-trash-2"
                              color="neutral"
                              variant="ghost"
                              size="sm"
                              aria-label="Remove federal tax bracket"
                              :disabled="calculatorConfig.federalTaxBrackets.length <= 1"
                              @click="removeFederalTaxBracket(index)"
                            />
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <aside class="space-y-4">
            <section class="rounded-lg border border-default bg-default p-5">
              <div class="flex items-center justify-between gap-3">
                <h2 class="text-lg font-semibold text-highlighted">
                  Load & Save Calculator Inputs
                </h2>

                <UIcon
                  name="i-lucide-file-json"
                  class="size-5 text-muted"
                />
              </div>

              <div class="mt-5 grid gap-3">
                <UButton
                  label="Import Tax Inputs"
                  icon="i-lucide-upload"
                  color="neutral"
                  variant="subtle"
                  block
                  @click="importInput?.click()"
                />

                <UButton
                  label="Export Tax Inputs"
                  icon="i-lucide-download"
                  color="primary"
                  variant="solid"
                  block
                  @click="exportDialogOpen = true"
                />
              </div>

              <input
                ref="importInput"
                type="file"
                accept="application/json,.json"
                class="hidden"
                @change="importInputs"
              >

              <UModal
                v-model:open="exportDialogOpen"
                title="Export Tax Inputs"
                description="Choose a JSON file name for this calculator export."
              >
                <template #body>
                  <form
                    id="export-tax-inputs-form"
                    @submit.prevent="exportInputs"
                  >
                    <UFormField
                      label="File name"
                      name="exportFileName"
                    >
                      <UInput
                        v-model="exportFileName"
                        type="text"
                        icon="i-lucide-file-json"
                        placeholder="tax-calculator-inputs.json"
                        autofocus
                        class="w-full"
                      />
                    </UFormField>
                  </form>
                </template>

                <template #footer="{ close }">
                  <div class="flex w-full justify-end gap-2">
                    <UButton
                      label="Cancel"
                      color="neutral"
                      variant="ghost"
                      @click="close"
                    />
                    <UButton
                      label="Export Tax Inputs"
                      icon="i-lucide-download"
                      color="primary"
                      type="submit"
                      form="export-tax-inputs-form"
                    />
                  </div>
                </template>
              </UModal>
            </section>

            <section class="rounded-lg border border-default bg-default p-5">
              <div class="flex items-center justify-between gap-3">
                <h2 class="text-lg font-semibold text-highlighted">
                  Calculations
                </h2>

                <UIcon
                  name="i-lucide-braces"
                  class="size-5 text-muted"
                />
              </div>

              <div class="mt-5 space-y-6">
                <div>
                  <h3 class="text-sm font-semibold text-highlighted">
                    Taxable Income
                  </h3>

                  <dl class="mt-3 space-y-4">
                    <div>
                      <dt class="text-sm font-medium text-muted">
                        Federal Ordinary Taxable Income
                      </dt>
                      <dd class="mt-1 text-xl font-semibold text-highlighted">
                        {{ formatCurrency(calculationResults.federalOrdinaryIncome) }}
                      </dd>
                    </div>

                    <div>
                      <dt class="text-sm font-medium text-muted">
                        FICA Taxable Income
                      </dt>
                      <dd class="mt-1 text-xl font-semibold text-highlighted">
                        {{ formatCurrency(calculationResults.ficaWage) }}
                      </dd>
                    </div>

                    <div>
                      <dt class="text-sm font-medium text-muted">
                        State Taxable Income
                      </dt>
                      <dd class="mt-1 text-xl font-semibold text-highlighted">
                        {{ formatCurrency(calculationResults.stateTaxableIncome) }}
                      </dd>
                    </div>

                    <div>
                      <dt class="text-sm font-medium text-muted">
                        Long Term Gains Taxable Income
                      </dt>
                      <dd class="mt-1 text-xl font-semibold text-highlighted">
                        {{ formatCurrency(calculationResults.longTermTaxableIncome) }}
                      </dd>
                    </div>

                    <div>
                      <dt class="text-sm font-medium text-muted">
                        Net Investment Taxable Income
                      </dt>
                      <dd class="mt-1 text-xl font-semibold text-highlighted">
                        {{ formatCurrency(calculationResults.netInvestmentTaxableIncome) }}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div class="border-t border-default pt-5">
                  <h3 class="text-sm font-semibold text-highlighted">
                    Taxes
                  </h3>

                  <dl class="mt-3 space-y-4">
                    <div>
                      <dt class="text-sm font-medium text-muted">
                        Federal Tax
                      </dt>
                      <dd class="mt-1 text-xl font-semibold text-highlighted">
                        {{ formatCurrency(calculationResults.federalTax) }}
                      </dd>
                    </div>

                    <div>
                      <dt class="text-sm font-medium text-muted">
                        FICA Tax
                      </dt>
                      <dd class="mt-1 text-xl font-semibold text-highlighted">
                        {{ formatCurrency(calculationResults.ficaTax) }}
                      </dd>
                    </div>

                    <div>
                      <dt class="text-sm font-medium text-muted">
                        {{ selectedState === 'NY' ? 'New York State Tax' : 'State Tax' }}
                      </dt>
                      <dd class="mt-1 text-xl font-semibold text-highlighted">
                        {{ formatCurrency(calculationResults.stateTax) }}
                      </dd>
                    </div>

                    <div v-if="selectedState === 'NY' && nycResident">
                      <dt class="text-sm font-medium text-muted">
                        NYC Resident Tax
                      </dt>
                      <dd class="mt-1 text-xl font-semibold text-highlighted">
                        {{ formatCurrency(calculationResults.cityTax) }}
                      </dd>
                      <p class="mt-1 text-xs text-muted">
                        Includes {{ formatCurrency(calculationResults.cityTaxCredits) }} in modeled NYC credits. A negative tax represents refundable credits.
                      </p>
                    </div>

                    <div>
                      <dt class="text-sm font-medium text-muted">
                        Long Term Gains Tax
                      </dt>
                      <dd class="mt-1 text-xl font-semibold text-highlighted">
                        {{ formatCurrency(calculationResults.longTermTax) }}
                      </dd>
                    </div>

                    <div>
                      <dt class="text-sm font-medium text-muted">
                        Net Investment Income Tax
                      </dt>
                      <dd class="mt-1 text-xl font-semibold text-highlighted">
                        {{ formatCurrency(calculationResults.netInvestmentIncomeTax) }}
                      </dd>
                    </div>

                    <div class="border-t border-default pt-4">
                      <dt class="text-sm font-medium text-muted">
                        Total Tax
                      </dt>
                      <dd class="mt-1 text-2xl font-semibold text-highlighted">
                        {{ formatCurrency(calculationResults.totalTax) }}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div class="border-t border-default pt-5">
                  <h3 class="text-sm font-semibold text-highlighted">
                    Retirement and HSA Contributions
                  </h3>

                  <dl class="mt-3 space-y-4">
                    <div>
                      <dt class="text-sm font-medium text-muted">
                        401(k) (Employee)
                      </dt>
                      <dd class="mt-1 text-xl font-semibold text-highlighted">
                        {{ formatCurrency(calculationResults.retirement401kContributions) }}
                      </dd>
                    </div>

                    <div>
                      <dt class="text-sm font-medium text-muted">
                        HSA Contributions (Employee)
                      </dt>
                      <dd class="mt-1 text-xl font-semibold text-highlighted">
                        {{ formatCurrency(calculationResults.hsaEmployeeContributionAmount) }}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div class="border-t border-default pt-5">
                  <h3 class="text-sm font-semibold text-highlighted">
                    Summary
                  </h3>

                  <dl class="mt-3 space-y-4">
                    <div>
                      <dt class="flex items-center gap-1 text-sm font-medium text-muted">
                        <span>Effective Tax Rate</span>
                        <UTooltip text="Total tax as a percentage of all income, excluding taxable benefits.">
                          <UButton
                            icon="i-lucide-circle-help"
                            color="neutral"
                            variant="ghost"
                            size="xs"
                            class="size-5 p-0"
                            aria-label="Effective Tax Rate description"
                          />
                        </UTooltip>
                      </dt>
                      <dd class="mt-1 text-xl font-semibold text-highlighted">
                        {{ formatPercent(calculationResults.effectiveTaxRate) }}
                      </dd>
                    </div>

                    <div>
                      <dt class="text-sm font-medium text-muted">
                        Marginal Tax Rate (Wage Income)
                      </dt>
                      <dd class="mt-1 text-xl font-semibold text-highlighted">
                        {{ formatPercent(calculationResults.marginalTaxRateWageIncome) }}
                      </dd>
                    </div>

                    <div>
                      <dt class="text-sm font-medium text-muted">
                        Marginal Tax Rate (Investment Income)
                      </dt>
                      <dd class="mt-1 text-xl font-semibold text-highlighted">
                        {{ formatPercent(calculationResults.marginalTaxRateInvestmentIncome) }}
                      </dd>
                    </div>

                    <div>
                      <dt class="text-sm font-medium text-muted">
                        Marginal Tax Rate (Long Term & Qualified Income)
                      </dt>
                      <dd class="mt-1 text-xl font-semibold text-highlighted">
                        {{ formatPercent(calculationResults.marginalTaxRateLongTermIncome) }}
                      </dd>
                    </div>

                    <div class="border-t border-default pt-4">
                      <dt class="flex items-center gap-1 text-sm font-medium text-muted">
                        <span>Net Income</span>
                        <UTooltip text="All income minus taxes, taxable benefits, contributions, and health insurance.">
                          <UButton
                            icon="i-lucide-circle-help"
                            color="neutral"
                            variant="ghost"
                            size="xs"
                            class="size-5 p-0"
                            aria-label="Net Income description"
                          />
                        </UTooltip>
                      </dt>
                      <dd class="mt-1 text-2xl font-semibold text-highlighted">
                        {{ formatCurrency(calculationResults.netIncome) }}
                      </dd>
                    </div>

                    <div>
                      <dt class="flex items-center gap-1 text-sm font-medium text-muted">
                        <span>Net Wage Income</span>
                        <UTooltip text="All income minus taxes, taxable benefits, contributions, health insurance, and (gross) investment income.">
                          <UButton
                            icon="i-lucide-circle-help"
                            color="neutral"
                            variant="ghost"
                            size="xs"
                            class="size-5 p-0"
                            aria-label="Net Wage Income description"
                          />
                        </UTooltip>
                      </dt>
                      <dd class="mt-1 text-xl font-semibold text-highlighted">
                        {{ formatCurrency(calculationResults.netIncomeMinusInvestmentIncome) }}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </template>
      <template #compare>
        <TaxComparison
          v-if="activeTaxView === 'compare'"
          :scenario="calculationPayload"
        />
      </template>
    </UTabs>
  </UContainer>
</template>
