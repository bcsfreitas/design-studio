<script setup lang="ts">
import profilePic from '~/assets/images/profile-pic.svg'

/**
 * A UAvatar that falls back to the app's default profile picture when the
 * user has no image, matching the `resolveProfilePic` behaviour used by
 * the rest of the app (e.g. PostCard) so avatars stay consistent.
 */

type AvatarSize =
  | '3xs'
  | '2xs'
  | 'xs'
  | 'sm'
  | 'md'
  | 'lg'
  | 'xl'
  | '2xl'
  | '3xl'

withDefaults(
  defineProps<{
    src?: string | null
    alt?: string
    size?: AvatarSize
  }>(),
  { src: null, alt: '', size: 'sm' },
)
</script>

<template>
  <UAvatar :src="src || profilePic" :alt="alt" :size="size" />
</template>
