import {
  getSvgKeywords,
  type AttributeSpec,
  type Keyword,
} from "../data/keywords.js";
import type {
  AST,
  AttributeNode,
  ElementNode,
  LiteralValue,
  SpecialBlock,
  TextNode,
} from "./ast.js";

interface CssDirectiveEntry {
  state: string;
  block: string;
}

interface JsDirectiveEntry {
  event: string;
  block: string;
}

interface CompileContext {
  keywords: Map<string, Keyword>;
  indent: string;
  cssDirectives: Map<string, CssDirectiveEntry[]>;
  jsDirectives: Map<string, JsDirectiveEntry[]>;
}

const DEFAULT_INDENT = "  ";

export function compileAst(ast: AST, blocks: SpecialBlock[]): string {
  const context: CompileContext = {
    keywords: getSvgKeywords(),
    indent: DEFAULT_INDENT,
    cssDirectives: new Map(),
    jsDirectives: new Map(),
  };

  const markup = ast.children
    .map((child) => compileElement(child, context, 0))
    .join("\n");

  const cssContent = renderCssDirectives(context.cssDirectives);
  const jsContent = renderJsDirectives(context.jsDirectives);

  const sections = [markup];
  if (cssContent) {
    sections.push(`<style>\n${cssContent}\n</style>`);
  }
  if (jsContent) {
    sections.push(`<script>\n${jsContent}\n</script>`);
  }
  for (const block of blocks) {
    sections.push(`<${block.style}>\n${block.content}\n</${block.style}>`);
  }

  return sections.filter((section) => section.length > 0).join("\n");
}

function compileElement(
  node: ElementNode,
  context: CompileContext,
  depth: number
): string {
  const keyword = context.keywords.get(node.name);
  if (!keyword) {
    throw new Error(`Unknown SVG element: ${node.name}`);
  }

  const indent = context.indent.repeat(depth);
  const attributes = renderAttributes(node, keyword);
  if (node.dataId) {
    attributes.unshift(
      `data-identifier="${escapeAttributeValue(node.dataId)}"`
    );
  }
  const attributesSegment =
    attributes.length > 0 ? ` ${attributes.join(" ")}` : "";

  collectDirectives(node, context);

  if (node.children.length === 0) {
    return `${indent}<${node.name}${attributesSegment} />`;
  }

  const children = node.children
    .map((child) => compileChild(child, context, depth + 1))
    .join("\n");

  return `${indent}<${node.name}${attributesSegment}>\n${children}\n${indent}</${node.name}>`;
}

function compileChild(
  child: ElementNode | TextNode,
  context: CompileContext,
  depth: number
): string {
  if (child.type === "Text") {
    const indent = context.indent.repeat(depth);
    return `${indent}${escapeTextContent(child.value)}`;
  }

  return compileElement(child, context, depth);
}

function renderAttributes(node: ElementNode, keyword: Keyword): string[] {
  const rendered: string[] = [];

  for (const attributeNode of node.attributes) {
    const spec = keyword.getAttributeSpec(attributeNode.name);
    if (!spec) {
      continue;
    }

    const value = createAttributeValue(attributeNode, spec);
    const produced = spec.produce
      ? spec.produce(value as never)
      : { [spec.name]: value };

    for (const [name, producedValue] of Object.entries(produced)) {
      if (producedValue === undefined || producedValue === null) {
        continue;
      }
      rendered.push(`${name}="${escapeAttributeValue(producedValue)}"`);
    }
  }

  return rendered;
}

function collectDirectives(node: ElementNode, context: CompileContext): void {
  if (!node.dataId) {
    return;
  }

  if (node.cssStates.size > 0) {
    const cssEntries = context.cssDirectives.get(node.dataId) ?? [];
    for (const directive of node.cssStates) {
      cssEntries.push({
        state: directive.name,
        block: extractBlockContent(directive.block),
      });
    }
    context.cssDirectives.set(node.dataId, cssEntries);
  }

  if (node.jsEvents.size > 0) {
    const jsEntries = context.jsDirectives.get(node.dataId) ?? [];
    for (const directive of node.jsEvents) {
      jsEntries.push({
        event: directive.name,
        block: extractBlockContent(directive.block),
      });
    }
    context.jsDirectives.set(node.dataId, jsEntries);
  }
}

