import path from "node:path";
import process from "node:process";

import { Command, InvalidArgumentError } from "commander";

import { runMirrow } from "./runner.js";
import type { CliOptions } from "./runner.js";

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
    .allowExcessArguments(false)
    .showHelpAfterError();

  program.action(async (options) => {
    const cliOptions: CliOptions = {
      input: path.resolve(process.cwd(), options.input),
      output: path.resolve(process.cwd(), options.output),
      depth: options.depth,
    };

    try {
      await runMirrow(cliOptions);
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
