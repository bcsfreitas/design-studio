<template>
  <div>
    <InfiniteScroll
      v-if="items.length > 0 || status === 'pending'"
      :items="items"
      :loading="status === 'pending'"
      :fetch-next="fetchNext"
    >
      <template #item="{ item }">
        <NotificationTile
          class="mb-1"
          :notification="item.item.notification"
          :date="item.item.created_at"
          :is-seen="item.item.seen"
          @seen="setNotificationSeen(item.item)"
          @clicked="$emit('notificationClicked', item.item)"
        />
      </template>
    </InfiniteScroll>

    <div v-else class="flex h-60 items-center justify-around cursor-default">
      <slot name="empty">
        <h1 class="font-medium text-menu leading-menu text-gray-1">
          {{ $t('no_notifications_yet') }}
        </h1>
      </slot>
    </div>
  </div>
</template>

<script>
import { gql } from 'graphql-request'
import { SET_NOTIFICATION_SEEN } from '~/graphql_schemas/notifications'
import NotificationTile from '~/components/Notifications/NotificationTile.vue'
import InfiniteScroll from '~/components/Generic/InfiniteScroll.vue'
import { useStreamingGraphQLQuery } from '~/composables/useStreamingGraphQLQuery.js'

export default {
  components: {
    NotificationTile,
    InfiniteScroll,
  },
  props: {
    pageSize: {
      type: Number,
      default: 10,
    },
  },
  emits: ['notificationClicked', 'notificationSeen'],
  async setup(props) {
    const { $auth } = useNuxtApp()

    const { items, status, fetchNext } = useStreamingGraphQLQuery(
      gql`
        query NOTIFICATIONS_LIST($userId: Int!, $limit: Int, $offset: Int) {
          getUserNotifications(
            input: { user_id: $userId, limit: $limit, offset: $offset }
          ) {
            user_id
            id
            notification_id
            seen
            created_at
            notification {
              id
              object_id
              object_type_id
              notification_type_id
              title
              message
              redirect_url
              image_url
            }
          }
        }
      `,
      {
        variables: () => ({
          userId: $auth.user.id,
          limit: props.pageSize,
        }),
        defaultCursor: 0,
        updateCursor: ({ cursor, items }) =>
          items.length >= props.pageSize ? cursor + items.length : null,
        cursorVariables: (cursor) => ({
          offset: cursor,
        }),
      },
    )

    return { items, status, fetchNext }
  },
  methods: {
    async setNotificationSeen(userNotification) {
      try {
        if (userNotification.seen) return

        await this.$graphqlRequest.mutate(SET_NOTIFICATION_SEEN, {
          input: {
            user_notification_id: userNotification.id,
            seen: true,
          },
        })

        this.replaceItem({
          ...userNotification,
          seen: true,
        })

        this.$emit('notificationSeen', userNotification)
      } catch (error) {
        console.warn('Error setting notification as seen:', error)
      }
    },
    replaceItem(newItem) {
      const index = this.items.findIndex((item) => item.id === newItem.id)
      if (index !== -1) {
        this.items = this.items.toSpliced(index, 1, newItem)
      }
    },
  },
}
</script>
