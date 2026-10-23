<script setup lang="ts">
// @ts-expect-error vuex types not properly exported
import { useStore } from 'vuex'
import { useBackendError } from '~/composables/useBackendError'
const store = useStore()
const { t, locale } = useI18n()
const isLoading = ref(false)
const { showBackendErrorToast } = useBackendError()

async function switchLocale(code: 'en' | 'es') {
  if (locale.value === code) return
  try {
    isLoading.value = true
    const error = await store.dispatch('setPreferredLanguage', code)
    if (error) {
      showBackendErrorToast(error.message)
      return
    }
  } finally {
    isLoading.value = false
  }
}

interface FooterLink {
  label: string
  to: string
  external?: boolean
  target?: string
}

interface FooterColumn {
  children: FooterLink[]
}

interface BrandItem {
  to: string
  title: string
  description: string
}

const brands = computed<BrandItem[]>(() => [
  {
    to: 'https://endlessglobal.com/',
    title: t('footer.brand_endless_title'),
    description: t('footer.brand_endless_desc'),
  },
  {
    to: 'https://www.endlessstudios.com/',
    title: t('footer.brand_studios_title'),
    description: t('footer.brand_studios_desc'),
  },
  {
    to: 'https://access.endlessstudios.com/',
    title: t('footer.brand_access_title'),
    description: t('footer.brand_access_desc'),
  },
])

const columns = computed<FooterColumn[]>(() => [
  {
    children: [
      { label: t('footer.community'), to: '/' },
      { label: t('footer.play'), to: '/games' },
      { label: t('footer.learn'), to: '/programs' },
    ],
  },
  {
    children: [
      {
        label: t('footer.help_center'),
        to: 'https://endlessstudios.notion.site/Endless-Studios-Platform-Support-b6f491acb5e4448aa312e5c13de82bd3?pvs=4',
      },
      {
        label: t('footer.contact_us'),
        to: 'mailto:help@endlessstudios.com',
      },
    ],
  },
])
</script>

<template>
  <footer class="bg-midnight-950 text-white">
    <UContainer class="py-16 md:py-24">
      <nav
        class="flex flex-col md:flex-row gap-12 md:gap-24"
        aria-label="Footer"
      >
        <div class="shrink-0">
          <NuxtLink
            to="https://www.endlessstudios.com"
            :external="true"
            target="_blank"
          >
            <img
              src="~/assets/images/logo-endless-studios-orange.svg"
              alt="Endless Studios"
              class="h-11"
            />
          </NuxtLink>
        </div>

        <div class="flex gap-6">
          <div v-for="(column, index) in columns" :key="index">
            <ul>
              <li
                v-for="link in column.children"
                :key="link.label"
                class="mb-4"
              >
                <NuxtLink
                  :to="link.to"
                  class="font-bold text-xl"
                  :external="link.external"
                  :target="link.target"
                >
                  {{ link.label }}
                </NuxtLink>
              </li>
            </ul>
          </div>
        </div>

        <div class="flex flex-col gap-2">
          <div v-for="brand in brands" :key="brand.title">
            <NuxtLink class="font-bold text-xl" :to="brand.to">
              {{ brand.title }}
            </NuxtLink>
            <p class="text-dimmed text-sm">{{ brand.description }}</p>
          </div>
        </div>
      </nav>

      <USeparator
        class="my-12 md:my-18"
        :ui="{
          border: 'border-neutral-800',
        }"
      />

      <section class="flex justify-between">
        <p class="text-sm">
          {{ t('app.all_rights_reserved', { year: new Date().getFullYear() }) }}
        </p>
        <section class="flex gap-6">
          <NuxtLink
            :to="
              locale === 'en'
                ? 'https://github.com/Endless-Access-Community/.github/blob/main/CODE_OF_CONDUCT.md'
                : 'https://github.com/Endless-Access-Community/.github/blob/main/es/CODE_OF_CONDUCT.md'
            "
            class="font-bold text-sm"
          >
            {{ t('footer.community_code_of_conduct') }}
          </NuxtLink>
          <NuxtLink
            class="font-bold text-sm"
            to="https://about.endlessstudios.com/terms"
            :external="true"
            target="_blank"
          >
            {{ t('footer.terms_of_use') }}
          </NuxtLink>
        </section>
        <section class="flex gap-4">
          <button
            type="button"
            :disabled="isLoading"
            :class="locale === 'en' ? 'text-primary' : 'text-muted'"
            @click="switchLocale('en')"
          >
            English
          </button>
          <button
            type="button"
            :disabled="isLoading"
            :class="locale === 'es' ? 'text-primary' : 'text-muted'"
            @click="switchLocale('es')"
          >
            Español
          </button>
        </section>
      </section>
    </UContainer>
  </footer>
</template>
