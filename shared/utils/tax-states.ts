import type { TaxYear } from './tax-years'

export const taxStates = {
  AL: 'Alabama',
  AK: 'Alaska',
  AZ: 'Arizona',
  AR: 'Arkansas',
  CA: 'California',
  CO: 'Colorado',
  CT: 'Connecticut',
  DE: 'Delaware',
  FL: 'Florida',
  GA: 'Georgia',
  HI: 'Hawaii',
  ID: 'Idaho',
  IL: 'Illinois',
  IN: 'Indiana',
  IA: 'Iowa',
  KS: 'Kansas',
  KY: 'Kentucky',
  LA: 'Louisiana',
  ME: 'Maine',
  MD: 'Maryland',
  MA: 'Massachusetts',
  MI: 'Michigan',
  MN: 'Minnesota',
  MS: 'Mississippi',
  MO: 'Missouri',
  MT: 'Montana',
  NE: 'Nebraska',
  NV: 'Nevada',
  NH: 'New Hampshire',
  NJ: 'New Jersey',
  NM: 'New Mexico',
  NY: 'New York',
  NC: 'North Carolina',
  ND: 'North Dakota',
  OH: 'Ohio',
  OK: 'Oklahoma',
  OR: 'Oregon',
  PA: 'Pennsylvania',
  RI: 'Rhode Island',
  SC: 'South Carolina',
  SD: 'South Dakota',
  TN: 'Tennessee',
  TX: 'Texas',
  UT: 'Utah',
  VT: 'Vermont',
  VA: 'Virginia',
  WA: 'Washington',
  WV: 'West Virginia',
  WI: 'Wisconsin',
  WY: 'Wyoming'
} as const

export type TaxState = keyof typeof taxStates

export const stateOptions = (Object.keys(taxStates) as TaxState[]).map(value => ({
  value,
  label: taxStates[value]
}))

export const noIncomeTaxStates = new Set<TaxState>(['AK', 'FL', 'NV', 'NH', 'SD', 'TN', 'TX', 'WY'])

export function resolveTaxState(value: unknown): TaxState {
  return typeof value === 'string' && Object.hasOwn(taxStates, value) ? value as TaxState : 'MA'
}

const known2027Rules = new Set<TaxState>(['CO', 'IN', 'KY', 'MS', 'MT', 'NC', 'NE', 'NY', 'PA', 'VA'])
const provisional2026Rules = new Set<TaxState>(['ID', 'OR', 'VT'])

export function isProvisionalStateEstimate(state: TaxState, year: TaxYear) {
  if (year === 2026) return provisional2026Rules.has(state)
  return year === 2027 && !known2027Rules.has(state) && !noIncomeTaxStates.has(state)
}
