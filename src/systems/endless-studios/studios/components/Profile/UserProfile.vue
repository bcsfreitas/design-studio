<template>
  <section
    v-if="!loading"
    class="sticky small-profile flex flex-col w-full bg-white gap-y-4 rounded-2xl border-1 border-gray-200 overflow-hidden"
  >
    <div
      class="bg-center w-full profile-cover-image"
      :style="{
        backgroundImage: `url(${defaultImage})`,
        backgroundSize: 'center',
      }"
    >
      &nbsp;
    </div>

    <section class="image-container flex flex-col gap-y-2.5 items-center z-10">
      <img
        class="profile-image rounded-full cursor-pointer object-cover"
        :src="resolveProfilePic(imageUrl)"
        alt="User Image"
      />
      <section>
        <section class="gap-x-2 flex flex-row justify-center items-center">
          <p class="text-sm font-bold">
            {{ username }}
          </p>
          <div
            v-if="isMentor"
            class="flex mentor-tag items-center justify-center"
          >
            {{ $t('mentor') }}
          </div>
        </section>
        <p class="text-xs flex justify-center font-medium profile-about">
          {{ aboutMe }}
        </p>
      </section>
      <section>
        <NuxtLink
          v-if="isLoggedInUser"
          :to="`/profile/${$auth.user.username}/`"
          class="py-1.5 px-6 font-medium text-xs text-white bg-orange-primary rounded-lg no-underline"
        >
          {{ $t('edit_profile') }}
        </NuxtLink>
      </section>
    </section>

    <section class="flex flex-col gap-y-4 pb-8">
      <UserBadges :elements="interests" :title="$t('interests')" />
    </section>
  </section>
  <section
    v-else-if="loading"
    class="grid grid-cols-1 gap-x-5 gap-y-5 max-tablet:grid-cols-1"
  >
    <div class="profile__loading-state loading-animation"></div>
  </section>
</template>

<script setup>
import defaultImage from '~/assets/images/default-image.png'
</script>

<script>
import UserBadges from '~/components/Profile/UserBadges.vue'
export default {
  components: {
    UserBadges,
  },
  data() {
    return {
      loading: true,
      userId: this.$auth?.user?.id,
      userProfile: null,
    }
  },

  computed: {
    isLoggedInUser() {
      return this.userId === this.$auth.user.id
    },
    username() {
      return this.userProfile?.username || ''
    },
    aboutMe() {
      return this.userProfile?.metadata.about_me || ''
    },
    imageUrl() {
      return this.userProfile?.metadata.image_url
    },
    isMentor() {
      return this.userProfile?.isMentor || false
    },
    interests() {
      return this.userProfile?.metadata.interests || []
    },
  },

  mounted() {
    this.userProfile = this.$auth.user
    if (this.userProfile) {
      this.loading = false
    }
  },
}
</script>

<style scoped>
@reference "~/assets/css/main.css";
.profile-cover-image {
  height: 79px;
}

.profile-image {
  width: 90px;
  height: 90px;
}

.profile-about {
  color: #979797;
}

.mentor-tag {
  font-size: 9px;
  max-height: 16px;
  @apply py-2	px-1.5 font-semibold text-white bg-blue-sea rounded-md;
}

.profile__loading-state {
  width: auto;
  height: 358px;
  background: #f4f4fa;
  border: 1px solid #dcdce9;
  @apply rounded-lg;
}

.small-profile {
  top: 96px;
}

.image-container {
  margin-top: -65px;
}
</style>
