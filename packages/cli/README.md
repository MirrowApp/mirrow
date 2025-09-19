# Mirrow CLI

*Design-first tooling to turn Mirrow templates into living SVGs.*

The `mirrow` command pairs with the `@mirrowjs/core` compiler to translate `.mirrow` sources into SVG output or framework-friendly bundles. It fits into rapid explorations as easily as automated build steps.

## Installation

```bash
npm install --global mirrow
# or run ad-hoc
npx mirrow --version
```

## Basic Example

```bash
# Compile a single Mirrow file into SVG
mirrow --input icon.mirrow --output icon.svg

# Mirror a directory of Mirrow sources into a build folder
mirrow --input src/mirrow --output dist/icons --depth unbound

# Stay running and rebuild on change
mirrow -i src/mirrow -o dist/icons --depth 2 --watch
```

The CLI will emit logs like `compiled src/mirrow/logo.mirrow -> dist/icons/logo.svg` as it walks your input tree.

## CLI Flags

| Flag | Description |
| --- | --- |
| `-i, --input <path>` | File or directory that contains `.mirrow` sources. *(required)* |
| `-o, --output <path>` | Destination file or directory for compiled assets. *(required)* |
| `-d, --depth <n\|unbound>` | Recursion depth when traversing input folders. Defaults to `0` (no recursion). |
| `-w, --watch` | Keep the process alive and rebuild whenever inputs change. |

When the input is a directory, every `.mirrow` file is compiled to `.svg` and other assets are copied across one-to-one. For single file inputs, the CLI creates the output directory if needed and ensures the result ends in `.svg`.

## Integrating in Projects

Add a script to keep your Mirrow sources in sync:

```json
{
  "scripts": {
    "build:mirrow": "mirrow -i src/mirrow -o public/icons --depth 2"
  }
}
```

Pair it with your bundler, watch mode, or CI pipeline to keep animations fresh everywhere.

## Need Help?

Run `mirrow --help` for the latest usage details or open an issue in the main Mirrow repository to share feedback.
