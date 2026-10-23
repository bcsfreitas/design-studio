<script setup lang="ts">
import heroSignedIn from '~/assets/images/hero-signed-in.png'
import endstarBg from '~/assets/images/endstar-bg.webp'
import heroSignedOut from '~/assets/images/hero-signed-out.png'

const { loggedIn } = defineProps<{
  loggedIn: boolean
}>()

defineEmits(['showLauncherBanner'])

const slides = [
  {
    id: 1,
    type: 'endstar',
    background: endstarBg,
  },
  {
    id: 2,
    type: 'threadbare',
    background: loggedIn ? heroSignedIn : heroSignedOut,
  },
]
</script>

<template>
  <UCarousel
    v-slot="{ item }"
    :items="slides"
    :ui="{
      container: 'ms-0 gap-4',
      item: 'ps-0',
      prev: 'sm:-start-10',
      next: 'sm:-end-10',
    }"
    class="w-full"
    arrows
    indicators
  >
    <section
      class="py-12 px-6 w-full h-96 rounded-3xl flex flex-col items-center justify-center relative overflow-hidden bg-black"
    >
      <img
        :src="item.background"
        :alt="`${item.type} banner`"
        decoding="async"
        fetchpriority="high"
        class="w-full h-full absolute inset-0 z-1 object-cover"
      />
      <section
        class="flex flex-col items-center justify-center z-10 max-w-[860px] py-4 relative"
      >
        <!-- Endstar slide -->
        <template v-if="item.type === 'endstar'">
          <p
            class="text-3xl md:text-6xl text-white font-semibold text-center text-journey"
          >
            {{ $t('dashboard_hero.endstar_title_line1') }}
          </p>
          <p
            class="text-3xl md:text-6xl text-white font-semibold text-center text-journey"
          >
            {{ $t('dashboard_hero.endstar_title_line2') }}
          </p>
          <p
            class="text-white text-sm md:text-base mt-2 md:mt-6 font-light text-center"
          >
            {{ $t('dashboard_hero.endstar_description') }}
          </p>
          <section class="flex mt-4 md:mt-8 gap-x-2.5 md:gap-x-4 items-center">
            <button
              class="flex items-center px-6 py-2 md:py-4 md:px-6 rounded-100 bg-white text-xs md:text-base font-semibold discover-games"
              @click="$emit('showLauncherBanner')"
            >
              {{ $t('download') }}
            </button>
            <NuxtLink
              to="/games/"
              class="flex items-center px-4 py-2 md:py-4 md:px-5 rounded-100 start-outline bg-transparent text-white text-xs md:text-base font-semibold start-learning"
            >
              {{ $t('dashboard_hero.endstar_learn_more') }}
            </NuxtLink>
          </section>
        </template>

        <!-- Threadbare slide -->
        <template v-else-if="item.type === 'threadbare' && loggedIn">
          <p class="font-heading font-semibold text-4xl text-white text-center">
            {{ $t('dashboard_hero.signed_in_title') }}
          </p>
          <p
            class="font-heading font-semibold text-xl text-white mt-2 text-center"
          >
            {{ $t('dashboard_hero.signed_in_subtitle') }}
          </p>
          <p class="text-white text-base mt-2 md:mt-4 font-thin text-center">
            {{ $t('dashboard_hero.signed_in_description') }}
          </p>
          <UButton
            to="/games/Threadbare/"
            class="mt-4 no-underline"
            color="secondary"
          >
            {{ $t('dashboard_hero.signed_in_action') }}
          </UButton>
        </template>

        <template v-else>
          <p class="text-xl md:text-4xl text-white font-semibold text-center">
            {{ $t('dashboard_hero.signed_out_title') }}
          </p>
          <p
            class="text-white text-base md:text-xl mt-2 md:mt-4 font-semibold text-center max-w-2xl"
          >
            {{ $t('dashboard_hero.signed_out_description') }}
          </p>
          <div class="flex items-center gap-3 mt-4">
            <UButton
              color="neutral"
              variant="outline"
              @click="$auth.requireLogin()"
            >
              {{ $t('login') }}
            </UButton>
            <UButton to="/signup/" color="secondary" class="no-underline">
              {{ $t('dashboard_hero.create_your_account') }}
            </UButton>
          </div>
        </template>
      </section>
    </section>
  </UCarousel>
</template>

<style scoped>
.text-journey {
  letter-spacing: -4px;
  @media (width <= 600px) {
    letter-spacing: -2px;
  }
}

.discover-games {
  color: #ff754c;
  max-height: 49px;
  line-height: initial;
  text-decoration: none;
  background: linear-gradient(0deg, #ffe3ba 0%, #fff 86.73%);
  transition: all 0.5s ease;
}

.discover-games:hover {
  background: linear-gradient(0deg, #fff 0%, #fff 86.73%);
}
.start-learning {
  max-height: 49px;
  line-height: initial;
  text-decoration: none;
}

.start-learning:hover {
  background: rgba(255, 255, 255, 0.25);
}

.rounded-100 {
  border-radius: 100px;
}

.start-outline {
  border: 2px solid #fff;
}
</style>
