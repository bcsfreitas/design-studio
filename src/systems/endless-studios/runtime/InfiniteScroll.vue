<script setup lang="ts" generic="T extends { id: string | number }">
// Stand-in for components/Generic/InfiniteScroll.vue, which watches a sentinel with @vueuse/core. That package isn't
// a dependency here, and an alias for it would also replace the copy Nuxt UI uses, so this renders the same slots
// for the items it is given and never asks for another page (sample lists are a single page).
withDefaults(
  defineProps<{
    items: T[]
    loading?: boolean
    auto?: boolean
    fetchNext: () => boolean | Promise<boolean>
  }>(),
  { loading: false, auto: true },
)

defineOptions({ inheritAttrs: false })
</script>

<template>
  <div>
    <main v-bind="$attrs">
      <slot v-for="(item, index) in items" :key="item.id" name="item" :item="{ item, index }" />
      <slot v-if="items.length === 0" name="empty" />
    </main>
  </div>
</template>
