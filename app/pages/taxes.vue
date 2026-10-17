<script setup lang="ts">
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

type TaxState = 'MA' | 'CA'

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

interface ConfigTaxBracket {
  from: number
  to?: number
  ratePercent: number
}

interface CalculatorConfig {
  federalStandardDeduction: number
  massachusettsSurtaxFloor: number
  socialSecurityMaximumTaxableWage: number
  federalTaxBrackets: ConfigTaxBracket[]
}

type NumberInputValue = string | number

interface CalculationPayload {
  taxState: TaxState
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
    label: 'State Tax Withholding',
    description: 'Automatically tracks calculated state tax, but can be edited manually.',
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

const stateOptions = [
  { label: 'Massachusetts', value: 'MA' },
  { label: 'California', value: 'CA' }
]

const defaultCalculatorConfig: CalculatorConfig = {
  federalStandardDeduction: 16100,
  massachusettsSurtaxFloor: 1107750,
  socialSecurityMaximumTaxableWage: 184500,
  federalTaxBrackets: [
    { from: 0, to: 12400, ratePercent: 10 },
    { from: 12400, to: 50400, ratePercent: 12 },
    { from: 50400, to: 105700, ratePercent: 22 },
    { from: 105700, to: 201775, ratePercent: 24 },
    { from: 201775, to: 256225, ratePercent: 32 },
    { from: 256225, to: 640600, ratePercent: 35 },
    { from: 640600, ratePercent: 37 }
  ]
}

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

const calculatorConfig = reactive<CalculatorConfig>({
  federalStandardDeduction: defaultCalculatorConfig.federalStandardDeduction,
  massachusettsSurtaxFloor: defaultCalculatorConfig.massachusettsSurtaxFloor,
  socialSecurityMaximumTaxableWage: defaultCalculatorConfig.socialSecurityMaximumTaxableWage,
  federalTaxBrackets: defaultCalculatorConfig.federalTaxBrackets.map(bracket => ({ ...bracket }))
})

const selectedState = ref<TaxState>('MA')
const selectedStateName = computed(() => selectedState.value === 'CA' ? 'California' : 'Massachusetts')
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
  calculatorConfig.federalStandardDeduction = defaultCalculatorConfig.federalStandardDeduction
  calculatorConfig.massachusettsSurtaxFloor = defaultCalculatorConfig.massachusettsSurtaxFloor
  calculatorConfig.socialSecurityMaximumTaxableWage = defaultCalculatorConfig.socialSecurityMaximumTaxableWage
  calculatorConfig.federalTaxBrackets.splice(
    0,
    calculatorConfig.federalTaxBrackets.length,
    ...defaultCalculatorConfig.federalTaxBrackets.map(bracket => ({ ...bracket }))
  )
}

const addFederalTaxBracket = () => {
  const lastBracket = calculatorConfig.federalTaxBrackets.at(-1)

  calculatorConfig.federalTaxBrackets.push({
    from: lastBracket?.to ?? lastBracket?.from ?? 0,
    ratePercent: lastBracket?.ratePercent ?? 0
  })
}

const removeFederalTaxBracket = (index: number) => {
  if (calculatorConfig.federalTaxBrackets.length <= 1) {
    return
  }

  calculatorConfig.federalTaxBrackets.splice(index, 1)
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

const calculationPayload = computed<CalculationPayload>(() => ({
  taxState: selectedState.value,
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
    federalStandardDeduction: calculatorConfig.federalStandardDeduction,
    massachusettsSurtaxFloor: calculatorConfig.massachusettsSurtaxFloor,
    socialSecurityMaximumTaxableWage: calculatorConfig.socialSecurityMaximumTaxableWage,
    federalTaxBrackets: calculatorConfig.federalTaxBrackets.map(bracket => ({ ...bracket }))
  }
}))

const stateTaxInputSignature = computed(() => JSON.stringify({
  taxState: selectedState.value,
  income: { ...income },
  adjustments: { ...adjustments },
  deductions: {
    mortgageInterest: optionalDeductions.mortgageInterest,
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
    massachusettsSurtaxFloor: calculatorConfig.massachusettsSurtaxFloor,
    socialSecurityMaximumTaxableWage: calculatorConfig.socialSecurityMaximumTaxableWage
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
          optionalDeductions.stateTaxesWithholding = Math.round(results.stateTax * 100) / 100
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
    version: 2,
    exportedAt: new Date().toISOString(),
    taxState: selectedState.value,
    income: { ...income },
    adjustments: { ...adjustments },
    optionalDeductions: { ...optionalDeductions },
    calculatorConfig: {
      federalStandardDeduction: calculatorConfig.federalStandardDeduction,
      massachusettsSurtaxFloor: calculatorConfig.massachusettsSurtaxFloor,
      socialSecurityMaximumTaxableWage: calculatorConfig.socialSecurityMaximumTaxableWage,
      federalTaxBrackets: calculatorConfig.federalTaxBrackets.map(bracket => ({ ...bracket }))
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
      taxState?: TaxState
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

    selectedState.value = importedData.taxState === 'CA' ? 'CA' : 'MA'

    for (const input of incomeInputs) {
      income[input.key] = importedData.income?.[input.key]
    }

    for (const input of adjustmentInputs) {
      adjustments[input.key] = importedData.adjustments?.[input.key]
    }

    for (const input of optionalDeductionInputs) {
      optionalDeductions[input.key] = importedData.optionalDeductions?.[input.key] ?? 0
    }

    if (importedData.calculatorConfig) {
      calculatorConfig.federalStandardDeduction = importedData.calculatorConfig.federalStandardDeduction
        ?? defaultCalculatorConfig.federalStandardDeduction
      calculatorConfig.massachusettsSurtaxFloor = importedData.calculatorConfig.massachusettsSurtaxFloor
        ?? defaultCalculatorConfig.massachusettsSurtaxFloor
      calculatorConfig.socialSecurityMaximumTaxableWage = importedData.calculatorConfig.socialSecurityMaximumTaxableWage
        ?? defaultCalculatorConfig.socialSecurityMaximumTaxableWage
      calculatorConfig.federalTaxBrackets.splice(
        0,
        calculatorConfig.federalTaxBrackets.length,
        ...(importedData.calculatorConfig.federalTaxBrackets ?? defaultCalculatorConfig.federalTaxBrackets)
          .map(bracket => ({ ...bracket }))
      )
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
    <div class="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div class="max-w-4xl">
        <h1 class="text-3xl font-semibold tracking-normal text-highlighted sm:text-4xl">
          Income Tax Calculator
        </h1>

        <p class="mt-3 text-base leading-7 text-muted">
          To estimate your net income and state and federal taxes, enter income, contributions, and deductions amounts below. The tax calculator assumes a "Single" filing status for a full-year resident of {{ selectedStateName }}.
        </p>
      </div>

      <UFormField
        label="State of residence"
        name="taxState"
        class="w-full shrink-0 sm:w-56"
      >
        <USelect
          v-model="selectedState"
          :items="stateOptions"
          value-key="value"
          size="xl"
          class="w-full"
          aria-label="State of residence"
        />
      </UFormField>
    </div>

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
                  Federal Tax Brackets
                </h3>

                <div class="flex items-center gap-2">
                  <UButton
                    label="Reset"
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
                    State Tax
                  </dt>
                  <dd class="mt-1 text-xl font-semibold text-highlighted">
                    {{ formatCurrency(calculationResults.stateTax) }}
                  </dd>
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
  </UContainer>
</template>
