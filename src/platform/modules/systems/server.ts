import { fileURLToPath } from 'node:url';
import type { ModuleServer } from '../../core/modules/index.ts';
import { createSystem } from './node/create-system.js';
import { systemRoute } from './node/routes.js';
import { systemAction } from '../../node/lib/system-actions.js';
const root = fileURLToPath(new URL('../../../../', import.meta.url));
const route =
  (name: string): ModuleServer[string] =>
  async ({ me, body }) => {
    try {
      return await systemRoute(root, name, me, body);
    } catch (error) {
      const status =
        error instanceof Error && 'status' in error && typeof error.status === 'number' ? error.status : 400;
      return { status, body: { error: error instanceof Error ? error.message : 'Could not access Systems.' } };
    }
  };
export default {
  source: route('source'),
  skill: route('skill'),
  'component-docs': route('component-docs'),
  action: async ({ me, body }) => {
    try {
      return { body: await systemAction(root, me, body) };
    } catch (error) {
      const status =
        error instanceof Error && 'status' in error && typeof error.status === 'number' ? error.status : 400;
      return { status, body: { error: error instanceof Error ? error.message : 'Could not update the system.' } };
    }
  },
  create: async ({ me, body }) => {
    try {
      return { body: await createSystem(root, me, body) };
    } catch (error) {
      const status =
        error instanceof Error && 'status' in error && typeof error.status === 'number' ? error.status : 400;
      return { status, body: { error: error instanceof Error ? error.message : 'Could not create the system.' } };
    }
  },
} satisfies ModuleServer;
