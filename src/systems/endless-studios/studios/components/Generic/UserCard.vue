<script setup lang="ts">
import { computed } from 'vue'
import UserAvatar from '~/components/Generic/UserAvatar.vue'

/**
 * Identifies a user with their avatar and username, both linking to the
 * user's profile. A subtitle under the username shows the user's full name
 * when it is known, alongside any content from the default slot (such as
 * the source of a post). The badge slot renders inline after the username,
 * for components like UserBadge.
 *
 * A disabled user is shown with a greyscale avatar and a struck-through
 * username, so admin views can surface the account state at a glance.
 */

interface UserCardUser {
  username: string
  full_name?: string | null
  disabled?: boolean
  metadata?: {
    image_url?: string | null
  } | null
}

const props = withDefaults(
  defineProps<{
    user: UserCardUser
    /**
     * Where the avatar and username link to. Defaults to the user's profile
     * page. Pass null to render them as plain text, for contexts like admin
     * tables where navigating to the profile is not desirable.
     */
    to?: string | null
    /**
     * The card's text size. Use `lg` when the card serves as a page
     * heading.
     */
    size?: 'sm' | 'lg'
  }>(),
  { to: undefined, size: 'sm' },
)

const linkTarget = computed(() =>
  props.to === undefined
    ? `/profile/${props.user.username}/`
    : (props.to ?? undefined),
)

const usernameClasses = computed(() => [
  'text-highlighted',
  props.size === 'lg' ? 'font-semibold text-2xl' : 'font-medium text-sm',
  { 'line-through': props.user.disabled },
])
</script>

<template>
  <div class="flex flex-row items-center gap-3">
    <ULink :to="linkTarget" raw as="span" class="no-underline">
      <UserAvatar
        :src="user.metadata?.image_url"
        :alt="user.username"
        size="3xl"
        :class="{ grayscale: user.disabled }"
      />
    </ULink>
    <div class="flex flex-col min-w-0">
      <div class="flex flex-row items-center gap-x-1">
        <ULink :to="linkTarget" raw as="span" :class="usernameClasses">
          {{ user.username }}
        </ULink>
        <slot name="badge" />
      </div>
      <div :class="size === 'lg' ? 'text-sm' : 'text-xs truncate'">
        <div v-if="user.full_name" class="text-toned">
          {{ user.full_name }}
        </div>
        <slot />
      </div>
    </div>
  </div>
</template>
