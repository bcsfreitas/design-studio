import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { h, shallowReactive, type Component } from 'vue';
import { refreshSheet, sheet } from './shadow-styles';
import { createStudiosApp, type StudiosRuntimeOptions } from './vue-app';

export type { StudiosRuntimeOptions, StudiosSample, UserOption } from './vue-app';

export type VueSlots = Partial<Record<string, ReactNode>>;

type Mount = StudiosRuntimeOptions & {
  component: Component;
  props?: Record<string, unknown>;
  slots?: VueSlots;
  page: string;
  style: CSSProperties;
};

// Mounts a Vue component, through createStudiosApp, in a shadow root styled like the Endless Studios frontend.
// React content for the component's slots renders through portals into the elements Vue gives each slot,
// so it sits inside the shadow root and takes the app's styles.
function VueRoot({ component, props, slots, page, style, locale, user, sample, shell }: Mount) {
  const host = useRef<HTMLDivElement>(null);
  const state = useRef(shallowReactive<Record<string, unknown>>({ ...props }));
  const [targets, setTargets] = useState<Record<string, Element>>({});
  const names = Object.keys(slots ?? {})
    .filter(name => slots?.[name] != null && slots[name] !== false)
    .sort();
  const shape = names.join(',');

  useEffect(() => {
    if (props) Object.assign(state.current, props);
  }, [props]);

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    const shadow = element.shadowRoot ?? element.attachShadow({ mode: 'open' });
    refreshSheet();
    shadow.adoptedStyleSheets = [sheet];
    const root = document.createElement('div');
    root.className = page;
    const portal = document.createElement('div');
    portal.className = 'text-default font-sans antialiased';
    shadow.replaceChildren(root, portal);
    const slotTargets = Object.fromEntries(
      (shape ? shape.split(',') : []).map(name => [
        name,
        () =>
          h('div', {
            'data-react-slot': name,
            style: 'display: contents',
            ref: (el: unknown) => {
              if (el instanceof Element) setTargets(current => (current[name] === el ? current : { ...current, [name]: el }));
            },
          }),
      ]),
    );
    const app = createStudiosApp({ component, props: state.current, slots: slotTargets, portal, locale, user, sample, shell });
    app.mount(root);
    return () => {
      app.unmount();
      shadow.replaceChildren();
      setTargets({});
    };
  }, [component, page, shape, locale, user, sample, shell]);

  return (
    <div ref={host} style={style}>
      {names.map(name => (targets[name] ? createPortal(slots?.[name], targets[name], name) : null))}
    </div>
  );
}

// `locale`, `user` and `sample` set what the stand-ins answer (see vue-app.ts): English, the sample learner and
// empty data by default; `shell` wraps a screen in the app's sidebar, top bar and footer. The app is recreated when
// one of them changes identity, so define samples outside the view.
export type VueScreenProps = StudiosRuntimeOptions & {
  component: Component;
  props?: Record<string, unknown>;
};

// A whole screen on the app's page background.
export function VueScreen({ component, props, ...runtime }: VueScreenProps) {
  return (
    <VueRoot
      {...runtime}
      component={component}
      props={props}
      page='studios-body isolate min-h-screen bg-muted text-default font-sans antialiased'
      style={{ display: 'block', minHeight: '100%' }}
    />
  );
}

export type VueInlineProps = VueScreenProps & {
  slots?: VueSlots;
  block?: boolean;
};

// One component placed in a React layout, such as a single button. It inherits the surrounding text colour.
export function VueInline({ component, props, slots, block = false, ...runtime }: VueInlineProps) {
  return (
    <VueRoot
      {...runtime}
      component={component}
      props={props}
      slots={slots}
      page={block ? 'font-sans antialiased' : 'inline-flex font-sans antialiased'}
      style={block ? { display: 'block', width: '100%' } : { display: 'inline-block', verticalAlign: 'middle' }}
    />
  );
}
