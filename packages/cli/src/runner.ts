import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

import { compile } from "@mirrow/core";

export interface CliOptions {
  input: string;
  output: string;
  depth: number | typeof Infinity;
}

const MIRROW_EXTENSION = ".mirrow";

type ActionKind = "compiled" | "copied";

function assertMirrowFile(filePath: string): void {
  if (path.extname(filePath) !== MIRROW_EXTENSION) {
    throw new Error(`Mirrow sources must use the ${MIRROW_EXTENSION} extension`);
  }
}

async function compileMirrowFile(inputFile: string, outputFile: string): Promise<void> {
  assertMirrowFile(inputFile);
  const source = await fs.readFile(inputFile, "utf8");
  const compiled = compile(source);
  await fs.mkdir(path.dirname(outputFile), { recursive: true });
  await fs.writeFile(outputFile, compiled, "utf8");
  logAction("compiled", inputFile, outputFile);
}

async function copyAsset(inputFile: string, outputFile: string): Promise<void> {
  await fs.mkdir(path.dirname(outputFile), { recursive: true });
  await fs.copyFile(inputFile, outputFile);
  logAction("copied", inputFile, outputFile);
}

function logAction(kind: ActionKind, inputPath: string, outputPath: string): void {
  const from = formatPath(inputPath);
  const to = formatPath(outputPath);
  console.log(`${kind.padEnd(8)} ${from} -> ${to}`);
}

function toSvgPath(outputDir: string, fileName: string): string {
  const base = fileName.replace(/\.[^/.]+$/, "");
  return path.join(outputDir, `${base}.svg`);
}

function formatPath(target: string): string {
  const relative = path.relative(process.cwd(), target);

  if (relative === "") {
    return ".";
  }

  if (relative && !relative.startsWith("..") && !path.isAbsolute(relative)) {
    return relative;
  }

  const absolute = path.resolve(target);
  const home = os.homedir();
  const homeWithSep = home.endsWith(path.sep) ? home : `${home}${path.sep}`;

  if (absolute === home) {
    return "~";
  }

  if (absolute.startsWith(homeWithSep)) {
    const homeRelative = path.relative(home, absolute);
    return homeRelative ? `~${path.sep}${homeRelative}` : "~";
  }

  return absolute;
}

async function processDirectory(
  inputDir: string,
  outputDir: string,
  depth: number | typeof Infinity
): Promise<void> {
  await fs.mkdir(outputDir, { recursive: true });
  const entries = await fs.readdir(inputDir, { withFileTypes: true });

  for (const entry of entries) {
    const inputPath = path.join(inputDir, entry.name);
    const outputPath = path.join(outputDir, entry.name);

    if (entry.isDirectory()) {
      if (depth === 0) {
        continue;
      }
      const nextDepth = depth === Infinity ? Infinity : depth - 1;
      await processDirectory(inputPath, outputPath, nextDepth);
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    const ext = path.extname(entry.name);
    if (ext === MIRROW_EXTENSION) {
      await compileMirrowFile(inputPath, toSvgPath(outputDir, entry.name));
    } else {
      await copyAsset(inputPath, outputPath);
    }
  }
}

async function ensureOutputParent(target: string): Promise<void> {
  const parent = path.dirname(target);
  if (parent) {
    await fs.mkdir(parent, { recursive: true });
  }
}

export async function runMirrow(options: CliOptions): Promise<void> {
  const { input, output, depth } = options;

  const inputStats = await fs.stat(input).catch(() => {
    throw new Error(`Input not found: ${input}`);
  });

  const outputStats = await fs.stat(output).catch(() => undefined);

  if (inputStats.isDirectory()) {
    if (outputStats && !outputStats.isDirectory()) {
      throw new Error("Input is a directory, but output is not");
    }
    await fs.mkdir(output, { recursive: true });
    await processDirectory(input, output, depth);
    return;
  }

  if (outputStats && outputStats.isDirectory()) {
    throw new Error("Input is a file, but output is a directory");
  }

  const target = path.extname(output) ? output : `${output}.svg`;
  assertMirrowFile(input);
  await ensureOutputParent(target);
  await compileMirrowFile(input, target);
}
