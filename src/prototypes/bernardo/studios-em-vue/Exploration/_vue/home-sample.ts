import type { StudiosSample, UserOption } from '@/systems/endless-studios/libraries/vue';

// Ana, a signed-in learner. UserProfile reads her about text and interests from the user's metadata.
export const ana: UserOption = {
  id: 101,
  username: 'ana.souza',
  first_name: 'Ana',
  last_name: 'Souza',
  email: 'ana.souza@example.org',
  roles: [{ id: 2, name: 'Member' }],
  age_category: 'adult',
  is_restricted_partner_account: false,
  metadata: {
    image_url: null,
    about_me: 'Pixel artist in training. Loves cozy games.',
    interests: [
      { id: 1, name: 'Pixel art' },
      { id: 2, name: 'Level design' },
      { id: 3, name: 'Narrative' },
      { id: 4, name: 'Godot' },
    ],
  },
};

const notifications = { getUnreadNotificationsCount: { unread_notifications_count: 3 } };

const upcomingEvents = {
  upcomingEventInstances: [
    { id: 1, title: 'Threadbare community jam', start: '2026-11-03T19:00:00Z', event: { id: 11 } },
    { id: 2, title: 'Office hours: level design', start: '2026-11-06T21:30:00Z', event: { id: 12 } },
  ],
};

// The page's HOME_PAGE_PROGRAMS query: the programs Ana joined through a cohort. No image_url, so the tiles show
// the app's default cover.
const programs = [
  {
    id: 1,
    name: 'Game Design Foundations',
    short_description: 'Prototype three small games and learn how play is shaped by rules.',
    image_url: null,
    program_kind_id: 'regular',
    program_status_id: 'inprogress',
    tasks_count: 12,
    my_cohorts: [{ id: 21, name: 'Spring 2027' }],
  },
  {
    id: 2,
    name: 'Pixel Art for Games',
    short_description: 'From a single sprite to a full tileset for your first level.',
    image_url: null,
    program_kind_id: 'regular',
    program_status_id: 'notstarted',
    tasks_count: 8,
    my_cohorts: [{ id: 22, name: 'Evening group' }],
  },
];

export const memberSample: StudiosSample = {
  queries: {
    HOME_PAGE_PROGRAMS: { me: { cohort_programs: programs } },
    UpcomingEventInstances: upcomingEvents,
    NOTIFICATIONS_COUNT: notifications,
  },
};

// No programs yet: the onboarding card takes the Current Programs section's place.
export const newUserSample: StudiosSample = {
  queries: {
    HOME_PAGE_PROGRAMS: { me: { cohort_programs: [] } },
    UpcomingEventInstances: upcomingEvents,
    NOTIFICATIONS_COUNT: notifications,
  },
};
