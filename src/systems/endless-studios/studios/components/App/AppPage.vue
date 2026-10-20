<script setup lang="ts">
/**
 * Common page layout component.
 * Slots:
 *
 * - `header`: Full width banners or notifications which appear flush to the
 *   top of the page.
 * - default: The main content of the page.
 *
 * All of these slots are optional.
 */
</script>

<template>
  <div class="mb-4 md:mb-8">
    <div v-if="$slots.header" class="mb-4 md:mb-8">
      <slot name="header" />
    </div>
    <slot />
  </div>
</template>
