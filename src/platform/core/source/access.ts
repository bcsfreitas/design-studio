import { ClientError } from '../client-error.ts';
export class SourceChanged extends ClientError {
  constructor(message = 'This source changed on disk. Read it again before saving.') {
    super('source_changed', message, 409);
    this.name = 'SourceChanged';
  }
}

// Each caller supplies file access and permissions; the editor owns the interaction.
export type SourceAccess = {
  path: string;
  editable: boolean;
  read: () => Promise<{ content: string; version: string }>;
  write: (content: string, base: string) => Promise<{ version: string; warnings?: string[] }>;
};
