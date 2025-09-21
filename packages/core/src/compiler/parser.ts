import { createHash } from "node:crypto";
import type {
  AttributeSpec,
  BooleanAttributeSpec,
  Keyword,
  NumberAttributeSpec,
  StringAttributeSpec,
  TupleAttributeSpec,
} from "../data/keywords.js";
import { getSvgKeywords } from "../data/keywords.js";
import {
  type AST,
  type AttributeNode,
  type CssStateDirective,
  type ElementNode,
  type TextNode,
  type IdentifierLiteral,
  type JsEventDirective,
  type LiteralValue,
  type NumberLiteral,
  type RootNode,
  type SourcePosition,
  type SpecialBlock,
  type StringLiteral,
  type TupleLiteral,
} from "./ast.js";

interface ElementBlockEntries {
  attributes: AttributeNode[];
  children: Array<ElementNode | TextNode>;
  cssStates: Set<CssStateDirective>;
  jsEvents: Set<JsEventDirective>;
  dataId: string | null;
}

interface DirectiveGroupOptions<T> {
  parseDirective: () => T;
  hasNext: () => boolean;
  separatorMessage: string;
  blockMessageFor: (directive: T) => string;
}
import { tokenize, type Token, TokenType } from "./lexer.js";
import {
  CSS_UNIT_SUFFIXES,
  isCssException,
  isCssState,
  isJsEvent,
  isSpecialCodeblock,
} from "../data/codeblocks.js";

export class ParserError extends Error {
  constructor(message: string, public position: SourcePosition) {
    super(message);
    this.name = "ParserError";
  }
}

interface AttributeValidationContext {
  keyword: Keyword;
  attributeName: string;
}

type AttributeValidator<T extends AttributeSpec> = (
  context: AttributeValidationContext,
  spec: T,
  value: LiteralValue
) => void;

const failValidation = (
  context: AttributeValidationContext,
  message: string,
  position: SourcePosition
): never => {
  throw new ParserError(
    `Attribute '${context.attributeName}' on <${context.keyword.name}> ${message}`,
    position
  );
};

const ATTRIBUTE_VALIDATORS: {
  number: AttributeValidator<NumberAttributeSpec>;
  string: AttributeValidator<StringAttributeSpec>;
  boolean: AttributeValidator<BooleanAttributeSpec>;
  tuple: AttributeValidator<TupleAttributeSpec>;
} = {
  number: (context, spec, value) => {
    if (value.type === "NumberLiteral") {
      const numberValue = value as NumberLiteral;
      if (spec.validator && !spec.validator(numberValue.value)) {
        failValidation(context, "failed validation", value.position);
      }
      return;
    }

    if (value.type === "StringLiteral") {
      return;
    }

    failValidation(context, "expects a numeric value", value.position);
  },
  string: (context, spec, value) => {
    if (value.type !== "StringLiteral") {
      failValidation(
        context,
        `expects a string value got '${value.type}'`,
        value.position
      );
    }
    const stringValue = value as StringLiteral;
    if (spec.validator && !spec.validator(stringValue.value)) {
      failValidation(context, "failed validation", value.position);
    }
  },
  boolean: (context, spec, value) => {
    if (value.type !== "IdentifierLiteral") {
      failValidation(context, "expects 'true' or 'false'", value.position);
    }
    const booleanValue = value as IdentifierLiteral;
    const normalized = booleanValue.name.toLowerCase();
    if (normalized !== "true" && normalized !== "false") {
      failValidation(context, "expects 'true' or 'false'", value.position);
    }
    if (spec.validator && !spec.validator(normalized === "true")) {
      failValidation(context, "failed validation", value.position);
    }
  },
  tuple: (context, spec, value) => {
    if (value.type !== "TupleLiteral") {
      failValidation(context, "expects a tuple", value.position);
    }
    const tupleValue = value as TupleLiteral;
    if (tupleValue.values.length !== spec.length) {
      failValidation(
        context,
        `expects a tuple of length ${spec.length}`,
        value.position
      );
    }
    const itemTypes = spec.itemTypes;
    const collected: Array<number | string> = [];
    let shouldRunValidator = true;

    for (let index = 0; index < tupleValue.values.length; index++) {
      const entry = tupleValue.values[index]!;
      const expectedType = itemTypes?.[index] ?? itemTypes?.[0] ?? "number";

      if (expectedType === "number") {
        if (entry.type === "NumberLiteral") {
          collected.push((entry as NumberLiteral).value);
          continue;
        }

        if (entry.type === "StringLiteral") {
          collected.push((entry as StringLiteral).value);
          shouldRunValidator = false;
          continue;
        }

        failValidation(
          context,
          "expects numeric or string tuple items",
          entry.position
        );
        continue;
      }

      if (expectedType === "string") {
        if (entry.type !== "StringLiteral") {
          failValidation(context, "expects string tuple items", entry.position);
        }
        collected.push((entry as StringLiteral).value);
        continue;
      }

      if (expectedType === "identifier") {
        if (entry.type !== "IdentifierLiteral") {
          failValidation(
            context,
            "expects identifier tuple items",
            entry.position
          );
        }
        collected.push((entry as IdentifierLiteral).name);
        continue;
      }

      failValidation(
        context,
        "has unsupported tuple item type",
        entry.position
      );
    }

    if (
      shouldRunValidator &&
      spec.validator &&
      !spec.validator(collected as never)
    ) {
      failValidation(context, "failed validation", value.position);
    }
  },
};

