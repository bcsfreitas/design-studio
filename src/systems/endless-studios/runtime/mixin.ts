// The helpers the app's global mixin (plugins/mixin.js) gives every component, for those copied components call.
import profilePic from '../studios/assets/images/profile-pic.svg';

export const mixin = {
  resolveProfilePic: (image?: string | null) => image || profilePic,
};
