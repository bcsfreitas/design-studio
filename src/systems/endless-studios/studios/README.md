# Endless Studios frontend sources

Copied unchanged from `Endless-Game-Making-Studio/studio` at `11517cbee`, under `frontend/app/`, keeping that folder layout so `~/` imports resolve here.

Adapted: `assets/css/base.css` targets `:host` for `html` and `.studios-body` (VueScreen's page) for `body`, so components placed alone in a React layout don't get the page's colour and background; `main.css` targets `:root, :host` for `:root`, drops the floating-vue stylesheet, scans only this system and the prototypes, and names the Fontsource variable fonts.
