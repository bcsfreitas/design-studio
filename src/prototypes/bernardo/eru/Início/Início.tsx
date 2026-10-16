/** @studio-id admdda2addm0cted */
// Placeholder: the Início screen is built next.
import AppShell, { PAGE_COLUMN } from '../_components/shell/AppShell';

export default function Placeholder() {
  return (
    <AppShell current="inicio">
      <div className={PAGE_COLUMN}>
        <p className="rounded-lg border border-dashed border-h2 p-6 text-sm text-muted-foreground">Início: esta tela chega em seguida.</p>
      </div>
    </AppShell>
  );
}
