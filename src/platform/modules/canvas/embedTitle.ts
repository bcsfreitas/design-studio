// The title in an embed's header. An embed of one of a view's named states says which state it shows, after its
// view's title, so the states of one view side by side read apart: "Home · Member".
export const embedTitle = (viewTitle: string, state?: { title: string }) =>
  state ? `${viewTitle} · ${state.title}` : viewTitle;
