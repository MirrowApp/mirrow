import { readBlock } from "./template.js";

export interface Token {
  type: TokenType;
  value: string;
  position: {
    line: number;
    column: number;
  };
}

export class LexerError extends Error {
  constructor(
    message: string,
    public position: { line: number; column: number }
  ) {
    super(message);
    this.name = "LexerError";
  }
}

const validIdentifierTokens = ["_", "-", "#"];

export enum TokenType {
  STRING = "STRING",
  NUMBER = "NUMBER",
  IDENTIFIER = "IDENTIFIER",
  DOLLAR = "DOLLAR",
  AT = "AT",
  COLON = "COLON",
  EQUALS = "EQUALS",
  COMMA = "COMMA",
  LEFT_PAREN = "LEFT_PAREN",
  RIGHT_PAREN = "RIGHT_PAREN",
  LEFT_BRACKET = "LEFT_BRACKET",
  RIGHT_BRACKET = "RIGHT_BRACKET",
  LEFT_BRACE = "LEFT_BRACE",
  RIGHT_BRACE = "RIGHT_BRACE",
  SINGLE_LINE_COMMENT = "SINGLE_LINE_COMMENT",
  MULTI_LINE_COMMENT = "MULTI_LINE_COMMENT",
  WHITESPACE = "WHITESPACE",
  EOF = "EOF",
  UNKNOWN = "UNKNOWN",
  BLOCK = "BLOCK",
}

export class Lexer {
  public input: string;
  public position: number = 0;
  public line: number = 1;
  public column: number = 1;

  constructor(input: string) {
    this.input = input;
  }

  tokenize(): Token[] {
    const tokens: Token[] = [];
    let token: Token | null;

    while ((token = this.nextToken()) !== null) {
      if (
        token.type !== TokenType.WHITESPACE &&
        token.type !== TokenType.SINGLE_LINE_COMMENT &&
        token.type !== TokenType.MULTI_LINE_COMMENT
      ) {
        tokens.push(token);
      }
    }

    tokens.push({
      type: TokenType.EOF,
      value: "",
      position: { line: this.line, column: this.column },
    });

    return tokens;
  }

  public nextToken(): Token | null {
    if (this.position >= this.input.length) {
      return null;
    }

    let char = this.input[this.position];

    while (char === "\n") {
      this.advance();
      char = this.input[this.position];
    }

    if (!char) {
      return null;
    }
    const startPosition = { line: this.line, column: this.column };

    if (this.isWhitespace(char)) {
      return this.skipWhitespace();
    }

    if (char === '"' || char === "'") {
      return this.readString();
    }

    if (this.isDigit(char)) {
      return this.readNumber();
    }

    if (char === "-") {
      const nextChar = this.input[this.position + 1];
      const thirdChar = this.input[this.position + 2];

      if (
        nextChar &&
        (this.isDigit(nextChar) ||
          (nextChar === "." && thirdChar && this.isDigit(thirdChar)))
      ) {
        return this.readNumber();
      }

      if (
        nextChar &&
        (this.isAlpha(nextChar) ||
          this.isDigit(nextChar) ||
          validIdentifierTokens.includes(nextChar))
      ) {
        return this.readIdentifier();
      }

      // Isolated '-' should fall through and be treated as unknown for now.
    }

    if (char === "$") {
      return this.readVariableReference();
    }

    if (this.isAlpha(char) || validIdentifierTokens.includes(char)) {
      return this.readIdentifier();
    }

    switch (char) {
      case "@":
        this.advance();
        return {
          type: TokenType.AT,
          value: "@",
          position: startPosition,
        };

      case ":":
        this.advance();
        return {
          type: TokenType.COLON,
          value: ":",
          position: startPosition,
        };

      case "=":
        this.advance();
        return {
          type: TokenType.EQUALS,
          value: "=",
          position: startPosition,
        };

      case ",":
        this.advance();
        return {
          type: TokenType.COMMA,
          value: ",",
          position: startPosition,
        };

      case "(":
        this.advance();
        return {
          type: TokenType.LEFT_PAREN,
          value: "(",
          position: startPosition,
        };

      case ")":
        this.advance();
        return {
          type: TokenType.RIGHT_PAREN,
          value: ")",
          position: startPosition,
        };

      case "[":
        this.advance();
        return {
          type: TokenType.LEFT_BRACKET,
          value: "[",
          position: startPosition,
        };

      case "]":
        this.advance();
        return {
          type: TokenType.RIGHT_BRACKET,
          value: "]",
          position: startPosition,
        };

      case "{":
        return readBlock(this);

      case "}":
        this.advance();
        return {
          type: TokenType.RIGHT_BRACE,
          value: "}",
          position: startPosition,
        };

      case "/":
        return this.readComment();
    }

    this.advance();
    return {
      type: TokenType.UNKNOWN,
      value: char,
      position: startPosition,
    };
  }

  public readString(): Token {
    const startPosition = { line: this.line, column: this.column };
    const quote = this.input[this.position];
    this.advance();

    let value = "";

    while (
      this.position < this.input.length &&
      this.input[this.position] !== quote
    ) {
      const char = this.input[this.position];
      if (!char) break;

      if (char === "\\" && this.position + 1 < this.input.length) {
        const nextChar = this.input[this.position + 1];
        switch (nextChar) {
          case "n":
            value += "\n";
            break;
          case "t":
            value += "\t";
            break;
          case "r":
            value += "\r";
            break;
          case "\\":
            value += "\\";
            break;
          case '"':
            value += '"';
            break;
          case "'":
            value += "'";
            break;
          default:
            value += nextChar;
        }
        this.advance();
        this.advance();
      } else {
        value += char;
        this.advance();
      }
    }

    if (this.position < this.input.length) {
      this.advance();
    } else {
      throw new LexerError("Unterminated string", startPosition);
    }

    return {
      type: TokenType.STRING,
      value,
      position: startPosition,
    };
  }

