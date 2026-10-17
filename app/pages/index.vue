<script setup lang="ts">
useSeoMeta({ title: 'Overview | Personal Finance' })
const calculators = [
  { number: '01', title: 'Make your next move.', category: 'HOME & MORTGAGE', icon: 'i-lucide-house', to: '/mortgage', action: 'Compare buying and renting', description: 'See how owning a home compares with renting and investing. Explore financing, ownership costs, and long-term returns.', features: ['Buy vs. rent comparison', 'Mortgage amortization', 'Save and load scenarios'] },
  { number: '02', title: 'Make spending count.', category: 'CREDIT CARD REWARDS', icon: 'i-lucide-credit-card', to: '/credit/card-value', action: 'Explore card rewards', description: 'Find the value behind your everyday spending. Compare cards, account for fees, and build a wallet that works for you.', features: ['Annual rewards and fees', 'Multi-card wallet optimizer', 'Custom spending presets'] },
  { number: '03', title: 'Know what stays yours.', category: 'INCOME TAXES', icon: 'i-lucide-receipt-text', to: '/taxes', action: 'Estimate your taxes', description: 'Understand your estimated take-home income, federal taxes, and state taxes with adjustable income and deductions.', features: ['Single filer estimates', 'Massachusetts and California', 'Income and deduction breakdowns'] }
]
</script>

<template>
  <UContainer class="py-10 sm:py-16">
    <div class="max-w-3xl">
      <p class="mb-4 text-xs font-semibold tracking-widest text-primary">
        YOUR FINANCIAL TOOLKIT
      </p>
      <h1 class="text-4xl font-semibold tracking-tight text-highlighted sm:text-6xl">
        Big decisions.<br>Clearer numbers.
      </h1>
      <p class="mt-6 max-w-xl text-lg leading-8 text-muted">
        A home, your everyday spending, your take-home pay. Explore the numbers that shape your life, all in one place.
      </p>
    </div>
    <div class="mt-12 grid gap-5 lg:grid-cols-3">
      <article
        v-for="calculator in calculators"
        :key="calculator.to"
        class="flex flex-col rounded-2xl border border-default bg-default p-6 sm:p-8"
      >
        <div class="mb-10 flex items-center justify-between">
          <span class="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary"><UIcon
            :name="calculator.icon"
            class="size-6"
          /></span>
          <span class="text-sm text-dimmed">{{ calculator.number }}</span>
        </div>
        <p class="text-xs font-semibold tracking-widest text-primary">
          {{ calculator.category }}
        </p>
        <h2 class="mt-3 text-2xl font-semibold tracking-tight text-highlighted">
          {{ calculator.title }}
        </h2>
        <p class="mt-4 text-sm leading-7 text-muted">
          {{ calculator.description }}
        </p>
        <ul class="my-6 space-y-3 text-sm text-toned">
          <li
            v-for="feature in calculator.features"
            :key="feature"
            class="flex items-center gap-2"
          >
            <UIcon
              name="i-lucide-check"
              class="size-4 shrink-0 text-primary"
            />{{ feature }}
          </li>
        </ul>
        <UButton
          :to="calculator.to"
          trailing-icon="i-lucide-arrow-right"
          variant="soft"
          block
          class="mt-auto"
        >
          {{ calculator.action }}
        </UButton>
      </article>
    </div>
    <div class="mt-8 flex items-start gap-3 rounded-xl bg-elevated/60 p-5 text-sm leading-6 text-muted">
      <UIcon
        name="i-lucide-book-open"
        class="mt-1 size-5 shrink-0 text-primary"
      />
      <p>Start with a calculator, adjust the assumptions, and compare the outcomes. Your inputs stay in place as you move between sections during this session. Use each calculator’s save options to keep scenarios for later.</p>
    </div>
  </UContainer>
</template>
