/** @studio-id aq1ag6jbsv36hb7c */
// State: a new profile. Nothing in progress (the card hides), nothing due in Todoist, no other session, no projects around
// the astrolabe, and the field starts in the profile's default folder.
import { DEFAULT_FOLDER } from '../../_components/data/inicio';
import { HomeScreen } from '../_home/HomeScreen';

export default function Vazio() {
  return <HomeScreen inProgress={[]} tasks={{ kind: 'pronto', tasks: [] }} recent={{ kind: 'pronto', sessions: [] }} projects={[]} folders={[DEFAULT_FOLDER]} folder={DEFAULT_FOLDER.path} week={[]} schedules={false} />;
}
