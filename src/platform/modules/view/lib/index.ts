// What a new view exports until something is built in it: `export default emptyView`. The platform
// recognizes it and shows its own "This view is empty" page, with a prompt to hand your agent
// (src/platform/modules/view/EmptyView.tsx), so the view doesn't have to draw one.
// Both creation paths use the View file type's template. This entry has no renderer or shell dependencies.
//
// Agents: when you build the view, replace `export default emptyView` with the component you write, and
// remove the import. Nothing else needs to change.
/** @experimental A new view's default export until its component is implemented. */
export const emptyView = () => null;

/**
 * @experimental One named state of a view: `export const states: ViewState<Props>[] = [{ title, props }]`. Each
 * renders the default export with its props and has a permanent link, declared as /** @studio-state <id> <title> *\/.
 */
export type ViewState<Props = Record<string, unknown>> = { title: string; props: Props };
