<script setup lang="ts">
useHead({ htmlAttrs: { lang: 'en' }, link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }] })
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
        <UContainer class="flex items-center justify-between gap-4 py-5">
          <NuxtLink
            to="/"
            class="flex items-center gap-3 font-semibold tracking-tight text-highlighted"
          >
            <span class="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><UIcon
              name="i-lucide-chart-no-axes-combined"
              class="size-6"
            /></span>
            Personal Finance
          </NuxtLink>
          <UColorModeButton />
        </UContainer>
        <UContainer>
          <nav
            aria-label="Main navigation"
            class="flex gap-1 overflow-x-auto pb-3"
          >
            <NuxtLink
              v-for="link in links"
              :key="link.to"
              :to="link.to"
              :aria-current="isActive(link.to) ? 'page' : undefined"
              class="flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
              :class="isActive(link.to) ? 'bg-primary/10 text-primary' : 'text-muted hover:bg-elevated hover:text-highlighted'"
            >
              <UIcon
                :name="link.icon"
                class="size-4"
              />{{ link.label }}
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
          <p>Copyright &copy; {{ new Date().getFullYear() }} Upamanyu Pathare. Licensed under the GNU Affero General Public License v3.0.</p>
        </UContainer>
      </footer>
    </div>
  </UApp>
</template>
