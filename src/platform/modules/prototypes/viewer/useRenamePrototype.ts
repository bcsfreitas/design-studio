import { renamePrototype } from '#studio/data';
import type { PrototypeInfo } from '@/platform/app/data/types';

// Renaming changes the title and source folder. Identity and public URL remain stable.
// Throws the server's message.
export function useRenamePrototype(proto: PrototypeInfo) {
  return async (change: { title: string }) => {
    await renamePrototype(proto, change);
  };
}
