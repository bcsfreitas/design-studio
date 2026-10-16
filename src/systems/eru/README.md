# Eru

The look of eru, Bernardo's web harness for the Hermes agent: the Telperion skin, with Geist, Geist Mono and Cormorant Garamond, a warm paper light mode and a graphite dark mode.

## Source

Copied from the eru repository (`~/projects/eru`, GitHub `bcsfreitas/eru`) at commit `69ee2b8`:

- `components/` comes from `web/src/components` and `web/src/components/ui`, one folder per component. Imports of `@/lib/utils` use `cn` from `#studio/runtime`, and every Base UI portal renders in Studio's themed container (`usePortalContainer`).
- `lib/` and `hooks/` hold the helpers those components need (seals, hash, motion, segmented control, media query).
- `styles/theme.css` is generated from `web/src/index.css` and scoped to `.eru-theme`. Light is the base and dark overrides it, following Studio's colour mode.

The studio copy does not follow eru automatically. To refresh it, copy the components again and regenerate the theme.

## Differences from eru

- eru's `--muted` is secondary text. Here that colour is `--muted-foreground`, and `--muted` is the faint fill that `bg-muted` uses in eru.
- The functional safe-area utilities (`pt-safe-4` and similar) and `@property --effort` are not available: Studio themes cannot declare Tailwind utilities or registered properties. The plain `pt-safe`, `pb-safe`, `pl-safe` and `pr-safe` classes remain.
- The time-of-day colours that eru writes at run time (`lib/daylight`) are not applied. Prototypes show the fixed Noite and Tarde palettes.
