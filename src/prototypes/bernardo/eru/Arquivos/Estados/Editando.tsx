/** @studio-id 7ssefexpw70p07wt */
// State: README.md open in the editor.
import { FilesScreen } from '../../_components/files/FilesScreen';
import { README } from '../../_components/data/files';

export default function Editando() {
  return <FilesScreen initialPath={README} editing />;
}
