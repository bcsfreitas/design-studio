/** @studio-id 09ewchqenhpj77gy */
// State: the whole screen when a route fails for a reason other than the dashboard, with the technical details folded.
import { RouteErrorPage } from '../../_components/states/RouteErrorPage';

export default function ErroNestaTela() {
  return <RouteErrorPage detail="TypeError: Cannot read properties of undefined (reading 'provider')" />;
}
