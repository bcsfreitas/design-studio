/** @studio-id ea98ryn73y336zkb */
// State: a folder while its listing loads.
import { FilesScreen } from '../../_components/files/FilesScreen';
import { ERU_FOLDER } from '../../_components/data/files';

export default function Carregando() {
  return <FilesScreen initialPath={ERU_FOLDER} state="loading" />;
}
