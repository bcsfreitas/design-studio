import type { SystemSpec } from '#studio/system';

// Eru, Bernardo's Hermes harness, with its Telperion skin. Components and theme are copied from the eru repository
// (web/src/components and web/src/index.css); see README.md for the source revision and how to refresh it.
export default {
  status: 'active',
  role: 'prototype',
  label: 'Eru',
  themeClass: 'eru-theme',
  styling: 'tailwind',
  colorModes: ['dark', 'light'],
  docs: 'warn',
  libraries: [
    {
      "kind": "source",
      "id": "tailwind",
      "label": "Tailwind CSS",
      "description": "Styling utilities and theme integration, supplied by Studio",
      "docs": "https://tailwindcss.com/docs"
    },
    {
      "kind": "source",
      "id": "shadcn",
      "label": "shadcn/ui and coss ui",
      "description": "Component source, as adapted in eru",
      "docs": "https://coss.com/ui"
    },
    {
      "kind": "package",
      "id": "base-ui",
      "label": "Base UI",
      "package": "@base-ui/react",
      "description": "Accessible component behavior",
      "docs": "https://base-ui.com/react/overview/quick-start"
    },
    {
      "kind": "package",
      "id": "lucide",
      "label": "Lucide",
      "package": "lucide-react",
      "description": "Icon catalog",
      "entry": "libraries/icons.ts",
      "docs": "https://lucide.dev/icons/",
      "assets": ["icons"]
    },
    {
      "kind": "package",
      "id": "motion",
      "label": "Motion",
      "package": "motion",
      "description": "Layout and presence animation",
      "entry": "libraries/motion.ts",
      "docs": "https://motion.dev/docs/react"
    },
    {
      "kind": "package",
      "id": "font-sans",
      "label": "Geist",
      "package": "@fontsource-variable/geist",
      "description": "Interface typeface",
      "docs": "https://fontsource.org/fonts/geist",
      "assets": ["fonts"]
    },
    {
      "kind": "package",
      "id": "font-mono",
      "label": "Geist Mono",
      "package": "@fontsource-variable/geist-mono",
      "description": "Times, paths and code",
      "docs": "https://fontsource.org/fonts/geist-mono",
      "assets": ["fonts"]
    },
    {
      "kind": "package",
      "id": "font-display",
      "label": "Cormorant Garamond",
      "package": "@fontsource-variable/cormorant-garamond",
      "description": "Display typeface for titles",
      "docs": "https://fontsource.org/fonts/cormorant-garamond",
      "assets": ["fonts"]
    },
    {
      "kind": "package",
      "id": "markdown",
      "label": "react-markdown",
      "package": "react-markdown",
      "description": "Markdown rendering for agent replies",
      "docs": "https://github.com/remarkjs/react-markdown",
      "components": ["markdown"]
    }
  ],
  origin: 'shadcn',
  studioId: "48mf8463fvtj4yg0",
} satisfies SystemSpec;
