<script setup lang="ts">
import { gql } from 'graphql-request'
import { QueryAuth } from '~/composables/useGraphQLQuery'

const { locale } = useI18n()

const props = withDefaults(
  defineProps<{
    limit?: number
  }>(),
  {
    limit: 3,
  },
)

const { data: events } = await useGraphQLQuery(
  gql`
    query UpcomingEventInstances($options: UpcomingEventInstancesOptions) {
      upcomingEventInstances(options: $options) {
        id
        title
        start
        event {
          id
        }
      }
    }
  `,
  {
    auth: QueryAuth.Optional,
    variables: () => ({ options: { limit: props.limit } }),
  },
)

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(locale.value, {
    month: 'short',
    day: 'numeric',
  })
}
</script>

<template>
  <section class="w-full bg-white rounded-2xl border-1 border-gray-200">
    <section class="p-4 border-b-1 border-gray-200">
      <p class="text-sm font-semibold uppercase text-dimmed">
        {{ $t('events.upcoming_events') }}
      </p>
    </section>
    <section class="px-4">
      <ul v-if="events.length">
        <li v-for="event in events" :key="event.id" class="py-2">
          <NuxtLink
            :to="`/live-event/${event.event.id}/`"
            class="text-sm text-gray-light"
          >
            {{ event.title }}
          </NuxtLink>
          <p class="text-sm text-gray-light-c7">
            {{ formatDate(event.start) }}
          </p>
        </li>
      </ul>
      <p v-else class="text-sm text-gray-light py-2">
        {{ $t('events.no_upcoming_events') }}
      </p>
    </section>
  </section>
</template>
