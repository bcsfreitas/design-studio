/** @studio-id 0zdrbj8d6whg9ce6 */
// State: a path the dashboard is not allowed to read.
import { FilesScreen } from '../../_components/files/FilesScreen';

export default function SemPermissao() {
  return <FilesScreen initialPath="/root" state="forbidden" />;
}
