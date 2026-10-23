/** @studio-id ycg5fhq8eegp0e52 */
/** @studio-state hsc85ss9acaq06hn Membro com programas */
/** @studio-state r8sfdww656jfe1nj Usuário novo (sem programas) */
import type { ViewState } from '@module/view';
import { VueScreen, type StudiosSample } from '@/systems/endless-studios/libraries/vue';
import Home from './_vue/Home.vue';
import { ana, memberSample, newUserSample } from './_vue/home-sample';

type HomeProps = { sample?: StudiosSample };

// The same signed-in learner inside the app shell, with and without programs. With none, the onboarding card
// replaces Current Programs.
export const states: ViewState<HomeProps>[] = [
  { title: 'Membro com programas', props: { sample: memberSample } },
  { title: 'Usuário novo (sem programas)', props: { sample: newUserSample } },
];

// A learner enrolled in two programs, unless a state says otherwise.
export default function HomeView({ sample = memberSample }: HomeProps) {
  return <VueScreen component={Home} shell user={ana} sample={sample} />;
}