class Parser {
  private index = 0;
  private tokens: Token[];
  private readonly keywordCatalog = getSvgKeywords();
  private newGenTokens: Token[] = [];

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  parse(): [RootNode, SpecialBlock[]] {
    const children: ElementNode[] = [];
    const specialBlocks: SpecialBlock[] = [];

    while (!this.check(TokenType.EOF)) {
      const peekValue = this.peek().value;
      const position = this.peek().position;
      const type = "SpecialBlock";
      const codeblock = isSpecialCodeblock(peekValue);
      if (
        codeblock.valid &&
        this.check(TokenType.IDENTIFIER) &&
        this.peek(1).type === TokenType.BLOCK
      ) {
        this.consume(TokenType.IDENTIFIER, "Expected codeblock identifier");
        if (codeblock.kind === "style") {
          specialBlocks.push({
            type,
            style: "style",
            content: this.consume(TokenType.BLOCK, "Expected style block")
              .value.slice(1, -1)
              .trim(),
            position,
          });
          continue;
        }
        if (codeblock.kind === "script") {
          specialBlocks.push({
            type,
            style: "script",
            content: this.consume(TokenType.BLOCK, "Expected script block")
              .value.slice(1, -1)
              .trim(),
            position,
          });
          continue;
        }
      }
      this.newGenTokens.push(this.peek());
      this.advance();
    }
    this.newGenTokens.push({
      type: TokenType.EOF,
      value: "",
      position: this.peek().position,
    });
    this.tokens = this.newGenTokens;
    this.index = 0; // Reset index to parse elements
    while (!this.check(TokenType.EOF)) {
      children.push(this.parseElement());
    }
    return [{ type: "Root", children }, specialBlocks];
  }

  private parseElement(): ElementNode {
    const nameToken = this.consume(
      TokenType.IDENTIFIER,
      "Expected element name"
    );
    const keyword = this.lookupKeyword(nameToken.value, nameToken.position);

    const blockToken = this.consume(
      TokenType.BLOCK,
      `Expected block to describe <${keyword!.name}>`
    );
    const { attributes, children, cssStates, jsEvents, dataId } =
      this.parseElementBlock(keyword, blockToken);
    this.verifyAttributes(keyword, attributes, nameToken.position);

    return {
      type: "Element",
      name: keyword.name,
      attributes,
      children,
      cssStates,
      jsEvents,
      dataId,
      position: nameToken.position,
    };
  }

  private parseElementBlock(
    keyword: Keyword,
    blockToken: Token
  ): ElementBlockEntries {
    const raw = blockToken.value;
    if (!raw.startsWith("{") || !raw.endsWith("}")) {
      throw new ParserError(
        `Malformed block for <${keyword.name}>`,
        blockToken.position
      );
    }

    const inner = raw.slice(1, raw.length - 1);
    if (inner.trim().length === 0) {
      return {
        attributes: [],
        children: [],
        cssStates: new Set(),
        jsEvents: new Set(),
        dataId: null,
      };
    }

    const blockTokens = tokenize(inner);
    const nestedParser = new Parser(blockTokens);
    return nestedParser.collectBlockEntries(keyword);
  }

