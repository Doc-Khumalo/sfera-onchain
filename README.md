# Sfera Onchain

The company homepage. Astro with React components, built to static HTML.

## Why this stack

Astro renders React components to HTML **at build time** and ships no JavaScript
unless a component is explicitly given a `client:*` directive. The homepage has
none, so `dist/index.html` contains the real content and the page cannot render
blank — which matters for a URL going onto a funding application.

## Layout

```
src/
  components/Hero.jsx      the homepage, a React component
  layouts/Base.astro       html shell, meta tags, fonts
  pages/index.astro        the route
  styles/global.css        design tokens
  styles/home.css          homepage styles
public/
  how-it-works.html        the nine-step scroll deck, served as-is
  robots.txt  _headers
```

`public/` is copied to the output untouched. The deck is a standalone file with
its own inline CSS and JavaScript and is not part of the Astro build.

## Working on it

```
npm install
npm run dev      # http://localhost:4321, live reload
npm run build    # writes dist/
npm run preview  # serve dist/ exactly as Cloudflare will
```

## Design tokens

Both pages share one palette, defined in `src/styles/global.css`.

| Token | Value | Role |
|---|---|---|
| `--void` | `#05070A` | page ground |
| `--line` | `#16202B` | hairlines, the background grid |
| `--ice` | `#F2F6F9` | primary text |
| `--mist` | `#7D93A4` | secondary text |
| `--slate` | `#48606F` | labels |
| `--ok` | `#2FE0BC` | bounded, corrected, safe |
| `--bad` | `#FF5F4E` | unbounded, over-wide |

Type is Archivo for display and JetBrains Mono for labels and data, both from
Google Fonts.

## Rules the design keeps

1. **All copy is lifted from the deck.** Nothing on this site was invented. If a
   state has no text, ask, do not write a placeholder.
2. The homepage is **one screen and does not scroll** on a phone or a laptop.
3. `--ok` means bounded and corrected. `--bad` means unbounded. The two are never
   used decoratively.
4. No cards, no shells, no rounded boxes. The pill button is the one exception.

## Testing the phone layout

Do not resize a desktop window. A desktop window at 393px wide is not a phone,
because a phone is short before it is narrow. Use a real device, or a preview
deployment opened on one.
