/** @studio-id r5ar1g6n9s59qjhv */
// State: an empty folder.
import { FilesScreen } from '../../_components/files/FilesScreen';
import { HOME } from '../../_components/data/files';

export default function PastaVazia() {
  return <FilesScreen initialPath={`${HOME}/Documents`} />;
}
