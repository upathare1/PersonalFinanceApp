<script setup lang="ts">
const props = defineProps<{ scenario: object }>()
const fetchComparison = () => $fetch('/api/taxes/compare', { method: 'POST', body: props.scenario })
type Comparison = Awaited<ReturnType<typeof fetchComparison>>
type Location = Comparison['rows'][number]

const comparison = shallowRef<Comparison>()
const pending = ref(true)
const failed = ref(false)
const retry = ref(0)
const selectedId = ref<Location['id']>()
const baselineId = ref<Location['id']>()

watch([() => props.scenario, retry], async (_, __, onCleanup) => {
  let cancelled = false
  onCleanup(() => {
    cancelled = true
  })
  pending.value = true
  failed.value = false
  try {
    const data = await fetchComparison()
    if (!cancelled) comparison.value = data
  } catch {
    if (!cancelled) failed.value = true
  } finally {
    if (!cancelled) pending.value = false
  }
}, { immediate: true })

const categories = [
  { key: 'federalTax', label: 'Federal tax', color: 'var(--color-blue-500)' },
  { key: 'payrollTax', label: 'Payroll tax', color: 'var(--color-teal-500)' },
  { key: 'stateTax', label: 'State tax', color: 'var(--color-violet-500)' },
  { key: 'cityTax', label: 'City tax', color: 'var(--color-amber-500)' },
  { key: 'retirement', label: '401(k)', color: 'var(--color-indigo-400)' },
  { key: 'hsa', label: 'Employee HSA', color: 'var(--color-pink-500)' },
  { key: 'insurance', label: 'Health insurance', color: 'var(--color-lime-500)' },
  { key: 'netIncome', label: 'Net Income', color: 'var(--ui-bg-accented)' }
] as const
const outflowCategories = categories.filter(({ key }) => key !== 'netIncome')
const rows = computed(() => [...(comparison.value?.rows ?? [])].sort((a, b) => b.netIncome - a.netIncome))
const baseline = computed(() => rows.value.find(row => row.id === baselineId.value) ?? rows.value.find(row => row.isCalculatorLocation))
const selected = computed(() => rows.value.find(row => row.id === selectedId.value) ?? baseline.value)
const baselineOptions = computed(() => rows.value.map(row => ({ label: row.label, value: row.id })))
const baselineSelection = computed({
  get: () => baseline.value?.id,
  set: (value) => { baselineId.value = value }
})

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
const money = (value: number) => usd.format(value)
const difference = computed(() => selected.value && baseline.value ? selected.value.netIncome - baseline.value.netIncome : 0)
const canStack = (row: Location) => row.incomeExcludingBenefits > 0 && categories.every(({ key }) => row[key] >= 0)

const donutSlices = computed(() => {
  const row = selected.value
  if (!row || outflowCategories.some(({ key }) => row[key] < 0)) return []

  const total = outflowCategories.reduce((sum, { key }) => sum + row[key], 0)
  if (total <= 0) return []

  let offset = 0
  return outflowCategories.filter(({ key }) => row[key] > 0).map(({ key, label, color }) => {
    const length = 100 * row[key] / total
    const slice = { key, color, length, offset: -offset, tooltip: `${label}: ${money(row[key])}` }
    offset += length
    return slice
  })
})

type DonutSlice = typeof donutSlices.value[number]
const hoveredSlice = ref<DonutSlice['key']>()
const focusedSlice = ref<DonutSlice['key']>()
const donutTooltip = computed(() => donutSlices.value.find(slice => slice.key === (hoveredSlice.value ?? focusedSlice.value))?.tooltip)

function dismissDonutTooltip() {
  hoveredSlice.value = undefined
  focusedSlice.value = undefined
}
</script>

