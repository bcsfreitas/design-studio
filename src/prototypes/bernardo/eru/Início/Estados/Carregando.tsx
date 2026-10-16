/** @studio-id skeqz5t574xj9trg */
// State: the first load. The greeting is there, the summary is empty, the cards show eru's skeleton lines, the field waits
// for the profile's folder, and the astrolabe has no projects or week yet.
import { HomeScreen } from '../_home/HomeScreen';

export default function Carregando() {
  return <HomeScreen inProgress={[]} tasks={{ kind: 'carregando' }} recent={{ kind: 'carregando' }} projects={[]} folders={[]} folder={null} week={[]} schedules={false} />;
}
