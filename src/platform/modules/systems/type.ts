import { defineFileType, markdownFileType } from '#studio/files';

// The system content keeps Markdown support when prototype Documents is disabled or removed.
export default defineFileType({ ...markdownFileType, inPrototype: false, inSystemContent: true });
