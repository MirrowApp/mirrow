import test from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";

import { compile } from "@mirrowjs/core";
import { runMirrow, watchMirrow } from "../dist/runner.js";

const MIRROW_SNIPPET = `svg { size: (24, 24) }`;
const UPDATED_SNIPPET = `svg { size: (48, 48) }`;

async function createTempDir(label) {
  return fs.mkdtemp(path.join(os.tmpdir(), `mirrow-cli-${label}-`));
}

async function writeFile(target, contents) {
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, contents, "utf8");
}

async function waitUntil(predicate, timeout = 2000, interval = 50) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await predicate()) {
      return;
    }
    await delay(interval);
  }
  throw new Error("Timed out waiting for condition");
}

test("compiles a single Mirrow file and appends the .svg extension", async () => {
  const root = await createTempDir("single");
  const inputFile = path.join(root, "icon.mirrow");
  const outputBase = path.join(root, "icon-output");

  await writeFile(inputFile, MIRROW_SNIPPET);

  await runMirrow({ input: inputFile, output: outputBase, depth: 0 });

  const resultPath = `${outputBase}.svg`;
  const compiled = await fs.readFile(resultPath, "utf8");
  assert.equal(compiled.trim(), compile(MIRROW_SNIPPET).trim());
});

test("walks directories without recursion when depth is 0", async () => {
  const base = await createTempDir("depth0");
  const inputDir = path.join(base, "input");
  const outputDir = path.join(base, "output");

  await writeFile(path.join(inputDir, "root.mirrow"), MIRROW_SNIPPET);
  await writeFile(path.join(inputDir, "asset.txt"), "static asset");
  await writeFile(
    path.join(inputDir, "nested", "child.mirrow"),
    MIRROW_SNIPPET
  );

  await runMirrow({ input: inputDir, output: outputDir, depth: 0 });

  const rootSvg = await fs.readFile(path.join(outputDir, "root.svg"), "utf8");
  assert.equal(rootSvg.trim(), compile(MIRROW_SNIPPET).trim());

  const copiedAsset = await fs.readFile(
    path.join(outputDir, "asset.txt"),
    "utf8"
  );
  assert.equal(copiedAsset, "static asset");

  await assert.rejects(fs.access(path.join(outputDir, "nested")), {
    code: "ENOENT",
  });
});

test("respects positive depth values and unbounded recursion", async () => {
  const base = await createTempDir("depth");
  const inputDir = path.join(base, "input");
  const outputDepthOne = path.join(base, "out-depth1");
  const outputInfinity = path.join(base, "out-infinity");

  await writeFile(
    path.join(inputDir, "nested", "child.mirrow"),
    MIRROW_SNIPPET
  );
  await writeFile(
    path.join(inputDir, "nested", "deeper", "grandchild.mirrow"),
    MIRROW_SNIPPET
  );

  await runMirrow({ input: inputDir, output: outputDepthOne, depth: 1 });
  await runMirrow({ input: inputDir, output: outputInfinity, depth: Infinity });

  const childSvg = await fs.readFile(
    path.join(outputDepthOne, "nested", "child.svg"),
    "utf8"
  );
  assert.equal(childSvg.trim(), compile(MIRROW_SNIPPET).trim());
  await assert.rejects(
    fs.access(path.join(outputDepthOne, "nested", "deeper", "grandchild.svg")),
    {
      code: "ENOENT",
    }
  );

  const grandchildSvg = await fs.readFile(
    path.join(outputInfinity, "nested", "deeper", "grandchild.svg"),
    "utf8"
  );
  assert.equal(grandchildSvg.trim(), compile(MIRROW_SNIPPET).trim());
});

test("watch mode recompiles a single file when it changes", async () => {
  const root = await createTempDir("watch-file");
  const inputFile = path.join(root, "badge.mirrow");
  const outputBase = path.join(root, "badge-output");
  const targetSvg = `${outputBase}.svg`;

  await writeFile(inputFile, MIRROW_SNIPPET);

  const controller = new AbortController();
  const watcher = watchMirrow(
    { input: inputFile, output: outputBase, depth: 0 },
    controller.signal
  );

  await waitUntil(async () => {
    try {
      const compiled = await fs.readFile(targetSvg, "utf8");
      return compiled.trim() === compile(MIRROW_SNIPPET).trim();
    } catch {
      return false;
    }
  });

  await writeFile(inputFile, UPDATED_SNIPPET);

  await waitUntil(async () => {
    try {
      const compiled = await fs.readFile(targetSvg, "utf8");
      return compiled.trim() === compile(UPDATED_SNIPPET).trim();
    } catch {
      return false;
    }
  });

  controller.abort();
  await watcher;
});

test("watch mode honours directory depth", async () => {
  const base = await createTempDir("watch-depth");
  const inputDir = path.join(base, "input");
  const outputDir = path.join(base, "output");

  await writeFile(path.join(inputDir, "root.mirrow"), MIRROW_SNIPPET);

  const controller = new AbortController();
  const watcher = watchMirrow(
    { input: inputDir, output: outputDir, depth: 0 },
    controller.signal
  );

  const rootSvg = path.join(outputDir, "root.svg");
  await waitUntil(async () => {
    try {
      await fs.access(rootSvg);
      return true;
    } catch {
      return false;
    }
  });

  await writeFile(
    path.join(inputDir, "nested", "child.mirrow"),
    MIRROW_SNIPPET
  );
  await delay(200);

  await assert.rejects(fs.access(path.join(outputDir, "nested", "child.svg")), {
    code: "ENOENT",
  });

  controller.abort();
  await watcher;
});

test("watch mode removes outputs when sources are deleted", async () => {
  const base = await createTempDir("watch-remove");
  const inputDir = path.join(base, "input");
  const outputDir = path.join(base, "output");
  const sourceFile = path.join(inputDir, "logo.mirrow");
  const outputFile = path.join(outputDir, "logo.svg");

  await writeFile(sourceFile, MIRROW_SNIPPET);

  const controller = new AbortController();
  const watcher = watchMirrow(
    { input: inputDir, output: outputDir, depth: Infinity },
    controller.signal
  );

  await waitUntil(async () => {
    try {
      await fs.access(outputFile);
      return true;
    } catch {
      return false;
    }
  });

  await fs.rm(sourceFile);

  await waitUntil(async () => {
    try {
      await fs.access(outputFile);
      return false;
    } catch (error) {
      return error && error.code === "ENOENT";
    }
  });

  controller.abort();
  await watcher;
});
