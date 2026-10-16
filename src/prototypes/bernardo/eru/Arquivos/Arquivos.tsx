/** @studio-id 7dvqc2pjpavfr2e5 */
// Placeholder: the Arquivos screen is built next.
import AppShell, { PAGE_COLUMN } from '../_components/shell/AppShell';

export default function Placeholder() {
  return (
    <AppShell current="arquivos">
      <div className={PAGE_COLUMN}>
        <p className="rounded-lg border border-dashed border-h2 p-6 text-sm text-muted-foreground">Arquivos: esta tela chega em seguida.</p>
      </div>
    </AppShell>
  );
}
