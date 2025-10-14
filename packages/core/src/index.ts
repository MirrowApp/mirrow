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

export function compile(code: string): string {
  const tokens = tokenize(code);
  const ast = parse(tokens);
  return compileAst(ast[0], ast[1]);
}

export { tokenize } from './compiler/lexer.js';
export { parse } from './compiler/parser.js';

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
