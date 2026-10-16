/** @studio-id 42cne0v04z7m5j1v */
// Placeholder: the Perfis screen is built next.
import AppShell, { PAGE_COLUMN } from '../_components/shell/AppShell';

export default function Placeholder() {
  return (
    <AppShell current="perfis">
      <div className={PAGE_COLUMN}>
        <p className="rounded-lg border border-dashed border-h2 p-6 text-sm text-muted-foreground">Perfis: esta tela chega em seguida.</p>
      </div>
    </AppShell>
  );
}
