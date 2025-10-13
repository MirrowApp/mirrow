import path from "node:path";
import process from "node:process";

import { Command, InvalidArgumentError } from "commander";

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { runMirrow, watchMirrow } from "./runner.js";
import { fileURLToPath } from 'url';
import type { CliOptions } from "./runner.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const cliPkg = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf-8'));
const corePkg = JSON.parse(readFileSync(join(__dirname, '../../core/package.json'), 'utf-8'));

function parseDepth(raw: string): number | typeof Infinity {
  if (raw === "unbound") {
    return Infinity;
  }

  const value = Number.parseInt(raw, 10);
  if (!Number.isInteger(value) || value < 0) {
    throw new InvalidArgumentError(
      "Depth must be a non-negative integer or 'unbound'"
    );
  }
  return value;
}

export async function runCli(argv: string[]): Promise<void> {
  const program = new Command();

  program
    .name("mirrow")
    .description("Compile Mirrow templates into SVG output")
    .requiredOption("-i, --input <path>", "Path to the input file or directory")
    .requiredOption("-o, --output <path>", "Path to the output file or directory")
    .option(
      "-d, --depth <n|unbound>",
      "Recursion depth when walking directories (default: 0)",
      parseDepth,
      0
    )
    .version(`CLI: ${cliPkg.version}\nCore: ${corePkg.version}`)
    .option("-w, --watch", "Watch inputs and rebuild on change")
    .allowExcessArguments(false)
    .showHelpAfterError();

  program.action(async (options) => {
    const cliOptions: CliOptions = {
      input: path.resolve(process.cwd(), options.input),
      output: path.resolve(process.cwd(), options.output),
      depth: options.depth,
    };

    const isWatchEnabled = Boolean(options.watch);

    try {
      if (!isWatchEnabled) {
        await runMirrow(cliOptions);
        return;
      }

      const controller = new AbortController();
      const stopWatcher = () => {
        console.log("\nStopping watcher...");
        controller.abort();
      };

      process.once("SIGINT", stopWatcher);
      process.once("SIGTERM", stopWatcher);

      try {
        await watchMirrow(cliOptions, controller.signal);
      } finally {
        process.removeListener("SIGINT", stopWatcher);
        process.removeListener("SIGTERM", stopWatcher);
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error(error.message);
      } else {
        console.error(error);
      }
      process.exitCode = 1;
    }
  });

  await program.parseAsync(argv);
}
