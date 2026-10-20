import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { createApp, h, shallowReactive, type Component } from 'vue';
import ui from '@nuxt/ui/vue-plugin';
import UApp from '@nuxt/ui/components/App.vue';
import { addCollection } from '@iconify/vue';
import lucide from '@iconify-json/lucide/icons.json';
import { refreshSheet, sheet } from './shadow-styles';

addCollection(lucide);

export type VueSlots = Partial<Record<string, ReactNode>>;

type Mount = {
  component: Component;
  props?: Record<string, unknown>;
  slots?: VueSlots;
  page: string;
  style: CSSProperties;
};

// Mounts a Vue component, inside Nuxt UI's UApp, in a shadow root styled like the Endless Studios frontend.
// React content for the component's slots renders through portals into the elements Vue gives each slot,
// so it sits inside the shadow root and takes the app's styles.
function VueRoot({ component, props, slots, page, style }: Mount) {
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
    const app = createApp({
      render: () => h(UApp, { portal }, () => h(component, { ...state.current }, slotTargets)),
    });
    app.use(ui);
    app.mount(root);
    return () => {
      app.unmount();
      shadow.replaceChildren();
      setTargets({});
    };
  }, [component, page, shape]);

  return (
    <div ref={host} style={style}>
      {names.map(name => (targets[name] ? createPortal(slots?.[name], targets[name], name) : null))}
    </div>
  );
}

export type VueScreenProps = {
  component: Component;
  props?: Record<string, unknown>;
};

// A whole screen on the app's page background.
export function VueScreen({ component, props }: VueScreenProps) {
  return (
    <VueRoot
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
export function VueInline({ component, props, slots, block = false }: VueInlineProps) {
  return (
    <VueRoot
      component={component}
      props={props}
      slots={slots}
      page={block ? 'font-sans antialiased' : 'inline-flex font-sans antialiased'}
      style={block ? { display: 'block', width: '100%' } : { display: 'inline-block', verticalAlign: 'middle' }}
    />
  );
}
