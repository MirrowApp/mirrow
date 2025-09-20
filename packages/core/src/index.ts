import { pathToFileURL } from "node:url";

import { LexerError, tokenize } from "./compiler/lexer.js";
import { parse, ParserError } from "./compiler/parser.js";
import { compileAst } from "./compiler/compiler.js";
export { Keyword, getSvgKeywords } from "./data/keywords.js";
export {
  Codeblock,
  type CodeblockKind,
  CSS_STATES,
  JS_EVENTS,
  isCssState,
  isJsEvent,
} from "./data/codeblocks.js";

export interface CompileOptions {
  format?: "svg" | "tsx";
}

export function compile(code: string, options: CompileOptions = {}): string {
  const format = options.format ?? "svg";
  if (format !== "svg") {
    throw new Error(`Unsupported output format: ${format}`);
  }
  const tokens = tokenize(code);
  const ast = parse(tokens);
  return compileAst(ast[0], ast[1]);
}

process.on("uncaughtException", (err) => {
  if (err instanceof ParserError || err instanceof LexerError) {
    console.error(
      `${err.name} at line ${err.position.line}, column ${err.position.column}: ${err.message}`
    );
    process.exit(1);
  }
  console.error(err.message);
  process.exit(1);
});

function runExample(): void {
  const code = `
  svg {
  box: (0, 0, 200, 200)
  size: (320px, 320px)
  preserve: (xMidYMid, meet)

  circle {
    id: "pulse"
    at: (100, 100)
    r: 40
    fill: "hotpink"

    animate {
      prop: "r"
      from: 40
      to: 60
      dur: 2s
      repeat: infinite
    }
  }

  @hover, @active {
    #pulse {
      cy: 150
      r: 60
    }
  }
}

  `;
  console.log(compile(code));
}

if (process.argv[1]) {
  const entryUrl = pathToFileURL(process.argv[1]).href;
  if (import.meta.url === entryUrl) {
    runExample();
  }
}
