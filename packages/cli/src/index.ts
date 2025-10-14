#!/usr/bin/env node

import process from "node:process";

import { runCli } from "./cli.js";

runCli(process.argv).catch((error: unknown) => {
  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error(error);
  }
  process.exit(1);
});
