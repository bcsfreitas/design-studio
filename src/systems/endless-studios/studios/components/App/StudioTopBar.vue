<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'
import profilePic from '~/assets/images/profile-pic.svg'
import Notifications from '~/components/Notifications/index.vue'

const { $auth } = useNuxtApp()
const { t } = useI18n()

const mobileMenuOpen = useState<boolean>('mobile-menu-open', () => true)

const userProfilePic = computed(
  () => $auth.user?.metadata?.image_url || profilePic,
)

const { data: notificationsCount } = useNotificationsCount()

const utilityItems = computed<NavigationMenuItem[]>(() =>
  $auth.loggedIn && $auth.user
    ? [
        {
          value: 'notifications',
          slot: 'notifications' as const,
          icon: 'i-lucide-bell',
          ui: {
            linkTrailingIcon: 'hidden',
            content: 'sm:w-auto sm:min-w-110 w-full',
          },
        },
        {
          value: 'profile',
          avatar: {
            src: userProfilePic.value,
            alt: t('profile'),
            size: 'lg',
            'data-testid': 'profile-avatar-topbar',
          },
          ui: {
            linkTrailingIcon: 'hidden',
          },
          children: [
            {
              label: t('profile'),
              icon: 'i-lucide-user-round',
              to: `/profile/${$auth.user.username}/`,
            },
            {
              label: t('settings'),
              icon: 'i-lucide-settings',
              to: '/profile/edit/',
            },
            {
              label: t('support'),
              icon: 'i-lucide-message-circle-more',
              to: 'https://endlessstudios.notion.site/Endless-Studios-Platform-Support-b6f491acb5e4448aa312e5c13de82bd3?pvs=4',
              external: true,
              target: '_blank',
            },
            {
              label: t('about_us'),
              icon: 'i-lucide-info',
              to: 'https://about.endlessstudios.com',
              external: true,
              target: '_blank',
            },
            {
              label: t('logout'),
              icon: 'i-lucide-log-out',
              onSelect: () => $auth.startLogout(),
            },
          ],
        },
      ]
    : [],
)

const utilityMenuValue = useState<string>('utility-menu-value', () => '')
</script>

<template>
  <div
    class="flex lg:hidden justify-between lg:justify-end items-center bg-white w-full sticky top-0 z-50 min-h-16 px-4 [&_a:hover]:no-underline"
  >
    <div class="flex lg:hidden items-center gap-1.5">
      <UButton
        icon="i-lucide-menu"
        color="neutral"
        variant="ghost"
        size="md"
        @click="mobileMenuOpen = true"
      />
      <NuxtLink to="/" class="px-2.5 py-2">
        <img src="~/assets/images/logo-endless.svg" alt="Endless Studios" />
      </NuxtLink>
    </div>

    <UNavigationMenu
      v-if="$auth.loggedIn"
      v-model="utilityMenuValue"
      :items="utilityItems"
      :disable-hover-trigger="true"
      :disable-pointer-leave-close="true"
      content-orientation="vertical"
      color="neutral"
      variant="link"
      :ui="{
        root: 'static sm:relative',
        viewportWrapper:
          'left-0 w-full sm:left-auto sm:right-0 sm:w-auto p-2 sm:p-0',
        viewport: 'left-0 w-full sm:left-auto',
        content: 'w-full sm:w-60',
      }"
    >
      <template #notifications-leading="{ item }: { item: NavigationMenuItem }">
        <UChip :show="!!notificationsCount" color="primary" position="top-left">
          <UIcon v-if="item.icon" :name="item.icon" class="size-5" />
        </UChip>
      </template>
      <template #notifications-content>
        <Notifications @close="utilityMenuValue = ''" />
      </template>
    </UNavigationMenu>
    <div v-else class="flex items-center gap-2">
      <UButton
        variant="link"
        color="neutral"
        data-testid="login-button-topbar"
        :label="$t('login')"
        @click="$auth.startLogin()"
      />
      <UButton
        color="primary"
        size="lg"
        class="font-bold"
        data-testid="signup-button-topbar"
        :label="$t('sign_up')"
        @click="$auth.startSignup()"
      />
    </div>
  </div>
</template>
