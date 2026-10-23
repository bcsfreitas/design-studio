<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'
import profilePic from '~/assets/images/profile-pic.svg'
import Notifications from '~/components/Notifications/index.vue'
import { DASHBOARD_PATH } from '~/utils/dashboardRoute'

interface NavColors {
  hover: string
  active: string
}

const COLORS = {
  orange: {
    hover: 'hover:bg-slate-50 hover:text-orange-500',
    active: 'bg-orange-50 text-orange-600',
  },
  purple: {
    hover: 'hover:bg-slate-50 hover:text-purple-500',
    active: 'bg-purple-50 text-purple-500',
  },
  blue: {
    hover: 'hover:bg-slate-50 hover:text-blue-500',
    active: 'bg-blue-50 text-blue-500',
  },
} satisfies Record<string, NavColors>

const LINK_BASE = 'gap-4 h-9 py-0.5 px-4 rounded-lg text-sm font-semibold'

/** `before:` is cleared because the theme's active marker shows through the row colour. */
const NO_MARKER = 'before:bg-transparent hover:before:bg-transparent'

const CHILD_BASE = `py-1.5 px-2.5 rounded-lg text-sm font-normal items-center ${NO_MARKER}`

const { $auth } = useNuxtApp()
const route = useRoute()
const { t } = useI18n()

/** A deeper destination wins, so `/games/my/` does not also light `/games/`. */
function ownsPath(to: string, path: string) {
  if (path === to) return true
  if (!path.startsWith(to)) return false

  return !navTargets.value.some(
    (other) =>
      other !== to && other.length > to.length && path.startsWith(other),
  )
}

function linkClass(colors: NavColors, active: boolean) {
  const state = active ? colors.active : `text-slate-700 ${colors.hover}`
  return `${LINK_BASE} ${state}`
}

function childClass(colors: NavColors, active: boolean) {
  const state = active ? colors.active : `text-slate-700 ${colors.hover}`
  return `${CHILD_BASE} ${state}`
}

/**
 * Section headers (Play / Learning) are `div`s, so `cursor-default` keeps the
 * pointer an arrow. No hover unless `labelHover` is set.
 */
function labelClass(colors: NavColors, hover: boolean) {
  const state = hover
    ? `text-slate-700 ${colors.hover}`
    : 'text-slate-700 hover:text-slate-700 hover:bg-transparent'
  return `${LINK_BASE} cursor-default ${state}`
}

/**
 * Admin is a disclosure, not a page — hover matches its children, but it
 * never takes the active leaf colour (including when a child route matches).
 */
function triggerClass() {
  return `${LINK_BASE} text-slate-700 ${COLORS.orange.hover} data-[state=open]:text-slate-700 data-[state=open]:hover:text-orange-500 ${NO_MARKER}`
}

const ICON_UI = {
  /** `!` beats the theme's `text-dimmed`, which it sets on any inactive row's icon. */
  linkLeadingIcon: '!text-current size-5',
  linkLabel: 'flex-1 flex items-center justify-between',
  linkLabelExternalIcon: 'text-current size-4 shrink-0',
}

const canSeeAdminTab = computed(() => {
  if (!$auth.user) return false
  return (
    $auth.isAdmin ||
    $auth.isEditor ||
    $auth.isProgramAdmin ||
    $auth.isInstitutionAdmin ||
    $auth.isCohortAdmin
  )
})

const userProfilePic = computed(
  () => $auth.user?.metadata?.image_url || profilePic,
)

const { data: notificationsCount } = useNotificationsCount()

interface NavChild {
  label: string
  to: string
}

interface NavGroup {
  label: string
  icon: string
  colors: NavColors
  children: NavChild[]
  /** Opt into coloured label hover (Make / Contribute). Off for Play / Learning. */
  labelHover?: boolean
}

interface LeaderNavItem {
  label: string
  to: string
}

const navGroups = computed<NavGroup[]>(() => [
  {
    label: t('play'),
    icon: 'i-lucide-gamepad-2',
    colors: COLORS.purple,
    children: [
      { label: t('explore_games'), to: '/games/' },
      { label: t('my_projects'), to: '/games/my/' },
    ],
  },
  {
    label: t('learning'),
    icon: 'i-lucide-brain',
    colors: COLORS.blue,
    children: [
      { label: t('my_programs'), to: '/programs/' },
      { label: t('resources'), to: '/resources/Learning/' },
    ],
  },
])

