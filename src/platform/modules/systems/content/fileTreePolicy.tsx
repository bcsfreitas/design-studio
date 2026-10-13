import type { FileTreePolicy } from '#studio/ui';
import type { Prototype } from '@/platform/app/data/types';
import { canChangePrototype } from '@/platform/app/data/files';
import { artifactAvailability } from '@/platform/core/fileTypes';
import { FILE_TYPES, fileTypeModules } from '@/platform/app/data/fileTypes';
import { contentSection } from '@/platform/core/roots';
import { creatableIn, isSkillFile, isSkillFolder, opProblem } from './rules';
import { NEW_KINDS } from './pages/newKinds';
import NewSkillDialog from './pages/NewSkillDialog';
import { createSkill } from '../pages/systemSource';
const CreationDialog: NonNullable<FileTreePolicy['CreationDialog']> = ({ proto, open, onOpenChange, onCreated }) => (
  <NewSkillDialog
    open={open}
    onOpenChange={onOpenChange}
    onCreate={async (name, description) => onCreated(await createSkill(proto.id, name, description))}
  />
);
export function systemFileTreePolicy(proto: Prototype): FileTreePolicy {
  const section = contentSection(proto.id);
  return {
    scope: 'systemContent',
    noun: 'files',
    reorder: false,
    canChange: canChangePrototype,
    hideFolderControls: section === 'skills',
    fixed: node => isSkillFile(section, node.path),
    movable: node => !isSkillFolder(section, node.path, node.dir),
    canMoveTo: (source, folder) =>
      opProblem(section, { op: 'move', path: source.path, to: folder }, source.dir) === null,
    itemForNode: (node, items) => items.get(section === 'skills' && node.dir ? node.path + '/SKILL.md' : node.path),
    bundleItem: (node, items) =>
      isSkillFolder(section, node.path, node.dir) ? items.get(node.path + '/SKILL.md') : undefined,
    creationTarget: 'skill',
    CreationDialog,
    newOptions: (folder, { live, editable }) =>
      creatableIn(section, folder)
        .filter(
          kind =>
            kind !== 'document' ||
            artifactAvailability(FILE_TYPES.systems, {
              local: live,
              editable,
              present: false,
              renderer: Boolean(fileTypeModules.systems),
              scope: 'systemContent',
            }).create.available,
        )
        .map(kind => ({ target: kind === 'document' ? 'systems' : kind, ...NEW_KINDS[kind] })),
  };
}
