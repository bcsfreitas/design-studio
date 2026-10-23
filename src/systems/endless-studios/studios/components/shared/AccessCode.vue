<script setup lang="ts">
defineProps<{
  title: string
  description: string
  buttonText: string
}>()

const emit = defineEmits<{
  open: []
}>()

const { $auth } = useNuxtApp()

function openEnrollmentModal() {
  if (!$auth.loggedIn) {
    $auth.requireLogin()
  } else {
    emit('open')
  }
}
</script>

<template>
  <section class="w-full bg-white rounded-2xl border-1 border-gray-200">
    <section class="p-4 border-b-1 border-gray-200">
      <p class="text-sm font-semibold">
        {{ title }}
      </p>
    </section>
    <section class="flex flex-col gap-y-4 p-4">
      <p class="text-xs text-gray-light-body">
        {{ description }}
      </p>
      <button
        class="rounded-lg border-1 border-gray-200 py-2 px-3.5 text-xs"
        @click="openEnrollmentModal"
      >
        {{ buttonText }}
      </button>
    </section>
  </section>
</template>
