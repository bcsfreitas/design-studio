// The parts of copied app modules that copied components use, for modules that import packages this system doesn't
// declare (`graphql-request`, `vue-router` types). Studio's dependency check reads .ts and .js files without the
// build's aliases, so these modules can't be copied as they are. Values match the app at 11517cbee.
import { gql } from './graphql-request';

// utils/dashboardRoute.ts
export const DASHBOARD_PATH = '/leader/dashboard/';

// graphql_schemas/notifications.js
export const SET_NOTIFICATION_SEEN = gql`
  mutation SET_NOTIFICATION_SEEN($input: UserNotificationIdSeenInput) {
    setUserNotificationSeen(input: $input)
  }
`;
