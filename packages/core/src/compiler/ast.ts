export interface SourcePosition {
  line: number;
  column: number;
}

export interface NumberLiteral {
  type: "NumberLiteral";
  value: number;
  raw: string;
  position: SourcePosition;
}

export interface StringLiteral {
  type: "StringLiteral";
  value: string;
  position: SourcePosition;
}

export interface IdentifierLiteral {
  type: "IdentifierLiteral";
  name: string;
  position: SourcePosition;
}

export interface TupleLiteral {
  type: "TupleLiteral";
  values: LiteralValue[];
  position: SourcePosition;
}

export type LiteralValue =
  | NumberLiteral
  | StringLiteral
  | IdentifierLiteral
  | TupleLiteral;

export interface CssStateDirective {
  type: "CssState";
  name: string;
  dataId: string;
  block: string;
  position: SourcePosition;
}

export interface JsEventDirective {
  type: "JsEvent";
  name: string;
  dataId: string;
  block: string;
  position: SourcePosition;
}

export interface AttributeNode {
  type: "Attribute";
  name: string;
  value: LiteralValue;
  position: SourcePosition;
}

export interface TextNode {
  type: "Text";
  value: string;
  position: SourcePosition;
}

export interface ElementNode {
  type: "Element";
  name: string;
  attributes: AttributeNode[];
  children: Array<ElementNode | TextNode>;
  cssStates: Set<CssStateDirective>;
  jsEvents: Set<JsEventDirective>;
  dataId: string | null;
  position: SourcePosition;
}

export interface RootNode {
  type: "Root";
  children: ElementNode[];
}

export type SpecialBlock = {
  type: "SpecialBlock";
  style: "style" | "script";
  content: string;
  position: SourcePosition;
};

export type AST = RootNode;