  private parseAttributeEntry(
    parentKeyword: Keyword,
    seen: Set<string>
  ): AttributeNode {
    const nameToken = this.consume(
      TokenType.IDENTIFIER,
      "Expected attribute name"
    );

    if (seen.has(nameToken.value)) {
      throw new ParserError(
        `Attribute '${nameToken.value}' specified multiple times`,
        nameToken.position
      );
    }

    this.consume(
      TokenType.COLON,
      "Expected ':' between attribute name and value"
    );

    const value = this.parseAttributeValue();
    const spec = parentKeyword.getAttributeSpec(nameToken.value);
    if (!spec) {
      throw new ParserError(
        `Attribute '${nameToken.value}' is not allowed on <${parentKeyword.name}>`,
        nameToken.position
      );
    }
    this.validateAttributeValue(parentKeyword, nameToken.value, spec, value);
    seen.add(nameToken.value);
    return {
      type: "Attribute",
      name: nameToken.value,
      value,
      position: nameToken.position,
    };
  }

  private collectBlockEntries(parentKeyword: Keyword): ElementBlockEntries {
    const attributes: AttributeNode[] = [];
    const children: Array<ElementNode | TextNode> = [];
    const seen = new Set<string>();
    const cssStates = new Set<CssStateDirective>();
    const jsEvents = new Set<JsEventDirective>();

    const idGenerated = this.createDirectiveId(
      parentKeyword.name,
      this.peek().position
    );
    let used = false;

    while (!this.check(TokenType.EOF)) {
      if (this.check(TokenType.AT)) {
        const directives = this.parseCssStateDirectives(
          parentKeyword,
          idGenerated
        );
        for (const directive of directives) {
          cssStates.add(directive);
        }
        used = true;
        continue;
      }

      if (this.check(TokenType.STRING)) {
        if (!parentKeyword.canContainText()) {
          const literal = this.parseStringLiteral();
          throw new ParserError(
            `Text content is not allowed inside <${parentKeyword.name}>`,
            literal.position
          );
        }
        const literal = this.parseStringLiteral();
        children.push({
          type: "Text",
          value: literal.value,
          position: literal.position,
        });
        continue;
      }

      if (!this.check(TokenType.IDENTIFIER)) {
        const unexpected = this.peek();
        throw new ParserError(
          `Unexpected token '${unexpected.value}' inside <${parentKeyword.name}>`,
          unexpected.position
        );
      }

      const identifierToken = this.peek();
      const lookahead = this.peek(1);

      if (
        identifierToken.value === "on" &&
        lookahead.type === TokenType.COLON
      ) {
        const directives = this.parseJsEventDirectives(
          parentKeyword,
          idGenerated
        );
        for (const directive of directives) {
          jsEvents.add(directive);
        }
        used = true;
        continue;
      }

      if (lookahead.type === TokenType.COLON) {
        const attribute = this.parseAttributeEntry(parentKeyword, seen);
        attributes.push(attribute);
        continue;
      }

      if (lookahead.type === TokenType.BLOCK) {
        const child = this.parseElement();
        if (!parentKeyword.hasAllowedChild(child.name)) {
          throw new ParserError(
            `Element <${child.name}> is not allowed inside <${parentKeyword.name}>`,
            child.position
          );
        }
        children.push(child);
        continue;
      }

      throw new ParserError(
        `Expected ':' for attribute or block for child in <${parentKeyword.name}>`,
        lookahead.position
      );
    }

    return {
      attributes,
      children,
      cssStates,
      jsEvents,
      dataId: used ? idGenerated : null,
    };
  }

