import { jsonIdentityMetadata } from '#studio/files';

// Canvas owns its identity declaration; JSON storage uses the platform's generic adapter.
export const canvasIdentity = jsonIdentityMetadata;
