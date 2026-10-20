import type { ReactNode } from 'react';
import UCard from '@nuxt/ui/components/Card.vue';
import { VueInline } from '../../libraries/vue';

export type CardVariant = 'outline' | 'bordered' | 'soft' | 'subtle' | 'solid' | 'flat' | 'ghost';

export type CardProps = {
  /** Header title, shown when there is no `header` content. */
  title?: string;
  /** Header line under the title. */
  description?: string;
  /** Defaults to outline: a white card with the soft wide shadow and no border. */
  variant?: CardVariant;
  /** Replaces the title and description. */
  header?: ReactNode;
  /** The card's body. */
  children?: ReactNode;
  footer?: ReactNode;
  /** Classes for the card's root, in the app's Tailwind vocabulary. */
  className?: string;
  /** Classes for each part, as Nuxt UI's `ui` prop: root, header, title, description, body, footer. */
  ui?: Partial<Record<'root' | 'header' | 'title' | 'description' | 'body' | 'footer', string>>;
  /** The root element. Defaults to div. */
  as?: string;
};

// The Endless Studios card: Nuxt UI's UCard with the frontend's app.config card variants.
export function Card({ header, children, footer, className, ...props }: CardProps) {
  return (
    <VueInline
      component={UCard}
      props={{ ...props, class: className }}
      slots={{ header, default: children, footer }}
      block
    />
  );
}
