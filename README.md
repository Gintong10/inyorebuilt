# Inyo — local site clone

Local copy of [joininyo.com](https://www.joininyo.com/) for visual editing.

The live site is built in **Framer**. Framer does not publish editable React/Framer source, so this repo includes:

1. **`original/`** — frozen baseline of the published site (do not edit; use for compare/contrast)
2. **`exact/`** — the published Framer output (pixel-faithful, including animations)
3. **`editable/`** — a clean React + Vite rebuild you can actually change
4. **`assets/`** — downloaded images and videos from the live site

## Run the original (frozen) snapshot

```bash
npm run original
```

Open http://localhost:5175

## Run the exact Framer clone

```bash
npm run exact
```

Open http://localhost:5173

## Run the editable React rebuild

```bash
npm run editable
```

Open http://localhost:5174

## Where to edit

| Goal | Edit here |
| --- | --- |
| Colors, type, layout | `editable/src/App.css`, `editable/src/index.css` |
| Copy / sections | `editable/src/App.jsx` |
| Images / video | `editable/public/assets/` or `assets/` |
| Pixel-perfect reference | `exact/index.html` (Framer SSR; hard to edit) |
| Untouched baseline for diffs | `original/` (frozen; do not edit) |

## Notes

- The exact clone still loads Framer JS/fonts from Framer’s CDN so behavior matches production.
- Legal pages are at `exact/legal/privacy-policy/` and `exact/legal/terms-conditions/`.