  private parseCssStateDirectives(
    parentKeyword: Keyword,
    directiveId: string
  ): CssStateDirective[] {
    const { directives, blockToken } =
      this.parseDirectiveGroup<CssStateDirective>({
        parseDirective: () => {
          const atToken = this.consume(
            TokenType.AT,
            `Unexpected token inside <${parentKeyword.name}>`
          );
          const stateToken = this.consume(
            TokenType.IDENTIFIER,
            `Expected CSS state name after '@' in <${parentKeyword.name}>`
          );

          if (!isCssState(stateToken.value)) {
            throw new ParserError(
              `Unknown CSS state '${stateToken.value}'`,
              stateToken.position
            );
          }

          return {
            type: "CssState",
            name: stateToken.value,
            dataId: directiveId,
            block: "",
            position: atToken.position,
          } satisfies CssStateDirective;
        },
        hasNext: () =>
          this.check(TokenType.COMMA) && this.peek(1).type === TokenType.AT,
        separatorMessage: "Expected ',' between CSS states",
        blockMessageFor: (directive) =>
          `Expected block for CSS state '${directive.name}' in <${parentKeyword.name}>`,
      });

    const blockValue = blockToken.value;
    return directives.map((directive) => ({
      ...directive,
      block: blockValue,
    }));
  }

  private parseJsEventDirectives(
    parentKeyword: Keyword,
    directiveId: string
  ): JsEventDirective[] {
    const { directives, blockToken } =
      this.parseDirectiveGroup<JsEventDirective>({
        parseDirective: () => {
          const onToken = this.consume(
            TokenType.IDENTIFIER,
            `Unexpected identifier in <${parentKeyword.name}>`
          );
          if (onToken.value !== "on") {
            throw new ParserError(
              `Unexpected identifier '${onToken.value}' inside <${parentKeyword.name}>`,
              onToken.position
            );
          }

          this.consume(
            TokenType.COLON,
            `Expected ':' after 'on' in <${parentKeyword.name}>`
          );

          const eventToken = this.consume(
            TokenType.IDENTIFIER,
            `Expected event name after 'on:' in <${parentKeyword.name}>`
          );

          if (!isJsEvent(eventToken.value)) {
            throw new ParserError(
              `Unknown JavaScript event '${eventToken.value}'`,
              eventToken.position
            );
          }

          return {
            type: "JsEvent",
            name: eventToken.value,
            dataId: directiveId,
            block: "",
            position: onToken.position,
          } satisfies JsEventDirective;
        },
        hasNext: () =>
          this.check(TokenType.COMMA) &&
          this.peek(1).type === TokenType.IDENTIFIER &&
          this.peek(1).value === "on" &&
          this.peek(2).type === TokenType.COLON,
        separatorMessage: "Expected ',' between JavaScript events",
        blockMessageFor: (directive) =>
          `Expected block for event '${directive.name}' in <${parentKeyword.name}>`,
      });

    const blockValue = blockToken.value;
    return directives.map((directive) => ({
      ...directive,
      block: blockValue,
    }));
  }

  private parseDirectiveGroup<T>(options: DirectiveGroupOptions<T>): {
    directives: T[];
    blockToken: Token;
  } {
    const directives: T[] = [];

    do {
      directives.push(options.parseDirective());
      if (!options.hasNext()) {
        break;
      }
      this.consume(TokenType.COMMA, options.separatorMessage);
    } while (true);

    const blockToken = this.consume(
      TokenType.BLOCK,
      options.blockMessageFor(directives[directives.length - 1]!)
    );

    return { directives, blockToken };
  }

  private parseAttributeValue(): LiteralValue {
    const fall = this.fallThrough();
    if (fall) {
      return fall;
    }
    const token = this.peek();

    switch (token.type) {
      case TokenType.STRING:
        return this.parseStringLiteral();
      case TokenType.NUMBER:
        return this.parseNumberLiteral();
      case TokenType.IDENTIFIER:
        return this.parseIdentifierLiteral();
      case TokenType.LEFT_PAREN:
        return this.parseTupleLiteral();
      default:
        throw new ParserError(
          `Unexpected token '${token.value}' in attribute value`,
          token.position
        );
    }
  }

  private parseTupleLiteral(): TupleLiteral {
    const start = this.consume(
      TokenType.LEFT_PAREN,
      "Expected '(' to start tuple"
    );
    const values: LiteralValue[] = [];

    if (!this.check(TokenType.RIGHT_PAREN)) {
      do {
        values.push(this.parseTupleItem());
      } while (this.match(TokenType.COMMA));
    }

    this.consume(TokenType.RIGHT_PAREN, "Expected ')' to close tuple");
    return { type: "TupleLiteral", values, position: start.position };
  }

