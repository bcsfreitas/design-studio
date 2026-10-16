/** @studio-id rh275fbqg8k355s5 */
// State: the dashboard didn't answer. eru's RouteErrorPage takes the whole window, without the shell.
import { Button } from '@/systems/eru/components/button';
import { useNavigate } from '@module/prototypes';

export default function Erro() {
  const navigate = useNavigate();
  return (
    <main className="flex min-h-svh items-center justify-center bg-background p-6 text-foreground">
      <div className="flex max-w-sm flex-col items-center gap-3 text-center">
        <h1 className="font-heading text-xl font-semibold">Não foi possível falar com o dashboard do Hermes</h1>
        <p className="text-sm text-muted-foreground">Confira se ele está no ar e tente de novo.</p>
        <Button onClick={() => navigate('Início/Início')}>Tentar de novo</Button>
      </div>
    </main>
  );
}
