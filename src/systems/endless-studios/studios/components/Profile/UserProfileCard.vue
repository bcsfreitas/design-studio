<script setup lang="ts">
import type { PropType } from 'vue'
import medalIcon from '~/assets/images/medal.svg'
import controllerIcon from '~/assets/images/controller.svg'
import profilePic from '~/assets/images/profile-pic.svg'
import type { User } from '~/types/user'

const props = defineProps({
  user: {
    type: Object as PropType<User>,
    required: true,
  },
  canEdit: {
    type: Boolean,
    required: true,
  },
  /** Avatar + username only — used when a visitor views a private profile. */
  minimal: {
    type: Boolean,
    default: false,
  },
})

defineEmits(['openProfileEditModal', 'openProfileInterestsModal'])

const { $dayjs } = useNuxtApp()

const joinedDate = computed(() => {
  if (!props.user.created_at) return ''
  return $dayjs(props.user.created_at).format('MMM YYYY')
})
</script>

<template>
  <UCard>
    <template #header>
      <section class="flex flex-col gap-4 items-center">
        <UAvatar
          :src="user.metadata.image_url ?? profilePic"
          class="mx-auto size-[175px] mt-6"
        />
        <UBadge
          v-if="canEdit && !user.public"
          variant="outline"
          color="neutral"
          class="uppercase bg-muted mt-6"
        >
          {{ $t('profile_visibility.private_badge') }}
        </UBadge>
        <p class="text-2xl font-bold mb-2">{{ user.username }}</p>
      </section>
    </template>
    <template v-if="!minimal" #default>
      <div class="flex justify-around">
        <div class="flex flex-col items-center gap-1">
          <p class="text-xs font-medium uppercase text-toned">
            {{ $t('games') }}
          </p>
          <div class="flex items-center gap-2">
            <img :src="controllerIcon" class="size-5" />
            <span class="text-xl font-bold text-default">
              {{ user.joinedProjectsCount }}
            </span>
          </div>
        </div>
        <div class="flex flex-col items-center gap-1">
          <p class="text-xs font-medium uppercase text-toned">
            {{ $t('certificates') }}
          </p>
          <div class="flex items-center gap-2">
            <img :src="medalIcon" class="size-5" />
            <span class="text-xl font-bold text-default">
              {{ user.certificatesCount }}
            </span>
          </div>
        </div>
      </div>
      <USeparator
        v-if="user.metadata?.interests?.length || canEdit"
        class="-mx-4 md:-mx-6 w-auto my-6"
      />
      <section v-if="user.metadata?.interests?.length || canEdit">
        <div
          v-if="user.metadata?.interests.length"
          class="flex flex-wrap gap-2"
        >
          <UBadge
            v-for="interest in user.metadata?.interests"
            :key="interest.id"
            variant="soft"
            color="secondary"
          >
            {{ interest.name }}
          </UBadge>
        </div>
        <UButton
          v-if="canEdit"
          variant="link"
          class="text-base font-normal p-0"
          :class="{
            'mt-3': user.metadata?.interests.length,
          }"
          @click="$emit('openProfileInterestsModal')"
        >
          {{
            user.metadata?.interests.length
              ? $t('edit_interests')
              : $t('add_interests')
          }}
        </UButton>
      </section>
      <USeparator class="-mx-4 md:-mx-6 w-auto my-6" />
      <div class="flex items-center gap-2">
        <UIcon name="i-lucide-calendar" class="size-5 text-muted" />
        <p class="text-sm text-muted">{{ $t('joined') }} {{ joinedDate }}</p>
      </div>
    </template>

    <template v-if="canEdit" #footer>
      <UButton
        variant="soft"
        color="neutral"
        class="w-full text-base justify-center no-underline"
        @click="$emit('openProfileEditModal')"
      >
        {{ $t('edit_profile') }}
      </UButton>
    </template>
  </UCard>
</template>