const leaderNavItems = computed<LeaderNavItem[]>(() => {
  const items = [
    {
      label: t('games'),
      to: '/leader/games/',
      roles: [$auth.isAdmin, $auth.isLeader],
    },
    {
      label: t('programs'),
      to: '/leader/programs/',
      // A Cohort Admin runs a cohort inside a program rather than a
      // program of their own, and reaches that cohort through this page.
      roles: [$auth.isAdmin, $auth.isProgramAdmin, $auth.isCohortAdmin],
    },
    {
      label: t('dashboard_ui.title'),
      to: DASHBOARD_PATH,
      roles: [$auth.isAdmin, $auth.isProgramAdmin, $auth.isCohortAdmin],
    },
    {
      label: t('resources'),
      to: '/leader/resources/',
      roles: [$auth.isAdmin, $auth.isEditor],
    },
    {
      label: t('feed_console'),
      to: '/leader/feed-console/',
      roles: [$auth.isAdmin, $auth.isEditor],
    },
    {
      label: t('users'),
      to: '/leader/users/',
      roles: [$auth.isAdmin, $auth.isEditor],
    },
    {
      label: t('institutions'),
      to: '/leader/institutions/',
      roles: [$auth.isAdmin, $auth.isInstitutionAdmin],
    },
    {
      label: t('events.title'),
      to: '/leader/events/',
      roles: [$auth.isAdmin, $auth.isEditor],
    },
    {
      label: t('analytics'),
      to: '/leader/analytics/',
      roles: [$auth.isAdmin],
    },
  ]

  return items
    .filter((item) => item.roles.some(Boolean))
    .map(({ roles: _roles, ...item }) => item)
})

const navTargets = computed<string[]>(() => [
  ...navGroups.value.flatMap((navGroup) =>
    navGroup.children.map((child) => child.to),
  ),
  ...leaderNavItems.value.map((item) => item.to),
])

function group({
  label,
  icon,
  colors,
  children,
  labelHover = false,
}: NavGroup): NavigationMenuItem[] {
  // Labels are not destinations — only the leaf under them takes the
  // active colour, matching the Figma active-menu treatment.
  return [
    {
      type: 'label',
      label,
      icon,
      ui: { label: labelClass(colors, labelHover), ...ICON_UI },
    },
    ...children.map((child) => ({
      ...child,
      ui: {
        item: 'ps-[42px]',
        link: childClass(colors, ownsPath(child.to, route.path)),
      },
    })),
  ]
}

const primaryNavItems = computed<NavigationMenuItem[]>(() => [
  {
    label: t('home'),
    icon: 'i-lucide-home',
    to: '/',
    ui: { link: linkClass(COLORS.orange, route.path === '/'), ...ICON_UI },
  },
  ...navGroups.value.flatMap(group),
])

const adminNavItems = computed<NavigationMenuItem[]>(() =>
  canSeeAdminTab.value
    ? [
        {
          value: 'admin',
          // `trigger` skips link props so a child route cannot mark Admin active.
          type: 'trigger' as const,
          active: false,
          label: t('admin'),
          icon: 'i-lucide-settings',
          children: leaderNavItems.value.map((item) => ({
            ...item,
            ui: {
              // Same indent as Play/Learning children (`item: 'ps-[42px]'`);
              // `ms-0` clears the theme's accordion `-ms-px` on childItem.
              childItem: 'ps-[42px] ms-0',
              link: childClass(COLORS.orange, ownsPath(item.to, route.path)),
            },
          })),
          ui: {
            link: triggerClass(),
            // Drop the theme's child rail; gap matches the primary list.
            childList: 'ms-0 gap-2 border-s-0',
            ...ICON_UI,
          },
        },
      ]
    : [],
)

const desktopNavItems = computed<NavigationMenuItem[][]>(() => {
  const sections: NavigationMenuItem[][] = [primaryNavItems.value]
  if (adminNavItems.value.length) sections.push(adminNavItems.value)
  return sections
})

const expandedGroups = ref<string[]>(['admin'])

const navMenuUi = {
  root: 'gap-0',
  list: 'flex flex-col gap-2',
  link: 'no-underline',
  childLink: 'no-underline',
  separator: 'my-4 h-px bg-border',
}

const profileMenuItems = computed(() => {
  if (!$auth.loggedIn || !$auth.user) return []

  return [
    [
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
    ],
    [
      {
        label: t('support'),
        icon: 'i-lucide-message-circle-more',
        to: 'https://endlessstudios.notion.site/Endless-Studios-Platform-Support-b6f491acb5e4448aa312e5c13de82bd3?pvs=4',
        target: '_blank',
      },
      {
        label: t('about_us'),
        icon: 'i-lucide-info',
        to: 'https://about.endlessstudios.com',
        target: '_blank',
      },
    ],
    [
      {
        label: t('logout'),
        icon: 'i-lucide-log-out',
        onSelect: () => $auth.startLogout(),
      },
    ],
  ]
})

const mobileMenuOpen = useState<boolean>('mobile-menu-open', () => true)
const notificationsOpen = ref(false)

/** USidebar treats `open` as expanded on desktop and as the menu on mobile. */
function closeMobileMenu() {
  if (import.meta.client && window.matchMedia('(max-width: 1023px)').matches) {
    mobileMenuOpen.value = false
  }
}

