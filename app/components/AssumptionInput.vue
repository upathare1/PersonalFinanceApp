<script setup lang="ts">
defineProps<{
  label: string
  unit: string
  min?: number
  max?: number
  step?: number
}>()
const model = defineModel<number>({ required: true })
const id = useId()
</script>

<template>
  <div>
    <label
      :for="id"
      class="mb-1.5 block text-sm font-medium text-highlighted"
    >{{ label }}</label>
    <div class="relative">
      <input
        :id="id"
        v-model.number="model"
        type="number"
        :min="min"
        :max="max"
        :step="step ?? 1"
        required
        class="w-full rounded-md border border-accented bg-default px-3 py-2 pr-16 text-sm text-highlighted outline-none focus:border-primary focus:ring-1 focus:ring-primary"
      >
      <span class="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted">{{ unit }}</span>
    </div>
  </div>
</template>
