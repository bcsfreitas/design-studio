<template>
  <img :src="icon" alt="" />
</template>

<script setup lang="ts">
import { computed } from 'vue'

import feedbackIcon from '~/assets/images/Icons/notifications/feedback.svg'
import newMemberIcon from '~/assets/images/Icons/notifications/new-member.svg'
import newNewsIcon from '~/assets/images/Icons/notifications/new-news.svg'
import newProjectIcon from '~/assets/images/Icons/notifications/new-project.svg'
import newTaskIcon from '~/assets/images/Icons/notifications/new-task.svg'
import taskApprovedIcon from '~/assets/images/Icons/notifications/task-approved.svg'
import taskDueSoonIcon from '~/assets/images/Icons/notifications/task-due-soon.svg'

const ICONS: Record<string, string> = {
  newtask: newTaskIcon,
  newproject: newProjectIcon,
  newfeedbacktotaskupdate: feedbackIcon,
  taskapproved: taskApprovedIcon,
  userjoinedproject: newMemberIcon,
  taskdeadline: taskDueSoonIcon,
  projectnews: newNewsIcon,
  objectfeedcommentwasadded: newNewsIcon,
  new_object_feed_comment_mention_added: newNewsIcon,
}

const props = defineProps<{
  type: string
}>()

const icon = computed(() => ICONS[props.type] ?? newTaskIcon)
</script>
