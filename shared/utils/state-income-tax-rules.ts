import type { TaxState } from './tax-states'
import type { TaxYear } from './tax-years'

type Bracket = readonly [from: number, rate: number]

interface Schedule {
  brackets: readonly Bracket[]
  deduction?: number | 'federal'
  exemption?: number
  credit?: number
}

type ScheduledState = Exclude<TaxState, 'AK' | 'CA' | 'FL' | 'MA' | 'NH' | 'NV' | 'NY' | 'SD' | 'TN' | 'TX' | 'WA' | 'WY'>
type StateSchedules = Record<ScheduledState, { 2025: Schedule, 2026: Schedule, 2027?: Schedule }>

const flat = (rate: number, deduction?: Schedule['deduction'], exemption?: number): Schedule => ({
  brackets: [[0, rate]], deduction, exemption
})
const alabama: Schedule = { brackets: [[0, 2], [500, 4], [3000, 5]], exemption: 1500 }
const connecticut: Schedule = { brackets: [[0, 2], [10000, 4.5], [50000, 5.5], [100000, 6], [200000, 6.5], [250000, 6.9], [500000, 6.99]] }
const delaware: Schedule = { brackets: [[2000, 2.2], [5000, 3.9], [10000, 4.8], [20000, 5.2], [25000, 5.55], [60000, 6.6]], deduction: 3250, credit: 110 }
const hawaiiBrackets: Schedule['brackets'] = [[0, 1.4], [9600, 3.2], [14400, 5.5], [19200, 6.4], [24000, 6.8], [36000, 7.2], [48000, 7.6], [125000, 7.9], [175000, 8.25], [225000, 9], [275000, 10], [325000, 11]]
const kansas: Schedule = { brackets: [[0, 5.2], [23000, 5.58]], deduction: 3605, exemption: 9160 }
const marylandBrackets: Schedule['brackets'] = [[0, 2], [1000, 3], [2000, 4], [3000, 4.75], [100000, 5], [125000, 5.25], [150000, 5.5], [250000, 5.75], [500000, 6.25], [1000000, 6.5]]
const newJersey: Schedule = { brackets: [[0, 1.4], [20000, 1.75], [35000, 3.5], [40000, 5.525], [75000, 6.37], [500000, 8.97], [1000000, 10.75]], exemption: 1000 }
const newMexico: Schedule = { brackets: [[0, 1.5], [5500, 3.2], [16500, 4.3], [33500, 4.7], [66500, 4.9], [210000, 5.9]], deduction: 'federal' }
const pennsylvania = flat(3.07)
const virginiaBrackets: Schedule['brackets'] = [[0, 2], [3000, 3], [5000, 5], [17000, 5.75]]
const virginia = { brackets: virginiaBrackets, deduction: 8750, exemption: 930 }
const westVirginia2026: Schedule = { brackets: [[0, 2.11], [10000, 2.81], [25000, 3.16], [40000, 4.22], [60000, 4.58]], exemption: 2000 }

