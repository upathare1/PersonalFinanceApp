<script setup lang="ts">
import type { ComparisonResult } from '#shared/types/calculation'
import { createDefaultScenario } from '#shared/utils/scenario'

const scenario = ref(createDefaultScenario())
const emptyResults: ComparisonResult = {
  buyer: {
    annualizedIrrPercent: null,
    terminalValue: 0,
    grossStockValue: 0,
    netStockValue: 0,
    stockTax: 0,
    stockContributions: 0,
    grossHomeValue: 0,
    mortgageBalance: 0,
    sellingCosts: 0,
    homeCapitalGainsTax: 0,
    netHomeProceeds: 0,
    totalInterestDeduction: 0,
    totalPropertyTaxDeduction: 0,
    totalTaxSavings: 0
  },
  renter: {
    annualizedIrrPercent: null,
    terminalValue: 0,
    grossStockValue: 0,
    netStockValue: 0,
    stockTax: 0,
    stockContributions: 0
  },
  initialCapital: 0,
  months: 0,
  totalSharedCashFlow: 0,
  effectiveMonthlyBudget: 0,
  cashFlowIsFeasible: true
}
const results = ref<ComparisonResult>(structuredClone(emptyResults))
const calculationError = ref('')
let calculationRequestId = 0

watch(
  scenario,
  async (value) => {
    const requestId = ++calculationRequestId
    try {
      const response = await $fetch<ComparisonResult>('/api/mortgage', {
        method: 'POST',
        body: structuredClone(toRaw(value))
      })
      if (requestId === calculationRequestId) {
        results.value = response
        calculationError.value = ''
      }
    } catch (error) {
      if (requestId === calculationRequestId) {
        console.error(error)
        calculationError.value = 'Calculations are temporarily unavailable.'
      }
    }
  },
  { deep: true, immediate: true }
)
const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
const percent = new Intl.NumberFormat('en-US', { style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2 })
const monthlyBudgetOpen = ref(false)

watch(() => scenario.value.monthlyBudget, (value) => {
  if (value > 0) monthlyBudgetOpen.value = true
}, { immediate: true })

function formatIrr(value: number | null) {
  return value === null ? '—' : percent.format(value / 100)
}
function reset() {
  scenario.value = createDefaultScenario()
}
</script>

