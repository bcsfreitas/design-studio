---
title: Button
description: Starts an action. Nuxt UI's UButton with the Endless Studios customization, the same button the platform uses.
source: Nuxt UI 4.8 UButton with the frontend's app.config button settings (Endless-Game-Making-Studio/studio 11517cbee).
docs: https://ui.nuxt.com/docs/components/button
---

## When to use

Use a button for actions that change something or open a dialog. To go to another page, give it `to` so it renders as a link, or use a plain link in running text.

Buttons default to primary, solid and medium. Keep one primary button per view for the main action; the platform's surrounding actions are mostly neutral outline and neutral ghost buttons.

## Studios variants

- **Secondary ghost** uses the darker cornflower (`secondary-700`) for its text, for contrast.
- **Contrast** is transparent and inherits the surrounding text colour, for buttons on coloured or image backgrounds.
- **Kids gating** marks an action that needs a parent's consent: a neutral fill with toned text, a teal trailing icon and a teal focus outline.

## Accessibility

An icon-only button needs an `aria-label`. Anything clickable is a real button or link.

## In Vue screens

Screens written as `.vue` files use `<UButton>` directly, with the same props.