// Marginal rates are percentages. Each threshold is the lower boundary of a band.
// See README for state return references and limits on the planning estimates.
const schedules: StateSchedules = {
  AL: { 2025: alabama, 2026: alabama },
  AZ: { 2025: flat(2.5, 'federal'), 2026: flat(2.5, 'federal') },
  AR: {
    2025: { brackets: [[5600, 2], [11200, 3], [16000, 3.4], [26400, 3.9]], deduction: 2470, credit: 29 },
    2026: { brackets: [[5600, 2], [11200, 3], [16000, 3.4], [26400, 3.7]], deduction: 2530, credit: 29 }
  },
  CO: {
    2025: flat(4.4, 'federal'),
    2026: flat(4.4, 'federal'),
    2027: { brackets: [[0, 3.7], [25000, 4.2], [100000, 4.4], [500000, 7.4], [750000, 7.9], [1000000, 8.4]], deduction: 'federal' }
  },
  CT: { 2025: connecticut, 2026: connecticut },
  DE: { 2025: delaware, 2026: delaware },
  GA: { 2025: flat(5.19, 12000), 2026: flat(4.99, 15000) },
  HI: {
    2025: { brackets: hawaiiBrackets, deduction: 4400, exemption: 1144 },
    2026: { brackets: hawaiiBrackets, deduction: 8000, exemption: 1144 }
  },
  ID: {
    2025: { brackets: [[4811, 5.3]], deduction: 'federal' },
    2026: { brackets: [[4933, 5.3]], deduction: 'federal' }
  },
  IL: { 2025: flat(4.95, 0, 2850), 2026: flat(4.95, 0, 2925) },
  IN: { 2025: flat(3, 0, 1000), 2026: flat(2.95, 0, 1000), 2027: flat(2.9, 0, 1000) },
  IA: {
    2025: { ...flat(3.8, 'federal'), credit: 40 },
    2026: { ...flat(3.8, 'federal'), credit: 40 }
  },
  KS: { 2025: kansas, 2026: kansas },
  KY: { 2025: flat(4, 3270), 2026: flat(3.5, 3360), 2027: flat(3.5, 3470) },
  LA: { 2025: flat(3, 12500), 2026: flat(3, 12875) },
  ME: {
    2025: { brackets: [[0, 5.8], [26800, 6.75], [63450, 7.15]], deduction: 15000, exemption: 5150 },
    2026: { brackets: [[0, 5.8], [27400, 6.75], [64850, 7.15], [1000000, 9.15]], deduction: 15700, exemption: 5300 },
    2027: { brackets: [[0, 5.8], [28250, 6.75], [66850, 7.15], [1030400, 9.15]], deduction: 16600, exemption: 5450 }
  },
  MD: {
    2025: { brackets: marylandBrackets, deduction: 3350, exemption: 3200 },
    2026: { brackets: marylandBrackets, deduction: 3350, exemption: 3200 }
  },
  MI: { 2025: flat(4.25, 0, 5800), 2026: flat(4.25, 0, 5900) },
  MN: {
    2025: { brackets: [[0, 5.35], [32570, 6.8], [106990, 7.85], [198630, 9.85]], deduction: 14950 },
    2026: { brackets: [[0, 5.35], [33310, 6.8], [109430, 7.85], [203150, 9.85]], deduction: 15300 }
  },
  MS: {
    2025: { brackets: [[10000, 4.4]], deduction: 2300, exemption: 6000 },
    2026: { brackets: [[10000, 4]], deduction: 2300, exemption: 6000 },
    2027: { brackets: [[10000, 3.75]], deduction: 2300, exemption: 6000 }
  },
  MO: {
    2025: { brackets: [[1313, 2], [2626, 2.5], [3939, 3], [5252, 3.5], [6565, 4], [7878, 4.5], [9191, 4.7]], deduction: 'federal' },
    2026: { brackets: [[1348, 2], [2696, 2.5], [4044, 3], [5392, 3.5], [6740, 4], [8088, 4.5], [9436, 4.7]], deduction: 'federal' }
  },
  MT: {
    2025: { brackets: [[0, 4.7], [21100, 5.9]], deduction: 'federal' },
    2026: { brackets: [[0, 4.7], [47500, 5.65]], deduction: 'federal' },
    2027: { brackets: [[0, 4.7], [65000, 5.4]], deduction: 'federal' }
  },
  NE: {
    2025: { brackets: [[0, 2.46], [4030, 3.51], [24120, 5.01], [38870, 5.2]], deduction: 8600, credit: 171 },
    2026: { brackets: [[0, 2.46], [4130, 3.51], [24760, 4.55]], deduction: 8850, credit: 176 },
    2027: { brackets: [[0, 2.46], [4270, 3.51], [25570, 3.99]], deduction: 9100, credit: 181 }
  },
  NJ: { 2025: newJersey, 2026: newJersey },
  NM: { 2025: newMexico, 2026: newMexico },
  NC: { 2025: flat(4.25, 12750), 2026: flat(3.99, 12750), 2027: flat(3.49, 12750) },
  ND: {
    2025: { brackets: [[48475, 1.95], [244825, 2.5]], deduction: 'federal' },
    2026: { brackets: [[49575, 1.95], [250400, 2.5]], deduction: 'federal' }
  },
  OH: { 2025: { brackets: [[26050, 2.75], [100000, 3.125]] }, 2026: { brackets: [[26050, 2.75]] } },
  OK: {
    2025: { brackets: [[0, 0.25], [1000, 0.75], [2500, 1.75], [3750, 2.75], [4900, 3.75], [7200, 4.75]], deduction: 6350, exemption: 1000 },
    2026: { brackets: [[3750, 2.5], [4900, 3.5], [7200, 4.5]], deduction: 6350, exemption: 1000 }
  },
  OR: {
    2025: { brackets: [[0, 4.75], [4400, 6.75], [11050, 8.75], [125000, 9.9]], deduction: 2835, credit: 256 },
    2026: { brackets: [[0, 4.75], [4550, 6.75], [11400, 8.75], [125000, 9.9]], deduction: 2910, credit: 263 }
  },
  PA: { 2025: pennsylvania, 2026: pennsylvania },
  RI: {
    2025: { brackets: [[0, 3.75], [79900, 4.75], [181650, 5.99]], deduction: 10900, exemption: 5100 },
    2026: { brackets: [[0, 3.75], [82050, 4.75], [186450, 5.99]], deduction: 11200, exemption: 5250 }
  },
  SC: {
    2025: { brackets: [[3560, 3], [17830, 6]], deduction: 'federal' },
    2026: { brackets: [[0, 1.99], [30000, 5.21]], deduction: 15000 }
  },
  UT: { 2025: flat(4.5), 2026: flat(4.45) },
  VT: {
    2025: { brackets: [[0, 3.35], [49400, 6.6], [119700, 7.6], [249700, 8.75]], deduction: 7650, exemption: 5300 },
    2026: { brackets: [[0, 3.35], [50750, 6.6], [122850, 7.6], [256300, 8.75]], deduction: 7650, exemption: 5300 }
  },
  VA: { 2025: virginia, 2026: virginia, 2027: { ...virginia, deduction: 9200 } },
  WV: {
    2025: { brackets: [[0, 2.22], [10000, 2.96], [25000, 3.33], [40000, 4.44], [60000, 4.82]], exemption: 2000 },
    2026: westVirginia2026
  },
  WI: {
    2025: { brackets: [[0, 3.5], [14680, 4.4], [50480, 5.3], [323290, 7.65]], exemption: 700 },
    2026: { brackets: [[0, 3.5], [15110, 4.4], [51950, 5.3], [332720, 7.65]], exemption: 700 }
  }
}

export function getStateSchedule(state: TaxState, year: TaxYear): Schedule | undefined {
  if (!Object.hasOwn(schedules, state)) return undefined
  const schedule = schedules[state as ScheduledState]
  return schedule[year] ?? schedule[2026]
}
