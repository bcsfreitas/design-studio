<script setup lang="ts">
// The Endless Studios home (frontend/app/pages/index.vue at 11517cbee), composed from the app's own components with
// the page's markup. The views wrap it in the app shell (sidebar, top bar, footer); the programs come from the
// page's HOME_PAGE_PROGRAMS query, answered by each view's sample. Left out because they aren't copied yet: the live
// event banner, the community feed, the signed-out profile placeholder and the enrollment and launcher modals.
import { gql } from 'graphql-request'
import AppSimplePage from '~/components/App/AppSimplePage.vue'
import Hero from '~/components/Dashboard/Hero.vue'
import UserProfile from '~/components/Profile/UserProfile.vue'
import ProgramTile from '~/components/Program/ProgramTile.vue'
import OnboardingCard from '~/components/Dashboard/OnboardingCard.vue'
import AccessCode from '~/components/shared/AccessCode.vue'
import UpcomingEvents from '~/components/Dashboard/UpcomingEvents.vue'
import type { MyProgramCohort } from '~/types/program'

type HomeProgram = {
  id: number
  name: string | null
  short_description: string | null
  image_url: string | null
  program_kind_id: string | null
  program_status_id: string | null
  tasks_count: number
  my_cohorts: MyProgramCohort[]
}

const { $auth } = useNuxtApp()

const { data: myPrograms } = await useGraphQLQuery(
  gql`
    query HOME_PAGE_PROGRAMS {
      me {
        cohort_programs(
          input: {
            limit: 2
            is_active: true
            program_kind_id: regular
            program_statuses: [notstarted, inprogress, completed]
          }
        ) {
          id
          name
          short_description
          image_url
          program_kind_id
          program_status_id
          tasks_count
          my_cohorts {
            id
            name
          }
        }
      }
    }
  `,
  {
    default: () => [],
    transform: (me) => (me as { cohort_programs: HomeProgram[] }).cohort_programs,
  },
)

const programs = computed(() => (myPrograms.value ?? []) as HomeProgram[])

function openEnrollmentModal() {
  console.info('[Studios em Vue] the enrollment modal is not part of this exploration')
}
</script>

<template>
  <AppSimplePage>
    <template #hero>
      <Hero class="mb-14" :logged-in="$auth.loggedIn" />
    </template>

    <div class="grid grid-cols-12 gap-6 md:mx-8">
      <section
        :class="{ 'max-tablet:hidden': !$auth.loggedIn }"
        class="col-span-12 lg:col-span-3 relative h-full order-1 lg:order-1"
      >
        <UserProfile v-if="$auth.loggedIn" />
      </section>
      <section class="col-span-12 lg:col-span-6 max-xl:pr-0 order-3 lg:order-2">
        <div class="max-sm:mr-0">
          <section v-if="programs.length > 0" class="w-full mb-12">
            <section class="flex justify-between mb-3">
              <p class="text-xs text-gray-light uppercase">
                {{ $t('current_programs') }}
              </p>
              <NuxtLink to="/programs/" class="link-see-all text-xs rounded-lg border-0 no-underline"
                >{{ $t('see_all') }}&nbsp;&#8594;
              </NuxtLink>
            </section>
            <section class="flex flex-col gap-y-6 mb-6">
              <ProgramTile
                v-for="program in programs"
                :key="`user-program-${program.id}`"
                :test-attr-data="program.name ?? ''"
                :program="program"
                :cohorts="program.my_cohorts"
                :is-mine="true"
              />
            </section>
          </section>

          <OnboardingCard
            v-else-if="$auth.loggedIn"
            class="mb-12"
            @open-enrollment-modal="openEnrollmentModal"
          />
        </div>
      </section>
      <section class="col-span-12 lg:col-span-3 h-full relative order-2 lg:order-3">
        <section class="sticky access-upcoming">
          <section class="flex flex-col gap-y-6">
            <AccessCode
              :title="$t('access_code')"
              :description="$t('access_code_if_you_are_part_of_a_program')"
              :button-text="$t('i_have_a_code')"
              @open="openEnrollmentModal"
            />
            <UpcomingEvents />
          </section>
        </section>
      </section>
    </div>
  </AppSimplePage>
</template>

<style scoped>
/* The page's own styles, from pages/index.vue. */
.access-upcoming {
  top: 96px;
}

.link-see-all {
  color: #979797;
  text-decoration: none !important;
}
</style>
