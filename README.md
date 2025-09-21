<p align="center">
  <img src="https://cdn.statically.io/gh/MirrowApp/mirrow-app/main/public/favicon.svg" alt="Mirrow logo" width="120" />
</p>

<h1 align="center">Mirrow</h1>

<p align="center"><em>A design-first language for living SVGs.</em></p>

---
[![npm version](https://img.shields.io/npm/v/mirrow.svg)](https://www.npmjs.com/package/mirrow)
![CI](https://github.com/MirrowApp/mirrow/actions/workflows/ci.yml/badge.svg)

Mirrow is a playground and production tooling for vector animators working with integrating motion, and interaction seemlessly into their workflow. Instead of treating SVGs as static assets, Mirrow gives them the starring role in your workflow. Describe shapes, styling, animation, and even interaction logic in one expressive format that compiles seamlessly.

> 🚧 Mirrow is in active exploration. Expect rapid iteration.

## Why Mirrow feels different ✨

- SVGs are treated as first-class citizens rather than static assets.
- A familiar, designer-friendly syntax.
- Animation, state, and styling live together.
- Output slots into your applications for a seemless adoption.

## How it flows 🌀

1. Sketch intent with Mirrow's domain-specific language.
2. Let the compiler translate it into production-ready components.
3. Drop the results into your production UI.

Whether it’s a logo that shifts on hover or a quick motion prototype, Mirrow keeps you focused on creating, not wiring up glue code.

## Getting started 🚀

```bash
# Compile a Mirrow file to SVG without installing anything locally
npx mirrow -i icon.mirrow -o icon.svg

# Mirror an entire directory of Mirrow sources into a build output
npx mirrow -i src/mirrow -o dist/icons --depth unbound
```

The CLI reads the Mirrow source at `icon.mirrow` and writes the compiled SVG to
`icon.svg`. Point the `-o` flag at your framework adapter (React, Svelte, etc.)
to generate components instead of raw SVG. When a directory is supplied via
`-i`, Mirrow preserves the directory structure, compiling every `.mirrow` file
to `.svg` and copying any other assets alongside them. Control how deep the
recursion goes with `--depth` (use `unbound` to traverse every nested folder).

The project is organized as a monorepo:

- `@mirrowjs/core` – the Mirrow compiler, parser, and language experiments.
- `@mirrow/cli` – a lightweight CLI that will grow alongside the language.

## Shaping the roadmap 🗺️

Mirrow is an idea in motion. Upcoming explorations include:

- Richer language primitives for path data and various other SVG integrations.
- Tooling that plays well with design systems and collaborative workflows.
- Framework adapters so Mirrow fits any modern frontend stack.

If you have a feature request or feedback from using Mirrow, feel free to open an issue and share your thoughts 💡
