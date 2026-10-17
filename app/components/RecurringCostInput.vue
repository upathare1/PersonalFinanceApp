<script setup lang="ts">
const props = withDefaults(defineProps<{
  label: string
  homePrice: number
  amountUnit?: '$ / yr' | '$ / mo'
  allowPercent?: boolean
  amountStep?: number
}>(), {
  amountUnit: '$ / yr',
  allowPercent: false,
  amountStep: 100
})

const amount = defineModel<number>('amount', { required: true })
const growth = defineModel<number>('growth', { required: true })
const mode = ref<'amount' | 'percent'>('amount')
const id = useId()
const growthId = useId()

const annualAmount = computed({
  get: () => props.amountUnit === '$ / mo' ? amount.value * 12 : amount.value,
  set: value => amount.value = props.amountUnit === '$ / mo' ? value / 12 : value
})

const displayedValue = computed({
  get() {
    if (mode.value === 'amount') return amount.value
    return props.homePrice > 0
      ? Number(((annualAmount.value / props.homePrice) * 100).toFixed(2))
      : 0
  },
  set(value: number) {
    if (mode.value === 'amount') amount.value = value
    else annualAmount.value = (value / 100) * props.homePrice
  }
})
</script>

<template>
  <div class="rounded-lg border border-default p-3">
    <div class="mb-2 flex items-center justify-between gap-2">
      <label
        :for="id"
        class="text-sm font-medium text-highlighted"
      >{{ label }}</label>
      <div
        v-if="allowPercent"
        class="inline-flex rounded-md border border-accented p-0.5"
        :aria-label="`${label} input format`"
      >
        <button
          v-for="option in ([['amount', '$'], ['percent', '%']] as const)"
          :key="option[0]"
          type="button"
          class="rounded px-2 py-0.5 text-xs font-medium transition-colors"
          :class="mode === option[0] ? 'bg-primary text-inverted' : 'text-muted hover:text-highlighted'"
          :aria-pressed="mode === option[0]"
          @click="mode = option[0]"
        >
          {{ option[1] }}
        </button>
      </div>
    </div>
    <div class="grid gap-3">
      <div>
        <div class="mb-1 flex items-center justify-between gap-2 whitespace-nowrap text-xs text-muted">
          <span>Starting cost</span>
          <span>{{ mode === 'percent' ? '% / yr' : amountUnit }}</span>
        </div>
        <div>
          <input
            :id="id"
            v-model.number="displayedValue"
            type="number"
            min="0"
            :max="mode === 'percent' ? 100 : undefined"
            :step="mode === 'percent' ? 0.1 : amountStep"
            required
            class="w-full rounded-md border border-accented bg-default px-3 py-2 text-sm text-highlighted outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          >
        </div>
      </div>
      <div>
        <div class="mb-1 flex items-center justify-between gap-2 whitespace-nowrap text-xs text-muted">
          <label :for="growthId">Annual growth</label>
          <span>% / yr</span>
        </div>
        <div>
          <input
            :id="growthId"
            v-model.number="growth"
            type="number"
            min="-99"
            step="0.1"
            required
            class="w-full rounded-md border border-accented bg-default px-3 py-2 text-sm text-highlighted outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          >
        </div>
      </div>
    </div>
    <p
      v-if="allowPercent"
      class="mt-1.5 text-xs text-muted"
    >
      {{ mode === 'amount'
        ? `${homePrice > 0 ? ((annualAmount / homePrice) * 100).toFixed(2) : '0.00'}% of initial home price`
        : `$${Math.round(annualAmount).toLocaleString()} in year one` }}
    </p>
  </div>
</template>
