import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

import chokidar from "chokidar";

import { compile } from "@mirrowjs/core";

export interface CliOptions {
  input: string;
  output: string;
  depth: number | typeof Infinity;
}

const MIRROW_EXTENSION = ".mirrow";
const WATCH_STABILITY_MS = 150;

type ActionKind = "compiled" | "copied";

type WatchEvent = "add" | "addDir" | "change" | "unlink" | "unlinkDir";

type Task = () => Promise<void>;

function assertMirrowFile(filePath: string): void {
  if (path.extname(filePath) !== MIRROW_EXTENSION) {
    throw new Error(
      `Mirrow sources must use the ${MIRROW_EXTENSION} extension`
    );
  }
}

async function compileMirrowFile(
  inputFile: string,
  outputFile: string
): Promise<void> {
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

function logAction(
  kind: ActionKind,
  inputPath: string,
  outputPath: string
): void {
  const from = formatPath(inputPath);
  const to = formatPath(outputPath);
  console.log(`${kind.padEnd(8)} ${from} -> ${to}`);
}

function logRemoval(inputPath: string, outputPath: string): void {
  const from = formatPath(inputPath);
  const to = formatPath(outputPath);
  console.log(`removed  ${from} -> ${to}`);
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

function resolveOutputFilePath(output: string): string {
  return path.extname(output) ? output : `${output}.svg`;
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

  const target = resolveOutputFilePath(output);
  assertMirrowFile(input);
  await ensureOutputParent(target);
  await compileMirrowFile(input, target);
}

export async function watchMirrow(
  options: CliOptions,
  signal?: AbortSignal
): Promise<void> {
  const { input, output, depth } = options;
  const abortSignal = signal ?? new AbortController().signal;

  const inputStats = await fs.stat(input).catch(() => {
    throw new Error(`Input not found: ${input}`);
  });

  const outputStats = await fs.stat(output).catch(() => undefined);

  if (inputStats.isDirectory()) {
    if (outputStats && !outputStats.isDirectory()) {
      throw new Error("Input is a directory, but output is not");
    }
  } else if (outputStats && outputStats.isDirectory()) {
    throw new Error("Input is a file, but output is a directory");
  }

  await runMirrow(options);
  console.log(
    `Watching ${formatPath(input)} (depth: ${
      depth === Infinity ? "unbound" : depth
    })`
  );
  console.log("Press Ctrl+C to stop.\n");

  const enqueue = createTaskQueue();

  if (inputStats.isDirectory()) {
    await watchDirectory(input, output, depth, abortSignal, enqueue);
  } else {
    await watchFile(input, output, abortSignal, enqueue);
  }

  console.log("Watcher stopped.");
}

async function watchDirectory(
  inputDir: string,
  outputDir: string,
  depth: number | typeof Infinity,
  signal: AbortSignal,
  enqueue: (task: Task) => void
): Promise<void> {
  const inputRoot = path.resolve(inputDir);
  const outputRoot = path.resolve(outputDir);

  const watcherOptions: chokidar.WatchOptions = {
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: WATCH_STABILITY_MS,
      pollInterval: 50,
    },
  };

  if (depth !== Infinity) {
    watcherOptions.depth = depth as number;
  }

  const watcher = chokidar.watch(inputRoot, watcherOptions);

  const isInsideOutput = (target: string): boolean => {
    const absolute = path.resolve(target);
    return (
      absolute === outputRoot || absolute.startsWith(`${outputRoot}${path.sep}`)
    );
  };

  const handleEvent = async (event: WatchEvent, changedPath: string) => {
    if (isInsideOutput(changedPath)) {
      return;
    }

    const relative = path.relative(inputRoot, changedPath);
    if (!relative || relative.startsWith("..")) {
      return;
    }

    const isDirectoryEvent = event === "addDir" || event === "unlinkDir";
    if (!isWithinDepth(relative, depth, isDirectoryEvent)) {
      return;
    }

    if (event === "addDir") {
      const targetDir = path.join(outputRoot, relative);
      await fs.mkdir(targetDir, { recursive: true });
      return;
    }

    if (event === "unlinkDir") {
      const targetDir = path.join(outputRoot, relative);
      await fs.rm(targetDir, { recursive: true, force: true });
      logRemoval(changedPath, targetDir);
      return;
    }

    const isMirrow = path.extname(changedPath) === MIRROW_EXTENSION;
    const outputFile = resolveOutputForRelative(outputRoot, relative, isMirrow);

    if (event === "unlink") {
      await fs.rm(outputFile, { force: true });
      logRemoval(changedPath, outputFile);
      return;
    }

    if (event === "add" || event === "change") {
      if (isMirrow) {
        await compileMirrowFile(changedPath, outputFile);
      } else {
        await copyAsset(changedPath, outputFile);
      }
    }
  };

  watcher.on("all", (event, changedPath) => {
    enqueue(() => handleEvent(event as WatchEvent, changedPath));
  });

  watcher.on("error", (error) => {
    logWatchError(error);
  });

  await waitForAbort(watcher, signal);
}

async function watchFile(
  inputFile: string,
  output: string,
  signal: AbortSignal,
  enqueue: (task: Task) => void
): Promise<void> {
  const watcher = chokidar.watch(inputFile, {
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: WATCH_STABILITY_MS,
      pollInterval: 50,
    },
  });

  const targetFile = resolveOutputFilePath(output);

  const handleEvent = async (event: WatchEvent) => {
    if (event === "unlink") {
      await fs.rm(targetFile, { force: true });
      logRemoval(inputFile, targetFile);
      return;
    }

    if (event === "add" || event === "change") {
      await compileMirrowFile(inputFile, targetFile);
    }
  };

  watcher.on("all", (event) => {
    enqueue(() => handleEvent(event as WatchEvent));
  });

  watcher.on("error", (error) => {
    logWatchError(error);
  });

  await waitForAbort(watcher, signal);
}

function resolveOutputForRelative(
  outputRoot: string,
  relativePath: string,
  isMirrow: boolean
): string {
  const relativeDir = path.dirname(relativePath);
  const baseDir =
    relativeDir === "." ? outputRoot : path.join(outputRoot, relativeDir);
  const fileName = path.basename(relativePath);
  return isMirrow ? toSvgPath(baseDir, fileName) : path.join(baseDir, fileName);
}

function isWithinDepth(
  relativePath: string,
  depth: number | typeof Infinity,
  isDirectory: boolean
): boolean {
  if (depth === Infinity) {
    return true;
  }

  const parts = relativePath.split(path.sep).filter(Boolean);
  if (isDirectory) {
    return parts.length <= depth;
  }

  const dirDepth = Math.max(parts.length - 1, 0);
  return dirDepth <= depth;
}

function createTaskQueue(): (task: Task) => void {
  let chain = Promise.resolve();
  return (task: Task) => {
    chain = chain
      .then(() => task())
      .catch((error) => {
        logWatchError(error);
      });
  };
}

async function waitForAbort(
  watcher: chokidar.FSWatcher,
  signal: AbortSignal
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const stop = () => {
      watcher.close().then(resolve).catch(reject);
    };

    if (signal.aborted) {
      stop();
      return;
    }

    signal.addEventListener("abort", stop, { once: true });
  });
}

function logWatchError(error: unknown): void {
  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error(error);
  }
}
