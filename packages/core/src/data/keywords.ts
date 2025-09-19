import type { AttributeSpec } from "./attribute-spec.js";
export type {
  AttrType,
  CompileResult,
  AttributeSpec,
  NumberAttributeSpec,
  StringAttributeSpec,
  BooleanAttributeSpec,
  TupleAttributeSpec,
} from "./attribute-spec.js";
export {
  numberAttr,
  stringAttr,
  booleanAttr,
  tupleAttr,
  produceNumberPair,
  produceScalar,
} from "./attribute-spec.js";
import { svgKeywordAttributes } from "./svg-attributes.js";

type ChildSpec = Keyword | string;

const normalizeChildName = (child: ChildSpec): string =>
  typeof child === "string" ? child : child.name;

export class Keyword {
  public name: string;
  private attributes: AttributeSpec[];
  private attributeMap: Map<string, AttributeSpec>;
  private allowedChildren: Set<string>;
  private allowsAnyChild: boolean;
  private allowsTextContent: boolean;

  constructor(
    name: string,
    attributes: AttributeSpec[] = [],
    allowedChildren: ChildSpec[] = [],
    options: { allowAnyChild?: boolean; allowTextContent?: boolean } = {}
  ) {
    this.name = name;
    this.attributes = attributes;
    this.attributeMap = new Map(
      attributes.map((attribute) => [attribute.name, attribute])
    );
    this.allowedChildren = new Set(
      allowedChildren.map((child) => normalizeChildName(child))
    );
    this.allowsAnyChild = Boolean(options.allowAnyChild);
    this.allowsTextContent = Boolean(options.allowTextContent);
  }

  hasAttribute(attributeName: string): boolean {
    return this.attributeMap.has(attributeName);
  }

  getAttributeSpec(name: string): AttributeSpec | undefined {
    return this.attributeMap.get(name);
  }

  getAttributeSpecs(): AttributeSpec[] {
    return this.attributes;
  }

  hasAllowedChild(child: ChildSpec): boolean {
    return (
      this.allowsAnyChild || this.allowedChildren.has(normalizeChildName(child))
    );
  }

  canContainText(): boolean {
    return this.allowsTextContent;
  }
}

const svgKeywords = [
  "a",
  "animate",
  "animateMotion",
  "animateTransform",
  "circle",
  "clipPath",
  "defs",
  "desc",
  "discard",
  "ellipse",
  "feBlend",
  "feColorMatrix",
  "feComponentTransfer",
  "feComposite",
  "feConvolveMatrix",
  "feDiffuseLighting",
  "feDisplacementMap",
  "feDistantLight",
  "feDropShadow",
  "feFlood",
  "feFuncA",
  "feFuncB",
  "feFuncG",
  "feFuncR",
  "feGaussianBlur",
  "feImage",
  "feMerge",
  "feMergeNode",
  "feMorphology",
  "feOffset",
  "fePointLight",
  "feSpecularLighting",
  "feSpotLight",
  "feTile",
  "feTurbulence",
  "filter",
  "foreignObject",
  "g",
  "image",
  "line",
  "linearGradient",
  "marker",
  "mask",
  "metadata",
  "mpath",
  "path",
  "pattern",
  "polygon",
  "polyline",
  "radialGradient",
  "rect",
  "script",
  "set",
  "stop",
  "style",
  "switch",
  "svg",
  "symbol",
  "text",
  "textPath",
  "title",
  "tspan",
  "use",
  "view",
];

const combineChildren = (...groups: string[][]): string[] =>
  Array.from(new Set(groups.flat()));

const animationElements = [
  "animate",
  "animateMotion",
  "animateTransform",
  "set",
  "discard",
];

const descriptiveElements = ["desc", "metadata", "title"];

const geometryElements = [
  "circle",
  "ellipse",
  "line",
  "path",
  "polygon",
  "polyline",
  "rect",
];

