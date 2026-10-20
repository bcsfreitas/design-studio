<script setup lang="ts">
/**
 * Layout for a page which displays a standalone piece of content. It provides
 * the following slots:
 *
 * - `header`: Full width banners or notifications, as in AppPage.
 * - `hero`: A prominent visual section at the top of the page.
 * - default: The main content of the page.
 *
 * All of these slots are optional. Except for the header slot, they are all
 * constrained according to --ui-container.
 *
 * When `full-width` is true, the default slot is not wrapped in a UContainer,
 * allowing content to span the full viewport width.
 */

import AppPage from '~/components/App/AppPage.vue'

defineProps<{
  fullWidth?: boolean
}>()
</script>

<template>
  <AppPage>
    <template v-if="$slots.header" #header>
      <slot name="header" />
    </template>
    <UContainer v-if="$slots.hero" class="mt-4 md:mt-12">
      <slot name="hero" />
    </UContainer>
    <template v-if="$slots.default">
      <div v-if="fullWidth" class="mt-4 md:mt-12">
        <slot />
      </div>
      <UContainer v-else class="mt-4 md:mt-12">
        <slot />
      </UContainer>
    </template>
  </AppPage>
</template>
