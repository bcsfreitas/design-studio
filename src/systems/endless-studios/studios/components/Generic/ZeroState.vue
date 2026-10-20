<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    title?: string
    description?: string
    showCTA?: boolean
    redirectionURL?: string
    ctaText?: string
  }>(),
  {
    title: '',
    description: '',
    showCTA: false,
    redirectionURL: '/',
    ctaText: 'Explore',
  },
)

const emit = defineEmits<{
  actionClicked: []
}>()

const router = useRouter()

function redirect() {
  if (props.redirectionURL) {
    router.push(props.redirectionURL)
  } else {
    emit('actionClicked')
  }
}
</script>

<template>
  <section class="zero-state h-10">
    <h6 class="text-h6 leading-h6 text-black-primary max-tablet:text-body">
      {{ title }}
    </h6>
    <p v-if="description.length > 0" class="body text-center">
      {{ description }}
    </p>
    <div v-if="showCTA" class="mt-2">
      <div class="flex flex-row items-center justify-center mt-4">
        <button
          class="w-34.5 tailwind-btn py-3.25 px-4.75 tailwind-btn-orange"
          @click="redirect"
        >
          {{ ctaText }}
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
@reference "~/assets/css/main.css";
.zero-state {
  @apply w-full flex flex-col items-center justify-center;
}
</style>