const textContainerElements = ["text"];
const textSpanElements = ["tspan", "textPath"];
const textContentElements = new Set([
  "text",
  "tspan",
  "textPath",
]);

const filterPrimitiveElements = [
  "feBlend",
  "feColorMatrix",
  "feComponentTransfer",
  "feComposite",
  "feConvolveMatrix",
  "feDiffuseLighting",
  "feDisplacementMap",
  "feDropShadow",
  "feFlood",
  "feGaussianBlur",
  "feImage",
  "feMerge",
  "feMorphology",
  "feOffset",
  "feSpecularLighting",
  "feTile",
  "feTurbulence",
];

const componentTransferFunctions = ["feFuncA", "feFuncB", "feFuncG", "feFuncR"];

const lightSourceElements = ["feDistantLight", "fePointLight", "feSpotLight"];

const svgKeywordChildren: Record<
  string,
  { allowAnyChild?: boolean; children?: string[] }
> = {
  a: {
    children: combineChildren(
      animationElements,
      descriptiveElements,
      geometryElements,
      textContainerElements,
      textSpanElements,
      ["image", "use", "g", "svg", "switch", "foreignObject"]
    ),
  },
  animateMotion: { children: ["mpath"] },
  circle: {
    children: combineChildren(animationElements, descriptiveElements),
  },
  clipPath: {
    children: combineChildren(
      animationElements,
      descriptiveElements,
      geometryElements,
      textContainerElements,
      ["use", "image", "g"]
    ),
  },
  defs: {
    children: combineChildren(
      animationElements,
      descriptiveElements,
      geometryElements,
      textContainerElements,
      [
        "style",
        "script",
        "image",
        "use",
        "a",
        "svg",
        "symbol",
        "g",
        "clipPath",
        "mask",
        "pattern",
        "marker",
        "linearGradient",
        "radialGradient",
        "filter",
        "foreignObject",
      ]
    ),
  },
  ellipse: {
    children: combineChildren(animationElements, descriptiveElements),
  },
  feBlend: {
    children: combineChildren(animationElements, descriptiveElements),
  },
  feColorMatrix: {
    children: combineChildren(animationElements, descriptiveElements),
  },
  feComponentTransfer: {
    children: combineChildren(
      animationElements,
      descriptiveElements,
      componentTransferFunctions
    ),
  },
  feComposite: {
    children: combineChildren(animationElements, descriptiveElements),
  },
  feConvolveMatrix: {
    children: combineChildren(animationElements, descriptiveElements),
  },
  feDiffuseLighting: {
    children: combineChildren(
      animationElements,
      descriptiveElements,
      lightSourceElements
    ),
  },
  feDisplacementMap: {
    children: combineChildren(animationElements, descriptiveElements),
  },
  feDropShadow: {
    children: combineChildren(animationElements, descriptiveElements),
  },
  feFlood: {
    children: combineChildren(animationElements, descriptiveElements),
  },
  feFuncA: { children: [] },
  feFuncB: { children: [] },
  feFuncG: { children: [] },
  feFuncR: { children: [] },
  feGaussianBlur: {
    children: combineChildren(animationElements, descriptiveElements),
  },
  feImage: {
    children: combineChildren(animationElements, descriptiveElements),
  },
  feMerge: {
    children: combineChildren(animationElements, descriptiveElements, [
      "feMergeNode",
    ]),
  },
  feMergeNode: { children: [] },
  feMorphology: {
    children: combineChildren(animationElements, descriptiveElements),
  },
  feOffset: {
    children: combineChildren(animationElements, descriptiveElements),
  },
  fePointLight: { children: [] },
  feSpecularLighting: {
    children: combineChildren(
      animationElements,
      descriptiveElements,
      lightSourceElements
    ),
  },
  feSpotLight: { children: [] },
  feTile: {
    children: combineChildren(animationElements, descriptiveElements),
  },
  feTurbulence: {
    children: combineChildren(animationElements, descriptiveElements),
  },
  filter: {
    children: combineChildren(
      animationElements,
      descriptiveElements,
      filterPrimitiveElements
    ),
  },
  foreignObject: { allowAnyChild: true },
  g: {
    children: combineChildren(
      animationElements,
      descriptiveElements,
      geometryElements,
      textContainerElements,
      ["image", "use", "g", "svg", "switch", "a", "foreignObject"]
    ),
  },
  image: {
    children: combineChildren(animationElements, descriptiveElements),
  },
  line: {
    children: combineChildren(animationElements, descriptiveElements),
  },
  linearGradient: {
    children: combineChildren(animationElements, descriptiveElements, ["stop"]),
  },
  marker: {
    children: combineChildren(
      animationElements,
      descriptiveElements,
      geometryElements,
      textContainerElements,
      ["path", "image", "use", "g", "svg", "a"]
    ),
  },
  mask: {
    children: combineChildren(
      animationElements,
      descriptiveElements,
      geometryElements,
      textContainerElements,
      ["image", "use", "g", "svg", "a", "foreignObject"]
    ),
  },
  metadata: { allowAnyChild: true },
  path: {
    children: combineChildren(animationElements, descriptiveElements),
  },
  pattern: {
    children: combineChildren(
      animationElements,
      descriptiveElements,
      geometryElements,
      textContainerElements,
      ["image", "use", "g", "svg", "a", "foreignObject"]
    ),
  },
  polygon: {
    children: combineChildren(animationElements, descriptiveElements),
  },
  polyline: {
    children: combineChildren(animationElements, descriptiveElements),
  },
  radialGradient: {
    children: combineChildren(animationElements, descriptiveElements, ["stop"]),
  },
  rect: {
    children: combineChildren(animationElements, descriptiveElements),
  },
  stop: {
    children: combineChildren(animationElements, descriptiveElements),
  },
  switch: {
    children: combineChildren(
      animationElements,
      descriptiveElements,
      geometryElements,
      textContainerElements,
      ["image", "use", "g", "svg", "a", "foreignObject"]
    ),
  },
  svg: {
    children: combineChildren(
      animationElements,
      descriptiveElements,
      geometryElements,
      textContainerElements,
      [
        "image",
        "use",
        "g",
        "svg",
        "a",
        "symbol",
        "marker",
        "mask",
        "pattern",
        "clipPath",
        "defs",
        "linearGradient",
        "radialGradient",
        "filter",
        "foreignObject",
        "style",
        "script",
        "switch",
        "view",
      ]
    ),
  },
  symbol: {
    children: combineChildren(
      animationElements,
      descriptiveElements,
      geometryElements,
      textContainerElements,
      ["image", "use", "g", "svg", "a", "view", "defs"]
    ),
  },
  text: {
    children: combineChildren(animationElements, descriptiveElements, [
      "a",
      "tspan",
      "textPath",
    ]),
  },
  textPath: {
    children: combineChildren(animationElements, descriptiveElements, [
      "a",
      "tspan",
    ]),
  },
  tspan: {
    children: combineChildren(animationElements, descriptiveElements, [
      "a",
      "tspan",
    ]),
  },
  use: {
    children: combineChildren(animationElements, descriptiveElements),
  },
};

const svgKeywordStore: Map<string, Keyword> = new Map();

export function getSvgKeywords(): Map<string, Keyword> {
  if (svgKeywordStore.size === 0) {
    for (const keywordName of svgKeywords) {
      const { allowAnyChild = false, children = [] } =
        svgKeywordChildren[keywordName] ?? {};
      const attributes = svgKeywordAttributes[keywordName] ?? [];
      const allowTextContent = textContentElements.has(keywordName);

      svgKeywordStore.set(
        keywordName,
        new Keyword(keywordName, attributes, children, {
          allowAnyChild,
          allowTextContent,
        })
      );
    }
  }
  return svgKeywordStore;
}
