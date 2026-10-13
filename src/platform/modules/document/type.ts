import { defineFileType, markdownFileType } from '#studio/files';

// Markdown within a prototype is an optional capability.
export default defineFileType({ ...markdownFileType });
