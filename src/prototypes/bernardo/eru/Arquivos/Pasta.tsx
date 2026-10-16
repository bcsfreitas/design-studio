/** @studio-id vyn501apdna2j9et */
// A folder inside the files area: ~/projects/eru, with its own bar and the way back to Arquivos.
import { FilesScreen } from '../_components/files/FilesScreen';
import { ERU_FOLDER } from '../_components/data/files';

export default function Pasta() {
  return <FilesScreen initialPath={ERU_FOLDER} />;
}
