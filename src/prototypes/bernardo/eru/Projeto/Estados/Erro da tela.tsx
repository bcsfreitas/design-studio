/** @studio-id d0z1g8ne66gpd2mk */
// The page itself failing to open (the route's error): eru's full-screen notice with the technical details.
import { RouteErrorPage } from '../../_components/projeto/RouteErrorPage';

export default function ErroDaTela() {
  return <RouteErrorPage detail={"TypeError: Cannot read properties of undefined (reading 'colunas')\n    at QuadroBoard (QuadroBoard.tsx:221:38)"} />;
}
