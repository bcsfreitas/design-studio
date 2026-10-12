import { createContext, useContext } from 'react';

// The element a prototype system's overlays (dialogs, popovers) portal into, so they stay
// inside the system's theme and the prototype frame. Pass it as a Base UI Portal's container:
//   <DialogPrimitive.Portal container={usePortalContainer()} />
export const PortalContext = createContext<HTMLElement | null>(null);
export const usePortalContainer = () => useContext(PortalContext);