function createAttributeValue(
  attributeNode: AttributeNode,
  spec: AttributeSpec
): unknown {
  const value = attributeNode.value;

  switch (spec.type) {
    case "number":
      return normalizeNumberLike(value);
    case "string":
      return normalizeStringLike(value);
    case "boolean":
      return normalizeBoolean(value);
    case "tuple":
      return normalizeTuple(value);
    default:
      return undefined;
  }
}

function normalizeNumberLike(value: LiteralValue): number | string {
  if (value.type === "NumberLiteral") {
    return value.value;
  }
  if (value.type === "StringLiteral") {
    return value.value;
  }
  if (value.type === "IdentifierLiteral") {
    return value.name;
  }
  throw new Error("Expected numeric value");
}

function normalizeStringLike(value: LiteralValue): string {
  if (value.type === "StringLiteral") {
    return value.value;
  }
  if (value.type === "NumberLiteral") {
    return value.raw;
  }
  if (value.type === "IdentifierLiteral") {
    return value.name;
  }
  throw new Error("Expected string value");
}

function normalizeBoolean(value: LiteralValue): boolean {
  if (value.type !== "IdentifierLiteral") {
    throw new Error("Expected boolean identifier");
  }
  const identifier = value.name.toLowerCase();
  return identifier === "true";
}

function normalizeTuple(value: LiteralValue): Array<number | string> {
  if (value.type !== "TupleLiteral") {
    throw new Error("Expected tuple value");
  }

  return value.values.map((entry) => {
    if (entry.type === "NumberLiteral") {
      return entry.value;
    }
    if (entry.type === "StringLiteral") {
      return entry.value;
    }
    if (entry.type === "IdentifierLiteral") {
      return entry.name;
    }
    throw new Error("Unsupported value inside tuple");
  });
}

function escapeAttributeValue(value: unknown): string {
  const stringValue = String(value);
  return stringValue
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeTextContent(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function extractBlockContent(block: string): string {
  const trimmed = block.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function indentBlock(content: string, indent: string): string {
  const normalized = content.trim();
  if (normalized.length === 0) {
    return "";
  }
  return normalized
    .split(/\r?\n/)
    .map((line) => `${indent}${line}`)
    .join("\n");
}

function renderCssDirectives(
  cssDirectives: Map<string, CssDirectiveEntry[]>
): string | null {
  if (cssDirectives.size === 0) {
    return null;
  }

  const rules: string[] = [];
  for (const [dataId, entries] of cssDirectives) {
    for (const entry of entries) {
      const body = indentBlock(entry.block, DEFAULT_INDENT);
      if (body.length === 0) {
        rules.push(`[data-identifier="${dataId}"]:${entry.state} {}`);
        continue;
      }
      rules.push(`[data-identifier="${dataId}"]:${entry.state} {`);
      rules.push(body);
      rules.push("}");
    }
  }

  return rules.join("\n");
}

function renderJsDirectives(
  jsDirectives: Map<string, JsDirectiveEntry[]>
): string | null {
  if (jsDirectives.size === 0) {
    return null;
  }

  const groups: string[] = [];
  for (const [dataId, entries] of jsDirectives) {
    const lines: string[] = [];
    lines.push("(() => {");
    lines.push(
      `${DEFAULT_INDENT}const element = document.querySelector('[data-identifier="${escapeForJsString(
        dataId
      )}"]');`
    );
    lines.push(`${DEFAULT_INDENT}if (!element) return;`);
    lines.push(
      `${DEFAULT_INDENT}const identifier = element.getAttribute("data-identifier");`
    );
    for (const entry of entries) {
      lines.push(
        `${DEFAULT_INDENT}element.addEventListener("${entry.event}", (event) => {`
      );
      const body = indentBlock(entry.block, DEFAULT_INDENT.repeat(2));
      if (body.length > 0) {
        lines.push(body);
      }
      lines.push(`${DEFAULT_INDENT}});`);
    }
    lines.push("})();");
    groups.push(lines.join("\n"));
  }

  return groups.join("\n");
}

function escapeForJsString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
