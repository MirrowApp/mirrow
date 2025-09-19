import { Lexer, LexerError, TokenType } from "./lexer.js";
import type { Token } from "./lexer.js";

function readTemplateRaw(lex: Lexer): string {
  if (lex.input[lex.position] !== "`") {
    throw new LexerError("readTemplateRaw called but current char is not `", {
      line: lex.line,
      column: lex.column,
    });
  }

  const startIdx = lex.position;
  lex.advance();

  const len = lex.input.length;

  while (lex.position < len) {
    const ch = lex.input[lex.position];

    if (ch === "\\") {
      lex.advance();
      if (lex.position < len) lex.advance();
      continue;
    }

    if (ch === "$" && lex.input[lex.position + 1] === "{") {
      lex.advance();
      lex.advance();
      let exprDepth = 1;
      while (lex.position < len && exprDepth > 0) {
        const c = lex.input[lex.position];

        if (c === "'" || c === '"') {
          lex.readString();
          continue;
        }

        if (c === "`") {
          readTemplateRaw(lex);
          continue;
        }

        if (c === "/" && lex.input[lex.position + 1] === "/") {
          lex.readComment();
          continue;
        }
        if (c === "/" && lex.input[lex.position + 1] === "*") {
          lex.readComment();
          continue;
        }

        if (c === "{") {
          exprDepth++;
          lex.advance();
          continue;
        }
        if (c === "}") {
          exprDepth--;
          lex.advance();
          continue;
        }

        lex.advance();
      }
      continue;
    }

    if (ch === "`") {
      lex.advance();
      break;
    }

    lex.advance();
  }

  if (lex.position >= len && lex.input[lex.position - 1] !== "`") {
    throw new LexerError("Unterminated template literal", {
      line: lex.line,
      column: lex.column,
    });
  }

  return lex.input.slice(startIdx, lex.position);
}

function readBlock(lex: Lexer): Token {
  const startPosition = { line: lex.line, column: lex.column };
  const len = lex.input.length;

  if (lex.input[lex.position] !== "{") {
    throw new LexerError(
      "readBlock called but current char is not '{'",
      startPosition
    );
  }

  const startIdx = lex.position;
  lex.advance();

  let depth = 1;

  while (lex.position < len) {
    const ch = lex.input[lex.position];

    if (ch === '"' || ch === "'") {
      lex.readString();
      continue;
    }

    if (ch === "`") {
      readTemplateRaw(lex);
      continue;
    }

    if (ch === "/" && lex.input[lex.position + 1] === "/") {
      lex.readComment();
      continue;
    }
    if (ch === "/" && lex.input[lex.position + 1] === "*") {
      lex.readComment();
      continue;
    }

    if (ch === "{") {
      depth++;
      lex.advance();
      continue;
    }

    if (ch === "}") {
      lex.advance();
      depth--;
      if (depth === 0) {
        const raw = lex.input.slice(startIdx, lex.position);
        return {
          type: TokenType.BLOCK,
          value: raw,
          position: startPosition,
        };
      }
      continue;
    }

    lex.advance();
  }

  throw new LexerError("Unterminated block", startPosition);
}

export { readBlock, readTemplateRaw };