  public readComment(): Token {
    const startPosition = { line: this.line, column: this.column };
    let value = "";

    this.advance();

    if (this.position >= this.input.length) {
      return {
        type: TokenType.UNKNOWN,
        value: "/",
        position: startPosition,
      };
    }

    const nextChar = this.input[this.position];

    if (nextChar === "/") {
      this.advance();
      while (
        this.position < this.input.length &&
        this.input[this.position] !== "\n"
      ) {
        value += this.input[this.position];
        this.advance();
      }
      return {
        type: TokenType.SINGLE_LINE_COMMENT,
        value,
        position: startPosition,
      };
    } else if (nextChar === "*") {
      this.advance();
      while (this.position < this.input.length) {
        const char = this.input[this.position];
        if (
          char === "*" &&
          this.position + 1 < this.input.length &&
          this.input[this.position + 1] === "/"
        ) {
          this.advance();
          this.advance();
          return {
            type: TokenType.MULTI_LINE_COMMENT,
            value,
            position: startPosition,
          };
        }
        value += char;
        this.advance();
      }
      throw new LexerError("Unterminated multi-line comment", startPosition);
    } else {
      return {
        type: TokenType.UNKNOWN,
        value: "/",
        position: startPosition,
      };
    }
  }

  public readIdentifier(): Token {
    const startPosition = { line: this.line, column: this.column };
    let value = "";

    while (this.position < this.input.length) {
      const char = this.input[this.position];
      if (
        !char ||
        (!this.isAlpha(char) &&
          !this.isDigit(char) &&
          !validIdentifierTokens.includes(char))
      ) {
        break;
      }
      value += char;
      this.advance();
    }

    return {
      type: TokenType.IDENTIFIER,
      value,
      position: startPosition,
    };
  }

  public readVariableReference(): Token {
    const startPosition = { line: this.line, column: this.column };
    
    // Consume the $ character
    this.advance();
    
    // Read the variable name
    let value = "$";
    
    // Check if there's a valid identifier after the $
    if (this.position < this.input.length) {
      const firstChar = this.input[this.position];
      if (firstChar && (this.isAlpha(firstChar) || firstChar === "_")) {
        // Read the identifier part
        while (this.position < this.input.length) {
          const char = this.input[this.position];
          if (
            !char ||
            (!this.isAlpha(char) &&
              !this.isDigit(char) &&
              !["_", "-"].includes(char))
          ) {
            break;
          }
          value += char;
          this.advance();
        }
      } else {
        // Invalid variable reference - just the $ character
        throw new LexerError(
          "Invalid variable reference: variable name must start with a letter or underscore",
          startPosition
        );
      }
    } else {
      // $ at end of input
      throw new LexerError("Unexpected end of input after '$'", startPosition);
    }

    return {
      type: TokenType.DOLLAR,
      value,
      position: startPosition,
    };
  }

  public readNumber(): Token {
    const startPosition = { line: this.line, column: this.column };
    let value = "";
    const initialPosition = this.position;
    while (this.position < this.input.length) {
      const char = this.input[this.position];
      if (char === "-" && initialPosition === this.position) {
        value += char;
        this.advance();
        continue;
      } else if (!char || !this.isDigit(char)) break;
      value += char;
      this.advance();
    }

    if (
      this.position < this.input.length &&
      this.input[this.position] === "."
    ) {
      value += ".";
      this.advance();

      while (this.position < this.input.length) {
        const char = this.input[this.position];
        if (!char || !this.isDigit(char)) break;
        value += char;
        this.advance();
      }
    }

    return {
      type: TokenType.NUMBER,
      value,
      position: startPosition,
    };
  }

  public skipWhitespace(): Token {
    const startPosition = { line: this.line, column: this.column };
    let value = "";

    while (this.position < this.input.length) {
      const char = this.input[this.position];
      if (!char || !this.isWhitespace(char)) break;
      value += char;
      this.advance();
    }

    return {
      type: TokenType.WHITESPACE,
      value,
      position: startPosition,
    };
  }

  public isWhitespace(char: string): boolean {
    return char === " " || char === "\t" || char === "\r";
  }

  public isDigit(char: string): boolean {
    return char >= "0" && char <= "9";
  }

  public isAlpha(char: string): boolean {
    return (char >= "a" && char <= "z") || (char >= "A" && char <= "Z");
  }

  readStringRaw(): string {
    const startIdx = this.position;
    this.readString();
    return this.input.slice(startIdx, this.position);
  }

  readCommentRaw(): string {
    const startIdx = this.position;
    this.readComment();
    return this.input.slice(startIdx, this.position);
  }

  public advance(): void {
    if (this.position < this.input.length) {
      if (this.input[this.position] === "\n") {
        this.line++;
        this.column = 1;
      } else {
        this.column++;
      }
      this.position++;
    }
  }
}

export function tokenize(input: string): Token[] {
  const lexer = new Lexer(input);
  return lexer.tokenize();
}

export function printTokens(tokens: Token[]): void {
  console.log("Tokens:");
  tokens.forEach((token, index) => {
    console.log(
      `${index + 1}. ${token.type} "${token.value}" at line ${
        token.position.line
      }, col ${token.position.column}`
    );
  });
}
