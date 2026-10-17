import type { Scenario } from '../../shared/types/scenario'
import { createDefaultScenario } from '../../shared/utils/scenario'
import { calculateComparison } from '../utils/calculation'

export default defineEventHandler(async (event) => {
  const body = await readBody<Partial<Scenario>>(event)
  const defaults = createDefaultScenario()
  const scenario = { ...defaults, ...(body ?? {}) }

  for (const key of Object.keys(defaults) as (keyof Scenario)[]) {
    if (typeof scenario[key] !== 'number' || !Number.isFinite(scenario[key])) {
      throw createError({ statusCode: 400, statusMessage: `Invalid scenario value: ${key}` })
    }
  }

  return calculateComparison(scenario)
})