<template>
  <UContainer class="py-8 sm:py-12">
    <div class="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div>
        <UBadge
          color="primary"
          variant="subtle"
          class="mb-3"
        >
          Buy vs. rent
        </UBadge>
        <h1 class="text-3xl font-semibold tracking-tight text-highlighted sm:text-4xl">
          Should I Buy?
        </h1>
        <p class="mt-3 max-w-2xl text-muted">
          Explore buying a home with a mortgage versus renting and investing in the stock market.
        </p>
      </div>
      <div class="flex flex-wrap justify-end gap-2">
        <PresetControls v-model="scenario" />
        <UButton
          color="neutral"
          variant="outline"
          icon="i-lucide-rotate-ccw"
          @click="reset"
        >
          Reset assumptions
        </UButton>
      </div>
    </div>

    <UCard class="mb-6">
      <div class="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
        <div>
          <h2 class="font-semibold text-highlighted">
            Shared time horizon
          </h2>
          <p class="mt-1 text-sm text-muted">
            Compare both paths over the same period. All amounts are in USD.
          </p>
        </div>
        <div class="sm:w-48">
          <AssumptionInput
            v-model="scenario.years"
            label="Comparison period"
            unit="years"
            :min="1"
            :max="50"
          />
        </div>
      </div>
      <UCollapsible
        v-model:open="monthlyBudgetOpen"
        class="mt-5 border-t border-default pt-4"
      >
        <UButton
          color="neutral"
          variant="ghost"
          class="-ml-2"
          :icon="monthlyBudgetOpen ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
        >
          Optional monthly budget
        </UButton>
        <template #content>
          <div class="mt-3 rounded-lg border border-default bg-elevated/40 p-4 sm:max-w-xl">
            <div class="flex items-start gap-2">
              <div class="min-w-0 flex-1">
                <AssumptionInput
                  v-model="scenario.monthlyBudget"
                  label="Monthly budget"
                  unit="$ / mo"
                  :min="0"
                  :step="100"
                />
                <p class="mt-1.5 text-xs text-muted">
                  Enter 0 to let the ownership path set the budget automatically.
                </p>
              </div>
              <UPopover
                :content="{ side: 'right', align: 'start' }"
                arrow
              >
                <UButton
                  aria-label="Why use a fixed monthly budget?"
                  icon="i-lucide-circle-question-mark"
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  class="mt-6 rounded-full p-0.5"
                />
                <template #content>
                  <div class="max-w-xs space-y-2 p-1 text-sm leading-5">
                    <p class="font-medium text-highlighted">
                      Why set a monthly budget?
                    </p>
                    <p class="text-muted">
                      It keeps your available cash constant when comparing mortgage terms. A lower payment then sends the savings into stocks instead of quietly assuming you save less that month.
                    </p>
                    <p class="text-muted">
                      Leave it at 0 for a single buy-versus-rent comparison, where the ownership path supplies the budget.
                    </p>
                  </div>
                </template>
              </UPopover>
            </div>
          </div>
        </template>
      </UCollapsible>
    </UCard>

    <div class="grid items-start gap-6 lg:grid-cols-2">
      <UCard>
        <template #header>
          <h2 class="flex items-center gap-2 text-lg font-semibold">
            <UIcon
              name="i-lucide-house"
              class="size-5 text-primary"
            /> Buy a home
          </h2>
          <p class="mt-1 text-sm text-muted">
            Home equity, mortgage payments, and ownership costs.
          </p>
        </template>
        <div class="grid gap-5 sm:grid-cols-2">
          <AssumptionInput
            v-model="scenario.homePrice"
            label="Purchase price"
            unit="$"
            :min="1"
            :step="1000"
          />
          <DownPaymentInput
            v-model="scenario.downPaymentAmount"
            :home-price="scenario.homePrice"
          />
          <AssumptionInput
            v-model="scenario.mortgageRatePercent"
            label="Mortgage interest rate"
            unit="% / yr"
            :min="0"
            :max="30"
            :step="0.1"
          />
          <div>
            <AssumptionInput
              v-model="scenario.marginalFederalTaxRatePercent"
              label="Marginal federal tax rate"
              unit="%"
              :min="0"
              :max="100"
              :step="0.1"
            />
            <p class="mt-1.5 text-xs text-muted">
              Used to value the mortgage interest deduction.
            </p>
          </div>
          <AssumptionInput
            v-model="scenario.mortgageTermYears"
            label="Mortgage term"
            unit="years"
            :min="1"
            :max="40"
          />
          <AssumptionInput
            v-model="scenario.appreciationPercent"
            label="Home appreciation"
            unit="% / yr"
            :min="-99"
            :step="0.1"
          />
          <RecurringCostInput
            v-model:amount="scenario.annualPropertyTax"
            v-model:growth="scenario.propertyTaxGrowthPercent"
            label="Property tax"
            :home-price="scenario.homePrice"
            allow-percent
          />
          <RecurringCostInput
            v-model:amount="scenario.annualMaintenance"
            v-model:growth="scenario.maintenanceGrowthPercent"
            label="Maintenance"
            :home-price="scenario.homePrice"
            allow-percent
          />
          <RecurringCostInput
            v-model:amount="scenario.annualInsurance"
            v-model:growth="scenario.insuranceGrowthPercent"
            label="Home insurance"
            :home-price="scenario.homePrice"
          />
          <RecurringCostInput
            v-model:amount="scenario.monthlyHoa"
            v-model:growth="scenario.hoaGrowthPercent"
            label="HOA fees"
            amount-unit="$ / mo"
            :amount-step="25"
            :home-price="scenario.homePrice"
          />
          <AssumptionInput
            v-model="scenario.purchaseCostPercent"
            label="Purchase closing costs"
            unit="%"
            :min="0"
            :max="100"
            :step="0.1"
          />
          <AssumptionInput
            v-model="scenario.saleCostPercent"
            label="Selling costs"
            unit="%"
            :min="0"
            :max="100"
            :step="0.1"
          />
        </div>
      </UCard>

      <div class="space-y-6">
        <UCard>
          <template #header>
            <h2 class="flex items-center gap-2 text-lg font-semibold">
              <UIcon
                name="i-lucide-chart-no-axes-combined"
                class="size-5 text-primary"
              /> Rent &amp; invest
            </h2>
            <p class="mt-1 text-sm text-muted">
              Rental costs and an invested stock portfolio.
            </p>
          </template>
          <div class="grid gap-5 sm:grid-cols-2">
            <AssumptionInput
              v-model="scenario.monthlyRent"
              label="Monthly rent"
              unit="$ / mo"
              :min="0"
              :step="100"
            />
            <AssumptionInput
              v-model="scenario.rentGrowthPercent"
              label="Annual rent increase"
              unit="% / yr"
              :min="-99"
              :step="0.1"
            />
            <AssumptionInput
              v-model="scenario.annualRentersInsurance"
              label="Renters insurance"
              unit="$ / yr"
              :min="0"
              :step="10"
            />
            <AssumptionInput
              v-model="scenario.stockReturnPercent"
              label="Stock market return"
              unit="% / yr"
              :min="-99"
              :step="0.1"
            />
            <AssumptionInput
              v-model="scenario.longTermCapitalGainsTaxRatePercent"
              label="Long-term capital gains tax rate"
              unit="%"
              :min="0"
              :max="100"
              :step="0.1"
            />
          </div>
        </UCard>
        <UCard variant="subtle">
          <h2 class="font-semibold text-highlighted">
            The comparison we’re building
          </h2>
          <p class="mt-2 text-sm leading-6 text-muted">
            Start with equal capital and use the ownership path as the shared cash-flow baseline. The renter invests the upfront purchase cash and the monthly difference after rent. Once the mortgage is paid off, the buyer invests the former mortgage payment.
          </p>
          <p class="mt-3 text-sm leading-6 text-muted">
            At the end of the period, compare net home sale proceeds plus investments against the renter’s investment portfolio, along with cash-flow-based annualized returns.
          </p>
        </UCard>
      </div>
    </div>

    <UCard class="mt-6">
      <template #header>
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h2 class="text-lg font-semibold">
            Portfolio comparison
          </h2>
          <UBadge
            color="primary"
            variant="subtle"
          >
            After-tax liquidation values
          </UBadge>
        </div>
      </template>
      <UAlert
        v-if="calculationError"
        color="error"
        variant="subtle"
        icon="i-lucide-circle-alert"
        title="Unable to update results"
        :description="calculationError"
        class="mb-6"
      />
      <UAlert
        v-if="!results.cashFlowIsFeasible"
        color="warning"
        variant="subtle"
        icon="i-lucide-triangle-alert"
        title="The selected budget needs additional cash"
        description="At some point, the budget cannot support one of the paths and its stock portfolio is exhausted. IRR is hidden because the strategies no longer have feasible matching cash flows."
        class="mb-6"
      />
      <div class="grid gap-6 sm:grid-cols-2">
        <div class="rounded-lg border border-default p-5">
          <h3 class="flex items-center gap-1.5 text-sm font-medium text-muted">
            <span>Buy a home · Economic IRR</span>
            <UPopover
              :content="{ side: 'right', align: 'start' }"
              arrow
            >
              <UButton
                aria-label="What is Economic IRR?"
                icon="i-lucide-circle-question-mark"
                color="neutral"
                variant="ghost"
                size="xs"
                class="-my-1 rounded-full p-0.5"
              />
              <template #content>
                <div class="max-w-xs space-y-2 p-1 text-sm leading-5">
                  <p>
                    Economic IRR asks: if buying and renting start with the same cash and monthly budget, which choice grows your wealth faster?
                  </p>
                  <p>
                    Owning gets credit for providing a home you would otherwise rent. Mortgage payments build equity, and after payoff the former payment goes into stocks. At the end, the house and stocks are sold and the full cash-flow history is expressed as one annual return.
                  </p>
                </div>
              </template>
            </UPopover>
          </h3>
          <p class="mt-2 text-3xl font-semibold text-primary">
            {{ formatIrr(results.buyer.annualizedIrrPercent) }}
          </p>
          <p class="mt-1 text-sm text-muted">
            Terminal value: <strong class="text-highlighted">{{ currency.format(results.buyer.terminalValue) }}</strong>
          </p>
          <dl class="mt-4 space-y-2 border-t border-default pt-4 text-sm">
            <div class="flex justify-between gap-4">
              <dt class="text-muted">
                Net home proceeds
              </dt><dd>{{ currency.format(results.buyer.netHomeProceeds) }}</dd>
            </div>
            <div class="flex justify-between gap-4">
              <dt class="text-muted">
                Net stock proceeds
              </dt><dd>{{ currency.format(results.buyer.netStockValue) }}</dd>
            </div>
            <div class="flex justify-between gap-4">
              <dt class="text-muted">
                Mortgage balance
              </dt><dd>{{ currency.format(results.buyer.mortgageBalance) }}</dd>
            </div>
            <div class="flex justify-between gap-4">
              <dt class="text-muted">
                Stock gains tax
              </dt><dd>{{ currency.format(results.buyer.stockTax) }}</dd>
            </div>
            <div class="flex justify-between gap-4">
              <dt class="text-muted">
                Home gains tax
              </dt><dd>{{ currency.format(results.buyer.homeCapitalGainsTax) }}</dd>
            </div>
            <div class="flex justify-between gap-4">
              <dt class="text-muted">
                Federal tax savings
              </dt><dd>{{ currency.format(results.buyer.totalTaxSavings) }}</dd>
            </div>
            <div class="flex justify-between gap-4 border-t border-default pt-2 font-medium">
              <dt class="text-muted">
                Effective monthly budget
              </dt><dd>{{ currency.format(results.effectiveMonthlyBudget) }}</dd>
            </div>
          </dl>
        </div>
        <div class="rounded-lg border border-default p-5">
          <h3 class="text-sm font-medium text-muted">
            Rent &amp; invest · Economic IRR
          </h3>
          <p class="mt-2 text-3xl font-semibold text-primary">
            {{ formatIrr(results.renter.annualizedIrrPercent) }}
          </p>
          <p class="mt-1 text-sm text-muted">
            Terminal value: <strong class="text-highlighted">{{ currency.format(results.renter.terminalValue) }}</strong>
          </p>
          <dl class="mt-4 space-y-2 border-t border-default pt-4 text-sm">
            <div class="flex justify-between gap-4">
              <dt class="text-muted">
                Gross stock value
              </dt><dd>{{ currency.format(results.renter.grossStockValue) }}</dd>
            </div>
            <div class="flex justify-between gap-4">
              <dt class="text-muted">
                Invested cost basis
              </dt><dd>{{ currency.format(results.renter.stockContributions) }}</dd>
            </div>
            <div class="flex justify-between gap-4">
              <dt class="text-muted">
                Stock gains tax
              </dt><dd>{{ currency.format(results.renter.stockTax) }}</dd>
            </div>
            <div class="flex justify-between gap-4 border-t border-default pt-2 font-medium">
              <dt class="text-muted">
                Effective monthly budget
              </dt><dd>{{ currency.format(results.effectiveMonthlyBudget) }}</dd>
            </div>
          </dl>
        </div>
      </div>
      <div class="mt-5 border-t border-default pt-4 text-xs leading-5 text-muted">
        <p class="mb-2 font-medium text-highlighted">
          Calculation overview &amp; assumptions
        </p>
        <ol class="list-decimal space-y-1.5 pl-4">
          <li>
            Both paths start with {{ currency.format(results.initialCapital) }} and the same monthly housing budget. Economic IRR compares how efficiently each path turns that cash into final wealth while providing equivalent housing.
          </li>
          <li>
            The renter pays rent and renters insurance and invests the remainder. The buyer makes mortgage and ownership payments; after payoff, the former mortgage payment goes into stocks.
          </li>
          <li>
            Mortgage interest and property tax generate savings at the entered marginal federal tax rate. All recurring costs grow at their entered annual rates.
          </li>
          <li>
            Stock gains are taxed when shares are sold, including withdrawals and final liquidation. The home is sold net of selling costs, with taxable gains reduced by purchase costs and the $250,000 primary-residence exclusion.
          </li>
          <li>
            The final positive cash flow is the after-tax terminal value shown for each path; monthly cash flows are used to calculate the annualized IRR.
          </li>
        </ol>
      </div>
    </UCard>
  </UContainer>
</template>
