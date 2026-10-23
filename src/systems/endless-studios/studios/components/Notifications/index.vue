<template>
  <section>
    <div class="flex justify-between items-center my-4 mx-4">
      <h6 class="font-semibold text-lg">
        {{ $t('recent_notifications') }}
      </h6>
      <UButton
        variant="link"
        color="neutral"
        icon="i-lucide-settings"
        to="/profile/edit/"
        :title="$t('account_settings')"
        @click="$emit('close')"
      />
    </div>
    <NotificationsList
      class="px-2 pb-4"
      @notification-clicked="$emit('close')"
    />
  </section>
</template>

<script>
import NotificationsList from '~/components/Notifications/List.vue'

export default {
  components: {
    NotificationsList,
  },
  emits: ['close'],
}
</script>
