// Navigation stand-ins: links and router calls stay inside the prototype and are logged instead of leaving the screen.
import { defineComponent, h, type PropType } from 'vue';

type Target = string | { path?: string; name?: string; query?: Record<string, unknown> };

export function navigateTo(to: Target) {
  console.info('[Endless Studios] navigate to', to);
}

export function useRouter() {
  return { push: navigateTo, replace: navigateTo, back() {}, go() {}, currentRoute: { value: useRoute() } };
}

export function useRoute() {
  return { path: '/', fullPath: '/', params: {}, query: {}, hash: '', name: undefined, meta: {} };
}

const href = (to: Target | undefined) => (typeof to === 'string' ? to : (to?.path ?? '#'));

// <NuxtLink>: an ordinary anchor whose click is logged.
export const NuxtLink = defineComponent({
  name: 'NuxtLink',
  props: {
    to: { type: [String, Object] as PropType<Target>, default: undefined },
    href: { type: [String, Object] as PropType<Target>, default: undefined },
    target: { type: String, default: undefined },
  },
  setup(props, { slots }) {
    return () => {
      const to = props.to ?? props.href;
      return h(
        'a',
        {
          href: href(to),
          target: props.target,
          onClick: (event: Event) => {
            event.preventDefault();
            if (to) navigateTo(to);
          },
        },
        slots.default?.(),
      );
    };
  },
});
