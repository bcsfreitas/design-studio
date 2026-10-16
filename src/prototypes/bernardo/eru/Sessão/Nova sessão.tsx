/** @studio-id arbc7t12xwnxnnjx */
// Placeholder: the Nova sessão screen is built next.
import AppShell, { PAGE_COLUMN } from '../_components/shell/AppShell';

export default function Placeholder() {
  return (
    <AppShell current="nova-sessao">
      <div className={PAGE_COLUMN}>
        <p className="rounded-lg border border-dashed border-h2 p-6 text-sm text-muted-foreground">Nova sessão: esta tela chega em seguida.</p>
      </div>
    </AppShell>
  );
}
