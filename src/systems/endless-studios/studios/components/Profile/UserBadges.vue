<template>
  <section v-if="elements && elements.length" class="flex flex-col gap-3 px-5">
    <p class="text-base font-semibold">{{ title }}</p>
    <section class="flex flex-wrap gap-x-2 gap-y-2">
      <div
        v-for="element in elements"
        :key="element.id"
        class="bg-gray-10 rounded-sm py-1 px-3 text-xs"
      >
        {{ element.name }}
      </div>
    </section>
  </section>
</template>

<script>
export default {
  props: {
    title: {
      type: String,
      required: true,
    },
    elements: {
      type: Array,
      required: false,
      default: () => [],
    },
  },
}
</script>
