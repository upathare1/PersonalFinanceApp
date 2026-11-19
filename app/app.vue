<script setup lang="ts">
useHead({ htmlAttrs: { lang: 'en' }, link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg?v=2' }] })
useSeoMeta({ title: 'Personal Finance', description: 'Explore home ownership, credit card rewards, and income taxes in one place.' })
const route = useRoute()
const links = [
  { label: 'Overview', to: '/', icon: 'i-lucide-layout-dashboard' },
  { label: 'Mortgage', to: '/mortgage', icon: 'i-lucide-house' },
  { label: 'Credit cards', to: '/credit/card-value', icon: 'i-lucide-credit-card' },
  { label: 'Taxes', to: '/taxes', icon: 'i-lucide-receipt-text' }
]
function isActive(to: string) {
  return to === '/' ? route.path === '/' : route.path.startsWith(to.split('/').slice(0, 2).join('/'))
}
</script>

<template>
  <UApp>
    <div class="flex min-h-screen flex-col">
      <header class="border-b border-default bg-default">
        <UContainer class="flex items-center justify-between gap-4 py-4 sm:py-5">
          <NuxtLink
            to="/"
            class="inline-flex items-center gap-3 rounded-xl text-xl font-bold tracking-tight text-highlighted outline-primary focus-visible:outline-2 focus-visible:outline-offset-4 sm:text-2xl"
          >
            <AppLogo />
            <span>Personal Finance</span>
          </NuxtLink>
          <UColorModeButton />
        </UContainer>
        <UContainer>
          <nav
            aria-label="Main navigation"
            class="grid grid-cols-[1fr_1fr_1.25fr_1fr] gap-1 pb-3 sm:flex sm:gap-2"
          >
            <NuxtLink
              v-for="link in links"
              :key="link.to"
              :to="link.to"
              :aria-current="isActive(link.to) ? 'page' : undefined"
              class="group flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl border px-0.5 py-1.5 text-center text-xs font-semibold leading-tight whitespace-nowrap outline-primary transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 sm:min-h-12 sm:flex-row sm:justify-start sm:gap-2.5 sm:px-3 sm:text-base"
              :class="isActive(link.to) ? 'border-primary/25 bg-primary/10 text-primary' : 'border-transparent text-toned hover:bg-elevated hover:text-highlighted'"
            >
              <span
                class="grid size-7 shrink-0 place-items-center rounded-md bg-elevated transition-colors group-aria-[current=page]:bg-primary/15 sm:size-8 sm:rounded-lg"
                aria-hidden="true"
              >
                <UIcon
                  :name="link.icon"
                  class="size-[18px] sm:size-5"
                />
              </span>
              <span>{{ link.label }}</span>
            </NuxtLink>
          </nav>
        </UContainer>
      </header>
      <main
        id="main-content"
        class="min-w-0 flex-1"
      >
        <NuxtPage :keepalive="{ max: 6 }" />
      </main>
      <footer class="mt-8 border-t border-default py-6">
        <UContainer class="space-y-2 text-center text-xs leading-5 text-muted">
          <p>Calculations are estimates for planning purposes. Tax rules, card offers, and financial assumptions can change. Check current terms before making decisions. Results are not guaranteed to be accurate or complete and should not be relied upon as financial, tax, or legal advice. Please consult a qualified professional before making financial decisions.</p>
          <p>
            Copyright &copy; {{ new Date().getFullYear() }} Upamanyu Pathare. Licensed under the GNU Affero General Public License v3.0.
            <a
              href="https://github.com/upathare1/PersonalFinanceApp"
              target="_blank"
              rel="noopener noreferrer"
              class="font-medium text-primary hover:underline"
            >
              Source code on GitHub.
            </a>
          </p>
        </UContainer>
      </footer>
    </div>
  </UApp>
</template>
