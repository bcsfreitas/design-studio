<script setup lang="ts">
import AppSimplePage from '~/components/App/AppSimplePage.vue'
import UserCard from '~/components/Generic/UserCard.vue'
import ZeroState from '~/components/Generic/ZeroState.vue'

const search = ref('')
const role = ref('all')
const confirmOpen = ref(false)

const leader = {
  username: 'maria.oliveira',
  full_name: 'Maria Oliveira',
  metadata: { image_url: null },
}

const roles = [
  { label: 'All roles', value: 'all' },
  { label: 'Learners', value: 'learner' },
  { label: 'Facilitators', value: 'facilitator' },
]

const members = [
  { username: 'ana.souza', name: 'Ana Souza', role: 'Learner', projects: 4, status: 'Active' },
  { username: 'joao.lima', name: 'João Lima', role: 'Learner', projects: 2, status: 'Pending consent' },
  { username: 'carla.reis', name: 'Carla Reis', role: 'Facilitator', projects: 9, status: 'Active' },
]

const columns = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'role', header: 'Role' },
  { accessorKey: 'projects', header: 'Projects' },
  { accessorKey: 'status', header: 'Status' },
]

const menu = [
  [
    { label: 'Copy Link', icon: 'i-lucide-link' },
    { label: 'Create Enrollment Code', icon: 'i-lucide-ticket' },
  ],
  [{ label: 'Archive Cohort', icon: 'i-lucide-archive', color: 'error' as const, onSelect: () => (confirmOpen.value = true) }],
]
</script>

<template>
  <AppSimplePage>
    <template #header>
      <UAlert
        color="info"
        variant="soft"
        icon="i-lucide-info"
        title="Spring cohort starts on November 3"
        description="Invite learners before then so they can join the first session."
      />
    </template>

    <div class="flex flex-col gap-6">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 class="text-3xl text-highlighted">Game Design Foundations</h1>
          <p class="text-muted mt-1">Spring 2027 · 24 learners</p>
        </div>
        <div class="flex items-center gap-2">
          <UTooltip text="Share this cohort with another leader">
            <UButton color="secondary" variant="ghost" icon="i-lucide-share-2" label="Share" />
          </UTooltip>
          <UButton icon="i-lucide-user-plus" label="Invite Learners" />
          <UDropdownMenu :items="menu">
            <UButton color="neutral" variant="outline" icon="i-lucide-ellipsis" aria-label="More actions" />
          </UDropdownMenu>
        </div>
      </div>

      <div class="grid gap-6 md:grid-cols-3">
        <UCard class="md:col-span-2">
          <template #header>
            <div class="flex flex-wrap items-center gap-3">
              <UInput v-model="search" icon="i-lucide-search" placeholder="Search members" class="flex-1 min-w-48" />
              <USelect v-model="role" :items="roles" class="w-40" />
            </div>
          </template>
          <UTable :data="members" :columns="columns" />
        </UCard>

        <div class="flex flex-col gap-6">
          <UCard variant="soft">
            <p class="text-sm text-muted mb-3">Cohort leader</p>
            <UserCard :user="leader" :to="null" />
          </UCard>
          <UCard>
            <div class="flex flex-wrap gap-2">
              <UBadge label="Active" color="success" variant="soft" />
              <UBadge label="Ages 13–17" color="secondary" variant="soft" />
              <UBadge label="Parental consent" color="kids" variant="subtle" />
            </div>
            <USeparator class="my-4" />
            <UButton color="kids" variant="gating" trailing-icon="i-lucide-lock" label="Ask a Parent" block />
          </UCard>
        </div>
      </div>

      <div class="py-16">
        <ZeroState title="No projects yet" description="Projects your learners publish show up here." show-c-t-a cta-text="Explore" />
      </div>
    </div>

    <UModal v-model:open="confirmOpen" title="Archive this cohort?" description="Learners keep their projects, but nobody can join anymore.">
      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton color="neutral" variant="ghost" label="Cancel" @click="confirmOpen = false" />
          <UButton color="error" label="Archive Cohort" @click="confirmOpen = false" />
        </div>
      </template>
    </UModal>
  </AppSimplePage>
</template>
