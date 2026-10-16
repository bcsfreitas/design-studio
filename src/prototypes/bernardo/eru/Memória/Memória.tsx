/** @studio-id fr8r8vyvb9e3f60v */
// Placeholder: the Memória screen is built next.
import AppShell, { PAGE_COLUMN } from '../_components/shell/AppShell';

export default function Placeholder() {
  return (
    <AppShell current="memoria">
      <div className={PAGE_COLUMN}>
        <p className="rounded-lg border border-dashed border-h2 p-6 text-sm text-muted-foreground">Memória: esta tela chega em seguida.</p>
      </div>
    </AppShell>
  );
}
