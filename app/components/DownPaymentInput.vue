<script setup lang="ts">
const props = defineProps<{
  homePrice: number
}>()

const amount = defineModel<number>({ required: true })
const mode = ref<'amount' | 'percent'>('amount')
const id = useId()

const displayedValue = computed({
  get() {
    if (mode.value === 'amount') return amount.value
    if (props.homePrice <= 0) return 0
    return Number(((amount.value / props.homePrice) * 100).toFixed(2))
  },
  set(value: number) {
    amount.value = mode.value === 'amount'
      ? value
      : (value / 100) * props.homePrice
  }
})
</script>

<template>
  <div>
    <div class="mb-1.5 flex items-center justify-between gap-3">
      <label
        :for="id"
        class="block text-sm font-medium text-highlighted"
      >Down payment</label>
      <div
        class="inline-flex rounded-md border border-accented p-0.5"
        aria-label="Down payment input format"
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
    <div class="relative">
      <input
        :id="id"
        v-model.number="displayedValue"
        type="number"
        :min="0"
        :max="mode === 'percent' ? 100 : homePrice"
        :step="mode === 'percent' ? 0.5 : 1000"
        required
        class="w-full rounded-md border border-accented bg-default px-3 py-2 pr-12 text-sm text-highlighted outline-none focus:border-primary focus:ring-1 focus:ring-primary"
      >
      <span class="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted">
        {{ mode === 'amount' ? '$' : '%' }}
      </span>
    </div>
    <p class="mt-1.5 text-xs text-muted">
      {{ mode === 'amount'
        ? `${homePrice > 0 ? ((amount / homePrice) * 100).toFixed(1) : '0.0'}% of purchase price`
        : `$${Math.round(amount).toLocaleString()} cash` }}
    </p>
  </div>
</template>