  private fallThrough(): StringLiteral | void {
    const token = this.peek();
    const nextToken = this.peek(1);
    const returnable = {
      type: "StringLiteral",
      value: token.value + nextToken.value,
      position: token.position,
    } as StringLiteral;
    if (
      token.type == TokenType.NUMBER &&
      CSS_UNIT_SUFFIXES.has(nextToken.value.toLowerCase())
    ) {
      this.advance();
      this.advance();
      return returnable;
    } else if (isCssException(token.value)) {
      this.advance();
      returnable.value = returnable.value.replaceAll(nextToken.value, "");
      return returnable;
    }
  }

  private parseTupleItem(): LiteralValue {
    const fall = this.fallThrough();
    if (fall) {
      return fall;
    }
    const token = this.peek();
    switch (token.type) {
      case TokenType.STRING:
        return this.parseStringLiteral();
      case TokenType.NUMBER:
        return this.parseNumberLiteral();
      case TokenType.IDENTIFIER:
        return this.parseIdentifierLiteral();
      default:
        throw new ParserError(
          `Invalid value inside tuple: ${token.type}`,
          token.position
        );
    }
  }

  private parseStringLiteral(): StringLiteral {
    const token = this.consume(TokenType.STRING, "Expected string literal");
    return {
      type: "StringLiteral",
      value: token.value,
      position: token.position,
    };
  }

  private parseNumberLiteral(): NumberLiteral | StringLiteral {
    const token = this.consume(TokenType.NUMBER, "Expected numeric literal");
    return {
      type: "NumberLiteral",
      value: Number(token.value),
      raw: token.value,
      position: token.position,
    };
  }

  private parseIdentifierLiteral(): IdentifierLiteral {
    const token = this.consume(
      TokenType.IDENTIFIER,
      "Expected identifier literal"
    );
    return {
      type: "IdentifierLiteral",
      name: token.value,
      position: token.position,
    };
  }

  private validateAttributeValue<T extends AttributeSpec>(
    keyword: Keyword,
    attributeName: string,
    spec: T,
    value: LiteralValue
  ): void {
    const handler = ATTRIBUTE_VALIDATORS[spec.type] as AttributeValidator<T>;
    handler({ keyword, attributeName }, spec, value);
  }

  private createDirectiveId(keyword: string, position: SourcePosition): string {
    const seed = `${keyword}:${position.line}:${position.column}`;
    return createHash("sha256").update(seed).digest("hex").slice(0, 16);
  }

  private verifyAttributes(
    keyword: Keyword,
    attributes: AttributeNode[],
    position: SourcePosition
  ): void {
    const provided = new Set(attributes.map((attribute) => attribute.name));
    for (const spec of keyword.getAttributeSpecs()) {
      if (spec.required && !provided.has(spec.name)) {
        throw new ParserError(
          `Attribute '${spec.name}' is required on <${keyword.name}>`,
          position
        );
      }
    }
  }

  private lookupKeyword(name: string, position: SourcePosition): Keyword {
    const keyword = this.keywordCatalog.get(name);
    if (!keyword) {
      throw new ParserError(`Unknown element <${name}>`, position);
    }
    return keyword;
  }

  private match(type: TokenType): boolean {
    if (this.check(type)) {
      this.advance();
      return true;
    }
    return false;
  }

  private consume(type: TokenType, message: string): Token {
    const token = this.peek();
    if (token.type === type) {
      this.advance();
      return token;
    }

    throw new ParserError(message + " but got " + token.value, token.position);
  }

  private check(type: TokenType): boolean {
    return this.peek().type === type;
  }

  private peek(distance = 0): Token {
    return (
      this.tokens[this.index + distance] ?? this.tokens[this.tokens.length - 1]!
    );
  }

  private advance(): void {
    if (this.index < this.tokens.length) {
      this.index++;
    }
  }
}

export function parse(tokens: Token[]): [AST, SpecialBlock[]] {
  return new Parser(tokens).parse();
}
