import type { MouseEvent } from 'react';
import UButton from '@nuxt/ui/components/Button.vue';
import { VueInline } from '../../libraries/vue';

export type ButtonColor = 'primary' | 'secondary' | 'kids' | 'info' | 'success' | 'warning' | 'error' | 'neutral';
export type ButtonVariant = 'solid' | 'outline' | 'soft' | 'subtle' | 'ghost' | 'link' | 'contrast' | 'gating';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export type ButtonProps = {
  /** The button's text. A plain string child does the same. */
  label?: string;
  children?: string;
  /** A semantic role from the theme. Defaults to primary. */
  color?: ButtonColor;
  /** Defaults to solid. `contrast` inherits the surrounding text colour; `gating` is for kids surfaces. */
  variant?: ButtonVariant;
  /** Defaults to md. */
  size?: ButtonSize;
  /** A Lucide icon name, such as `i-lucide-user-plus`, shown before the label. */
  icon?: string;
  leadingIcon?: string;
  trailingIcon?: string;
  /** Shows a spinner in place of the leading icon and disables the button. */
  loading?: boolean;
  disabled?: boolean;
  /** Fills the available width. */
  block?: boolean;
  /** Equal padding on every side, for icon-only buttons. */
  square?: boolean;
  /** Renders a link instead of a button. */
  to?: string;
  /** Required for icon-only buttons. */
  'aria-label'?: string;
  onClick?: (event: MouseEvent | Event) => void;
};

// The Endless Studios button: Nuxt UI's UButton with the frontend's app.config customization.
export function Button({ children, label, block, ...props }: ButtonProps) {
  return <VueInline component={UButton} props={{ ...props, block, label: label ?? children }} block={block} />;
}
