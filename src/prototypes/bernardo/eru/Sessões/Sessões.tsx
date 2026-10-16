/** @studio-id bk6qc9ss4qfqn20h */
// Placeholder: the Sessões screen is built next.
import AppShell, { PAGE_COLUMN } from '../_components/shell/AppShell';

export default function Placeholder() {
  return (
    <AppShell current="sessoes">
      <div className={PAGE_COLUMN}>
        <p className="rounded-lg border border-dashed border-h2 p-6 text-sm text-muted-foreground">Sessões: esta tela chega em seguida.</p>
      </div>
    </AppShell>
  );
}
