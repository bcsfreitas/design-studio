/** @studio-id fy5d0g37pa99txzz */
// State: a folder the dashboard could not open.
import { FilesScreen } from '../../_components/files/FilesScreen';
import { ERU_FOLDER } from '../../_components/data/files';

export default function Erro() {
  return <FilesScreen initialPath={ERU_FOLDER} state="error" />;
}
