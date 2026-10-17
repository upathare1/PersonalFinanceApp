<script setup lang="ts">
import type { Scenario } from '#shared/types/scenario'
import { createDefaultScenario } from '#shared/utils/scenario'

interface ScenarioFile {
  format: 'mortgage-app-scenario'
  version: 1
  savedAt: string
  scenario: Scenario
}

const scenario = defineModel<Scenario>({ required: true })
const fileInput = ref<HTMLInputElement>()
const error = ref('')

function save() {
  error.value = ''
  const payload: ScenarioFile = {
    format: 'mortgage-app-scenario',
    version: 1,
    savedAt: new Date().toISOString(),
    scenario: structuredClone(toRaw(scenario.value))
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `mortgage-scenario-${new Date().toISOString().slice(0, 10)}.json`
  link.click()
  URL.revokeObjectURL(url)
}

function chooseFile() {
  error.value = ''
  fileInput.value?.click()
}

async function load(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return

  try {
    const parsed = JSON.parse(await file.text()) as Partial<ScenarioFile>
    if (parsed.format !== 'mortgage-app-scenario' || parsed.version !== 1 || !parsed.scenario || typeof parsed.scenario !== 'object') {
      throw new Error('Unsupported scenario file')
    }
    const defaults = createDefaultScenario()
    const loaded = { ...defaults, ...parsed.scenario }
    for (const key of Object.keys(defaults) as (keyof Scenario)[]) {
      if (typeof loaded[key] !== 'number' || !Number.isFinite(loaded[key])) throw new Error(`Invalid value for ${key}`)
    }
    scenario.value = loaded
  } catch {
    error.value = 'That file is not a valid MortgageApp scenario.'
  }
}
</script>

<template>
  <div>
    <div class="flex flex-wrap items-center gap-2">
      <input
        ref="fileInput"
        type="file"
        accept="application/json,.json"
        class="sr-only"
        @change="load"
      >
      <UButton
        color="neutral"
        variant="outline"
        icon="i-lucide-upload"
        @click="chooseFile"
      >
        Load JSON
      </UButton>
      <UButton
        color="neutral"
        variant="outline"
        icon="i-lucide-download"
        @click="save"
      >
        Save JSON
      </UButton>
    </div>
    <p
      v-if="error"
      role="alert"
      class="mt-1.5 text-xs text-error"
    >
      {{ error }}
    </p>
  </div>
</template>
