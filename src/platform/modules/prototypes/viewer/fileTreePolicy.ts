import type { FileTreePolicy } from '#studio/ui';
import { FolderAddIcon } from '@hugeicons/core-free-icons';
import { canChangePrototype } from '@/platform/app/data/files';
import { artifactAvailability } from '@/platform/core/fileTypes';
import { creatableTypes, FILE_TYPES, fileTypeModules } from '@/platform/app/data/fileTypes';
export const prototypeFileTreePolicy: FileTreePolicy = {
  scope: 'prototype',
  noun: 'artifacts',
  reorder: true,
  canChange: canChangePrototype,
  newOptions: (_folder, { editable }) => [
    ...creatableTypes
      .filter(
        type =>
          artifactAvailability(FILE_TYPES[type.id], {
            local: import.meta.env.DEV,
            editable,
            present: false,
            renderer: Boolean(fileTypeModules[type.id]),
            scope: 'prototype',
          }).create.available,
      )
      .map(type => ({ target: type.id, label: `New ${type.label.toLowerCase()}`, icon: type.icon })),
    { target: 'folder', label: 'New folder', icon: FolderAddIcon },
  ],
};
