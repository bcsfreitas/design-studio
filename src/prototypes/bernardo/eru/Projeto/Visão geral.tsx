/** @studio-id gec2bk6ng7q6hq7c */
// Placeholder: the Projeto screen is built next.
import AppShell, { PAGE_COLUMN } from '../_components/shell/AppShell';

export default function Placeholder() {
  return (
    <AppShell current="sessoes">
      <div className={PAGE_COLUMN}>
        <p className="rounded-lg border border-dashed border-h2 p-6 text-sm text-muted-foreground">Projeto: esta tela chega em seguida.</p>
      </div>
    </AppShell>
  );
}
