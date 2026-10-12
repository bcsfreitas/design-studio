# Studio system

Studio supplies Design Studio's application components, theme, and writing conventions. Prototype runtime code cannot import this application toolkit.

Read `AGENTS.md` and [writing context](context/writing.md) for Studio interface work. Components and their API pages live in `components/`; theme implementation lives in `styles/`.

Platform operating context and skills belong to the [platform](../../README.md). Design-system authoring procedures belong to the [Systems module](../../modules/systems/README.md). Studio currently has no specialized system skills.

`components.json` records this system’s upstream shadcn choices. It does not capture all authored theme or component adaptations. System folders are not independent CLI projects; follow the [Systems configuration contract](../../modules/systems/README.md#structure) for isolated generation.

## Platform brand assets

The navigation uses the unboxed mark in [Logo.tsx](../../app/shell/Logo.tsx). External placements use the square tiles below. Both tile variants share a 64-unit square, a 14-unit corner radius, and a centered mark occupying about 56% of the width. Preserve the complete square when resizing; do not crop to the mark.

| Placement | Asset | Size |
| --- | --- | --- |
| Light surface | `public/brand/design-studio-light.svg` and `.png` | SVG and 512 × 512 PNG |
| Dark surface | `public/brand/design-studio-dark.svg` and `.png` | SVG and 512 × 512 PNG |
| Browser tab | `public/favicon.svg` | Adapts its tile and mark to the browser color scheme |
| Browser fallback | `public/favicon.ico` | 16, 32, and 48 px |
| Apple touch icon | `public/apple-touch-icon.png` | 180 × 180 |
| Open Graph and Twitter card | `public/images/design-studio-social.png` | 1200 × 630 |
| Dark sharing placement | `public/images/design-studio-social-dark.png` | 1200 × 630 |
| Repository README | `public/images/design-studio-readme-share.jpg` | 1200 × 630 |

The editable sharing artwork is [social-card.html](assets/brand/social-card.html). Open it from the repository with dependencies installed. It uses the local Geist font and the public logo tiles. Render at 1200 × 630, wait for fonts and images, and export the light and dark PNGs using the respective browser color schemes. Export the light render as a compressed JPEG for the README. The default sharing image stays light because link previews do not select artwork by the viewer's theme.

When changing the mark, update the navigation paths and public tile SVGs together, then regenerate the raster icons and sharing images. See [Publishing](../../context/publishing.md#social-link-previews) for the metadata and public URL setup.
