<script setup lang="ts">
import { computed } from 'vue'
import defaultBg from '~/assets/images/default-bg.png'
import type { MyProgramCohort } from '~/types/program'

type Program = {
  id: number
  name: string | null
  short_description: string | null
  image_url: string | null
  program_kind_id: string | null
  program_status_id: string | null
  tasks_count: number
}

const props = withDefaults(
  defineProps<{
    testAttrData: string
    program: Program
    /** The cohorts the viewer belongs to under this program. The program page
     *  opens on whichever one the card leads to. */
    cohorts?: MyProgramCohort[]
    isMine?: boolean
    isLeaderView?: boolean
  }>(),
  {
    cohorts: () => [],
    isMine: false,
    isLeaderView: false,
  },
)

const emit = defineEmits<{
  delete: []
  click: []
}>()

const router = useRouter()

const programStatus = computed(
  () => props.program.program_status_id || 'inprogress',
)

const singleCohort = computed(() =>
  props.cohorts.length === 1 ? props.cohorts[0] : null,
)
const hasCohortChoice = computed(() => props.cohorts.length > 1)

function openCohort(cohortId: number) {
  router.push(`/programs/${props.program.id}/?cohort=${cohortId}`)
}

// Choosing a cohort opens its page, so this is an action rather than a value
// the card holds. Choosing the same cohort twice has to open it both times.
const cohortItems = computed(() =>
  props.cohorts.map((cohort) => ({
    label: cohort.name,
    onSelect: () => openCohort(cohort.id),
  })),
)

function handleClick() {
  if (props.isLeaderView) {
    emit('click')
    return
  }
  if (singleCohort.value) {
    openCohort(singleCohort.value.id)
    return
  }
  // Several cohorts name no single page, so the card opens the program and
  // lets it settle on the cohort the viewer is working in. The picker beside
  // this is how they reach the other one.
  router.push(`/programs/${props.program.id}/`)
}
</script>

<template>
  <section
    class="program bg-white flex gap-x-4 border-1 border-gray-200 overflow-hidden"
    :datatest="testAttrData"
    @click="handleClick"
  >
    <img
      class="rounded-2xl object-cover program-tile-img"
      :src="program.image_url || defaultBg"
      alt="program image"
    />

    <section
      class="flex flex-col justify-between py-2 sm:pr-4 w-full overflow-hidden"
      :class="`program__text-container__${isLeaderView ? 'leader' : 'user'} `"
    >
      <section class="flex flex-col gap-y-1">
        <p
          class="text-base font-bold text-black-primary truncate overflow-hidden text-ellipsis line-clamp-2"
        >
          {{ program.name }}
        </p>
        <p class="program__description">
          {{ program.short_description }}
        </p>
      </section>
      <section class="flex justify-between">
        <p v-if="program.tasks_count" class="text-xs text-gray-light">
          {{ program.tasks_count }} Tasks
        </p>
        <p
          v-if="isMine"
          class="py-0.5 px-3 text-program-status text-xs rounded-lg border-1 border-gray-200 text-black-title2 font-medium h-content min-w-content"
          datatest="in-progress"
        >
          {{ $t(`program_status.${programStatus}`) }}
        </p>
      </section>
      <section v-if="cohorts.length" class="mt-2 pt-2 border-t border-gray-200">
        <UDropdownMenu
          v-if="hasCohortChoice"
          :items="cohortItems"
          :content="{ align: 'start' }"
        >
          <UButton
            color="neutral"
            variant="outline"
            trailing-icon="i-lucide-chevron-down"
            :ui="{ trailingIcon: 'text-gray-400' }"
            :label="$t('cohort.choose')"
            data-testid="program-cohort-select"
            @click.stop
          />
        </UDropdownMenu>
        <p v-else-if="singleCohort" class="text-xs text-gray-light">
          <span class="font-semibold text-black-title2">
            {{ $t('cohort.title') }}:
          </span>
          <span data-testid="program-cohort-name">{{ singleCohort.name }}</span>
        </p>
      </section>
    </section>
    <section
      v-if="isLeaderView"
      class="ml-auto w-fit self-center h-fit p-3 rounded-full hover:bg-orange-endless"
    >
      <img
        class="cursor-pointer"
        src="~/assets/images/Icons/trash-icon.svg"
        alt=""
        @click.stop="emit('delete')"
      />
    </section>
  </section>
</template>

<style scoped>
@reference "~/assets/css/main.css";
.program {
  @apply p-2 flex rounded-3xl cursor-pointer;
  &:hover {
    box-shadow: 0px 10px 19px 7px rgb(156 161 165 / 15%) !important;
  }
  .program-tile-img {
    aspect-ratio: 91/51;
    width: 150px;
    height: 118px;
    @media (width <= 360px) {
      width: 100%;
    }
  }

  .text-program-status {
    @apply flex gap-x-1 items-center;
  }
  .text-program-status:before {
    content: '';
    display: inline-block;
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: #2fb0f8;
  }

  @media (width <= 360px) {
    @apply flex-col;
  }
}
.program__description {
  @apply text-sm text-gray-light overflow-hidden leading-5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
.program__text-container__leader {
  width: calc(100% - 240px);
  @apply max-sm:w-full;
}
.program__text-container__user {
  @media (width <= 360px) {
    @apply gap-y-2;
  }
}
</style>