watch(
  () => route.path,
  (path) => {
    closeMobileMenu()
    if (path.startsWith('/leader/') && !expandedGroups.value.includes('admin'))
      expandedGroups.value = [...expandedGroups.value, 'admin']
  },
)
</script>

<template>
  <USidebar
    v-model:open="mobileMenuOpen"
    collapsible="offcanvas"
    mode="slideover"
    :menu="{
      // Slideover's own ring/divide would draw a stray edge on mobile.
      ui: { content: 'ring-transparent divide-transparent' },
    }"
    :ui="{
      root: '[--sidebar-width:224px]',
      // Own fill so hover shows; body slate-50 would show through otherwise.
      inner: 'bg-default divide-transparent',
      header: 'mt-4 h-16 px-4 flex items-center justify-between gap-2',
      // Theme body already scrolls (`overflow-y-auto`); keep padding tight.
      body: 'gap-0 p-2 lg:px-4 lg:py-0',
      // Theme adds its own 1.5 gap; rows below set their own spacing.
      footer: 'flex-col items-stretch gap-0 px-4 pt-2 pb-6',
    }"
  >
    <template #header="{ close }">
      <NuxtLink to="/" class="ms-3 flex items-center gap-2 no-underline">
        <img
          src="~/assets/images/logo-endless-navbar.svg"
          alt="Endless Studios"
        />
      </NuxtLink>
      <UButton
        class="lg:hidden"
        icon="i-lucide-x"
        color="neutral"
        variant="ghost"
        :aria-label="$t('close')"
        @click="close()"
      />
    </template>

    <UNavigationMenu
      v-model="expandedGroups"
      :items="desktopNavItems"
      orientation="vertical"
      variant="link"
      color="neutral"
      external-icon="i-lucide-external-link"
      :ui="navMenuUi"
    />

    <template #footer>
      <!-- Notifications and profile already live in the mobile header. -->
      <div class="hidden lg:contents">
        <UPopover
          v-if="$auth.loggedIn"
          v-model:open="notificationsOpen"
          class="mb-4"
          :content="{
            side: 'right',
            align: 'end',
            sideOffset: 8,
            collisionPadding: 16,
          }"
          :ui="{
            content:
              'sm:w-auto sm:min-w-110 w-full p-0 max-h-[calc(100dvh-2rem)] overflow-y-auto',
          }"
        >
          <UButton
            color="neutral"
            variant="ghost"
            block
            :class="`group shrink-0 ${LINK_BASE} text-slate-700 hover:text-highlighted`"
            :ui="{ base: 'justify-start' }"
          >
            <template #leading>
              <UIcon
                name="i-lucide-bell"
                class="size-5 text-slate-900 group-hover:text-highlighted transition-colors"
              />
            </template>
            <span class="inline-flex items-center gap-2 w-full justify-between">
              {{ $t('notifications') }}
              <UBadge
                v-if="notificationsCount"
                color="neutral"
                variant="outline"
                size="sm"
                class="rounded-md bg-muted tabular-nums text-slate-700 shrink-0"
              >
                {{ notificationsCount }}
              </UBadge>
            </span>
          </UButton>

          <template #content>
            <Notifications @close="notificationsOpen = false" />
          </template>
        </UPopover>

        <div
          class="shrink-0 border-t border-default pt-4"
          :class="{ 'border-t-0 pt-0': !$auth.loggedIn }"
        >
          <UDropdownMenu
            v-if="$auth.loggedIn && $auth.user"
            :items="profileMenuItems"
            :content="{ side: 'top', align: 'start', sideOffset: 8 }"
            :ui="{
              content: 'w-(--reka-dropdown-menu-trigger-width)',
              item: 'h-10 gap-2 px-2.5 text-slate-700 no-underline hover:no-underline items-center',
              itemLeadingIcon: 'size-5 text-slate-900',
            }"
          >
            <UButton
              color="neutral"
              variant="ghost"
              block
              class="justify-start gap-2 p-4"
              :ui="{ base: 'justify-start' }"
            >
              <UAvatar
                :src="userProfilePic"
                :alt="$t('profile')"
                size="sm"
                data-testid="profile-avatar-sidebar"
              />
              <span
                class="flex-1 text-left font-heading font-semibold text-base leading-6 text-slate-900 truncate"
              >
                {{ $auth.user.username }}
              </span>
              <UIcon
                name="i-lucide-chevrons-up-down"
                class="size-4 shrink-0 text-muted"
              />
            </UButton>
          </UDropdownMenu>
          <div v-else class="flex items-center justify-center gap-4">
            <UButton
              variant="ghost"
              color="neutral"
              size="lg"
              data-testid="login-button-sidebar"
              :label="$t('login')"
              @click="$auth.startLogin()"
            />
            <UButton
              color="primary"
              size="lg"
              class="font-bold"
              data-testid="signup-button-sidebar"
              :label="$t('sign_up')"
              @click="$auth.startSignup()"
            />
          </div>
        </div>
      </div>
    </template>
  </USidebar>
</template>
