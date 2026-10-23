<script setup lang="ts">
import { computed, nextTick } from 'vue'
// @ts-expect-error vuex types not properly exported
import { useStore } from 'vuex'

import NotificationTypeIcon from '~/components/Notifications/NotificationTypeIcon.vue'
import blackEndlessLogo from '~/assets/images/black-endless-logo.png'

interface Notification {
  id: number
  object_id: number
  object_type_id: string
  notification_type_id: string
  title: string
  message: string
  redirect_url: string | null
  image_url: string | null
}

const props = defineProps<{
  notification: Notification
  date: string
  isSeen: boolean
}>()

const emit = defineEmits<{
  seen: []
  clicked: []
}>()

const { $dayjs } = useNuxtApp()
const store = useStore()

function openModal(modalId: string, modalData: Record<string, unknown> = {}) {
  store.dispatch('closeModal')
  nextTick(() => {
    store.dispatch('openModal', { modalId, modalData })
  })
}

const NOTIFICATION_TYPES = {
  NEW_TASK: 'newtask',
  TASK_FEEDBACK: 'newfeedbacktotaskupdate',
  TASK_APPROVED: 'taskapproved',
  TASK_DUE_SOON: 'taskdeadline',
} as const

const entityId = computed(() => {
  const url = props.notification.redirect_url
  return url ? Number(url.substring(url.lastIndexOf('/') + 1)) : 0
})

function trimSlashes(path: string): string {
  if (path.startsWith('/')) path = path.substring(1)
  if (path.endsWith('/')) path = path.substring(0, path.length - 1)
  return path
}

const redirectUrl = computed<string | null>(() => {
  switch (props.notification.notification_type_id) {
    case NOTIFICATION_TYPES.NEW_TASK:
    case NOTIFICATION_TYPES.TASK_FEEDBACK:
    case NOTIFICATION_TYPES.TASK_APPROVED:
    case NOTIFICATION_TYPES.TASK_DUE_SOON:
      return null
    default:
      return props.notification.redirect_url
        ? `/${trimSlashes(props.notification.redirect_url)}/`
        : null
  }
})

const taskId = computed<number | null>(() => {
  switch (props.notification.notification_type_id) {
    case NOTIFICATION_TYPES.NEW_TASK:
    case NOTIFICATION_TYPES.TASK_FEEDBACK:
    case NOTIFICATION_TYPES.TASK_APPROVED:
    case NOTIFICATION_TYPES.TASK_DUE_SOON:
      return entityId.value || null
    default:
      return null
  }
})

const timeAgo = computed(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dayjs-nuxt augments $dayjs with plugin methods at runtime
  return ($dayjs as any)(props.date).fromNow(true)
})

function handleClick(event: MouseEvent) {
  if (!redirectUrl.value) {
    event.preventDefault()
  }
  emit('clicked')
  if (taskId.value) {
    openModal('task-modal', {
      id: taskId.value,
      taskId: taskId.value,
      userTaskId: taskId.value,
    })
  }
}
</script>

<template>
  <NuxtLink
    :to="redirectUrl ?? ''"
    class="flex items-center gap-6 p-3 rounded-xl no-underline hover:bg-elevated/50"
    @click="handleClick"
    @mouseleave="emit('seen')"
  >
    <UChip
      class="self-start mt-2"
      size="lg"
      position="top-right"
      :ui="{ base: 'bg-transparent ring-0' }"
    >
      <UAvatar :src="notification.image_url || blackEndlessLogo" size="xl" />
      <template #content>
        <NotificationTypeIcon
          class="w-7 h-auto"
          :type="notification.notification_type_id"
        />
      </template>
    </UChip>

    <div class="grow">
      <div class="flex flex-col sm:flex-row gap-1 sm:gap-4 mb-1">
        <p class="grow text-sm font-medium text-highlighted">
          {{ notification.title }}
          <Transition
            leave-active-class="transition-opacity duration-300"
            leave-to-class="opacity-0"
          >
            <UChip v-if="!isSeen" standalone />
          </Transition>
        </p>
        <p class="shrink-0 self-start text-xs text-muted">
          {{ $t('time_ago', { time: timeAgo }) }}
        </p>
      </div>
      <p class="text-sm text-muted line-clamp-2">
        {{ notification.message }}
      </p>
    </div>
  </NuxtLink>
</template>
