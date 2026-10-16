/** @studio-id x6nwmc6ddwkxjh0e */
// Placeholder: the Sessão screen is built next.
import AppShell, { PAGE_COLUMN } from '../_components/shell/AppShell';

export default function Placeholder() {
  return (
    <AppShell current="sessoes">
      <div className={PAGE_COLUMN}>
        <p className="rounded-lg border border-dashed border-h2 p-6 text-sm text-muted-foreground">Sessão: esta tela chega em seguida.</p>
      </div>
    </AppShell>
  );
}
