import { SourceChanged, ClientError, callModule, callModuleMutation, type Manifest } from '#studio/data';
import { SYSTEM_SPECS } from '../data/systems';
import { contentParts } from '@/platform/core/roots';

function target(path: string) {
  const entry = Object.values(SYSTEM_SPECS).find(spec => path.startsWith(spec.dir));
  if (!entry) throw new ClientError('unavailable', 'This system source is unavailable.');
  return { systemId: entry.studioId, path: path.slice(entry.dir.length) };
}
export async function systemSourceRequest<T>(
  action: 'read' | 'write' | 'reveal',
  path: string,
  extra: object = {},
): Promise<T> {
  try {
    return await callModule<T>('systems', 'source', { ...target(path), action, ...extra });
  } catch (error) {
    if (error instanceof ClientError && error.status === 409) throw new SourceChanged(error.message);
    throw error;
  }
}
export function createSkill(content: string, name: string, description: string) {
  const { system } = contentParts(content);
  const spec = SYSTEM_SPECS[system];
  return callModuleMutation<{ path: string; manifest: Manifest }>('systems', 'skill', {
    ...(spec ? { systemId: spec.studioId } : { owner: system }),
    name,
    description,
  });
}
export function createComponentDocs(system: string, component: string) {
  return callModuleMutation<{ written: string[]; moved: string[]; manifest: Manifest }>('systems', 'component-docs', {
    systemId: SYSTEM_SPECS[system]?.studioId,
    component,
  });
}
