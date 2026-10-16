// The main action of a page, at the end of the page bar, as eru draws it on a wide screen: a small button with icon and label.
import type { ComponentProps } from 'react';
import { Button } from '@/systems/eru/components/button';
import type { LucideIcon } from '@/systems/eru/libraries/icons';

export function PageBarAction({ icon: Icon, label, ...props }: Omit<ComponentProps<typeof Button>, 'children'> & { icon: LucideIcon; label: string }) {
  return (
    <Button size="sm" {...props}>
      <Icon aria-hidden />
      {label}
    </Button>
  );
}