<template>
  <section class="space-y-6">
    <div>
      <h1 class="text-3xl font-semibold text-highlighted">
        Compare taxes by location
      </h1>
      <p class="mt-2 text-muted">
        Compare Net Income for a single, full-year resident using your calculator inputs.
      </p>
    </div>

    <p
      v-if="pending"
      role="status"
      class="text-muted"
    >
      Calculating comparisons…
    </p>
    <UAlert
      v-else-if="failed"
      color="error"
      title="Tax comparisons are temporarily unavailable."
    >
      <template #actions>
        <UButton
          label="Try again"
          variant="outline"
          @click="retry++"
        />
      </template>
    </UAlert>

    <template v-else-if="comparison && selected && baseline">
      <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section class="min-w-0 rounded-lg border border-default p-4 sm:p-6">
          <h2 class="text-lg font-semibold text-highlighted">
            {{ comparison.taxYear }} income breakdown
          </h2>
          <p class="mt-1 text-sm text-muted">
            Select a location to see its taxes and deductions.
          </p>

          <div class="mt-4 space-y-2">
            <button
              v-for="row in rows"
              :key="row.id"
              type="button"
              :aria-pressed="selected.id === row.id"
              class="block w-full rounded-lg border px-3 py-2 text-left focus-visible:outline-2 focus-visible:outline-primary"
              :class="selected.id === row.id ? 'border-primary bg-primary/5' : 'border-transparent hover:bg-elevated'"
              @click="selectedId = row.id"
            >
              <span class="flex flex-wrap items-baseline justify-between gap-x-4">
                <span class="font-medium text-highlighted">
                  {{ row.label }}
                  <span
                    v-if="row.provisional"
                    class="text-xs font-normal text-muted"
                  >(provisional)</span>
                </span>
                <span class="text-sm tabular-nums text-highlighted">{{ money(row.netIncome) }} net</span>
              </span>
              <span
                v-if="canStack(row)"
                aria-hidden="true"
                class="mt-2 flex h-3 overflow-hidden rounded-full"
              >
                <template
                  v-for="{ key, label, color } in categories"
                  :key="key"
                >
                  <UTooltip
                    v-if="row[key] > 0"
                    :text="`${label}: ${money(row[key])}`"
                    :delay-duration="120"
                    :content="{ side: 'top' }"
                    disable-hoverable-content
                  >
                    <span :style="{ background: color, width: `${100 * row[key] / row.incomeExcludingBenefits}%` }" />
                  </UTooltip>
                </template>
              </span>
              <span
                v-else
                class="mt-1 block text-xs text-muted"
              >{{ row.incomeExcludingBenefits === 0 ? 'No income to chart' : 'See the signed breakdown for credits or negative net income' }}</span>
            </button>
          </div>

          <ul
            class="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted"
            aria-label="Income chart legend"
          >
            <li
              v-for="{ key, label, color } in categories"
              :key="key"
              class="flex items-center gap-1.5"
            >
              <span
                aria-hidden="true"
                class="size-2.5 rounded-sm"
                :style="{ background: color }"
              />
              {{ label }}
            </li>
          </ul>
          <p class="mt-3 text-xs text-muted">
            Each full bar represents total income minus taxable benefits ({{ money(selected.incomeExcludingBenefits) }}).
          </p>
        </section>

        <section class="min-w-0 rounded-lg border border-default p-4 sm:p-6">
          <h2 class="text-lg font-semibold text-highlighted">
            {{ selected.label }}
          </h2>
          <p
            v-if="donutSlices.length"
            class="mt-2 text-center text-sm text-muted"
          >
            Taxes and deductions
          </p>
          <div
            v-if="donutSlices.length"
            class="relative mx-auto my-3 grid size-36 place-items-center"
          >
            <svg
              viewBox="0 0 144 144"
              class="absolute inset-0 size-full"
              role="group"
              aria-label="Taxes and deductions chart"
            >
              <circle
                v-for="slice in donutSlices"
                :key="slice.key"
                cx="72"
                cy="72"
                r="59"
                pathLength="100"
                fill="none"
                stroke-width="24"
                :stroke="slice.color"
                :stroke-dasharray="`${slice.length} ${100 - slice.length}`"
                :stroke-dashoffset="slice.offset"
                transform="rotate(-90 72 72)"
                pointer-events="visibleStroke"
                tabindex="0"
                role="img"
                :aria-label="slice.tooltip"
                @pointerenter="hoveredSlice = slice.key"
                @pointerleave="hoveredSlice = undefined"
                @focus="focusedSlice = slice.key"
                @blur="focusedSlice = undefined"
                @keydown.esc="dismissDonutTooltip"
              />
            </svg>
            <span
              v-if="donutTooltip"
              aria-hidden="true"
              class="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2 whitespace-nowrap rounded bg-default px-2.5 py-1 text-xs text-highlighted shadow-sm ring ring-default"
            >{{ donutTooltip }}</span>
            <div
              class="pointer-events-none grid place-content-center text-center"
              aria-hidden="true"
            >
              <span class="text-xs text-muted">Total tax</span>
              <span class="font-semibold tabular-nums text-highlighted">{{ money(selected.totalTax) }}</span>
            </div>
          </div>

          <dl class="mt-4 space-y-2 text-sm">
            <div
              v-for="{ key, label, color } in categories"
              :key="key"
              class="flex items-baseline justify-between gap-3"
              :class="{ 'border-t border-default pt-2 font-semibold text-highlighted': key === 'netIncome' }"
            >
              <dt>
                <span
                  aria-hidden="true"
                  class="mr-1.5 inline-block size-2.5 rounded-sm"
                  :style="{ background: color }"
                />
                {{ label }}
              </dt>
              <dd class="tabular-nums">
                {{ money(selected[key]) }}
              </dd>
            </div>
            <div class="flex justify-between gap-3 text-muted">
              <dt>Total tax</dt>
              <dd class="tabular-nums">
                {{ money(selected.totalTax) }}
              </dd>
            </div>
          </dl>

          <div class="mt-5 space-y-2 border-t border-default pt-4">
            <UFormField label="Compare Net Income against">
              <USelect
                v-model="baselineSelection"
                :items="baselineOptions"
                aria-label="Compare Net Income against"
                class="w-full"
              />
            </UFormField>
            <p
              aria-live="polite"
              class="text-sm text-muted"
            >
              {{ difference === 0 ? 'Same estimated Net Income' : `${money(Math.abs(difference))} ${difference > 0 ? 'more' : 'less'} per year · ${money(Math.abs(difference) / 12)} per month` }}
            </p>
          </div>
        </section>
      </div>

      <p
        v-if="rows.some(row => row.provisional)"
        class="text-sm text-muted"
      >
        Massachusetts and California use provisional state estimates based on {{ comparison.stateRulesYear }} rules.
      </p>
    </template>
  </section>
</template>
