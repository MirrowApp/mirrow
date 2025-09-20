import {
  booleanAttr,
  numberAttr,
  produceNumberPair,
  produceScalar,
  stringAttr,
  tupleAttr,
  type TupleItemType,
  type AttributeSpec,
} from "./attribute-spec.js";

const attributeNameMap: Record<string, string> = {
  alignmentBaseline: "alignment-baseline",
  autoReverse: "autoreverse",
  baselineShift: "baseline-shift",
  clipPath: "clip-path",
  clipRule: "clip-rule",
  colorInterpolation: "color-interpolation",
  colorInterpolationFilters: "color-interpolation-filters",
  colorRendering: "color-rendering",
  crossOrigin: "crossorigin",
  dominantBaseline: "dominant-baseline",
  fetchPriority: "fetchpriority",
  fillOpacity: "fill-opacity",
  fillRule: "fill-rule",
  floodColor: "flood-color",
  floodOpacity: "flood-opacity",
  fontFamily: "font-family",
  fontFeatureSettings: "font-feature-settings",
  fontSize: "font-size",
  fontSizeAdjust: "font-size-adjust",
  fontStretch: "font-stretch",
  fontStyle: "font-style",
  fontVariant: "font-variant",
  fontVariationSettings: "font-variation-settings",
  fontWeight: "font-weight",
  glyphOrientationHorizontal: "glyph-orientation-horizontal",
  glyphOrientationVertical: "glyph-orientation-vertical",
  imageRendering: "image-rendering",
  letterSpacing: "letter-spacing",
  lightingColor: "lighting-color",
  markerEnd: "marker-end",
  markerMid: "marker-mid",
  markerStart: "marker-start",
  maskType: "mask-type",
  paintOrder: "paint-order",
  pointerEvents: "pointer-events",
  referrerPolicy: "referrerpolicy",
  shapeRendering: "shape-rendering",
  stopColor: "stop-color",
  stopOpacity: "stop-opacity",
  strokeDasharray: "stroke-dasharray",
  strokeDashoffset: "stroke-dashoffset",
  strokeLinecap: "stroke-linecap",
  strokeLinejoin: "stroke-linejoin",
  strokeMiterlimit: "stroke-miterlimit",
  strokeOpacity: "stroke-opacity",
  strokeWidth: "stroke-width",
  tabIndex: "tabindex",
  textAnchor: "text-anchor",
  textRendering: "text-rendering",
  unicodeBidi: "unicode-bidi",
  vectorEffect: "vector-effect",
  wordSpacing: "word-spacing",
  writingMode: "writing-mode",
  xlinkHref: "xlink:href",
  xmlBase: "xml:base",
  xmlLang: "xml:lang",
  xmlSpace: "xml:space",
  xmlnsXlink: "xmlns:xlink",
};

const applyNameMapping = <T extends AttributeSpec>(spec: T): T => {
  if (spec.type === "tuple" || spec.produce) {
    return spec;
  }
  const target = attributeNameMap[spec.name];
  if (!target) {
    return spec;
  }
  if (spec.type === "number") {
    return {
      ...spec,
      produce: (value: number) => ({ [target]: value }),
    } as T;
  }
  if (spec.type === "string") {
    return {
      ...spec,
      produce: (value: string) => ({ [target]: value }),
    } as T;
  }
  if (spec.type === "boolean") {
    return {
      ...spec,
      produce: (value: boolean) => ({ [target]: value }),
    } as T;
  }
  return spec;
};

const createNumberAttr = (
  name: string,
  opts: Parameters<typeof numberAttr>[1] = {}
) => applyNameMapping(numberAttr(name, opts));

const createStringAttr = (
  name: string,
  opts: Parameters<typeof stringAttr>[1] = {}
) => applyNameMapping(stringAttr(name, opts));

const createBooleanAttr = (
  name: string,
  opts: Parameters<typeof booleanAttr>[1] = {}
) => applyNameMapping(booleanAttr(name, opts));

const createTupleAttr = (
  name: string,
  length: number,
  opts: Parameters<typeof tupleAttr>[2] = {}
) => tupleAttr(name, length, opts ?? {});

const produceNumberTriple =
  (firstKey: string, secondKey: string, thirdKey: string) =>
  (values: Array<number | string>): Record<string, number> => {
    const [first, second, third] = values as [number, number, number];
    return {
      [firstKey]: first,
      [secondKey]: second,
      [thirdKey]: third,
    } as Record<string, number>;
  };

const combineAttributes = (...groups: AttributeSpec[][]): AttributeSpec[] => {
  const normalized = new Map<string, AttributeSpec>();
  for (const group of groups) {
    for (const attribute of group) {
      normalized.set(attribute.name, attribute);
    }
  }
  return Array.from(normalized.values());
};

const coreAttributes = [
  createStringAttr("id"),
  createStringAttr("class"),
  createStringAttr("style"),
  createStringAttr("lang"),
  createStringAttr("xmlBase"),
  createStringAttr("xmlLang"),
  createStringAttr("xmlSpace"),
  createNumberAttr("tabIndex"),
];

const conditionalProcessingAttributes = [
  createStringAttr("requiredExtensions"),
  createStringAttr("requiredFeatures"),
  createStringAttr("systemLanguage"),
];

const referencingAttributes = [
  createStringAttr("href"),
  createStringAttr("xlinkHref"),
];

const paintAttributes = [
  createStringAttr("fill"),
  createNumberAttr("fillOpacity"),
  createStringAttr("fillRule"),
  createStringAttr("stroke"),
  createNumberAttr("strokeWidth"),
  createNumberAttr("strokeOpacity"),
  createStringAttr("strokeLinecap"),
  createStringAttr("strokeLinejoin"),
  createNumberAttr("strokeMiterlimit"),
  createStringAttr("strokeDasharray"),
  createNumberAttr("strokeDashoffset"),
];

const graphicalEffectAttributes = [
  createNumberAttr("opacity"),
  createStringAttr("transform"),
  createStringAttr("filter"),
  createStringAttr("mask"),
  createStringAttr("clipPath"),
  createStringAttr("clipRule"),
  createStringAttr("cursor"),
  createStringAttr("pointerEvents"),
  createStringAttr("display"),
  createStringAttr("visibility"),
  createStringAttr("color"),
  createStringAttr("colorInterpolation"),
  createStringAttr("colorInterpolationFilters"),
  createStringAttr("colorRendering"),
  createStringAttr("imageRendering"),
  createStringAttr("vectorEffect"),
  createStringAttr("paintOrder"),
];

const markerReferenceAttributes = [
  createStringAttr("markerStart"),
  createStringAttr("markerMid"),
  createStringAttr("markerEnd"),
];

const graphicsElementAttributes = combineAttributes(
  coreAttributes,
  conditionalProcessingAttributes,
  paintAttributes,
  graphicalEffectAttributes,
  markerReferenceAttributes
);

const textLayoutAttributes = [
  createStringAttr("textAnchor"),
  createStringAttr("alignmentBaseline"),
  createStringAttr("baselineShift"),
  createStringAttr("dominantBaseline"),
  createStringAttr("letterSpacing"),
  createStringAttr("wordSpacing"),
  createStringAttr("kerning"),
  createStringAttr("direction"),
  createStringAttr("unicodeBidi"),
  createStringAttr("writingMode"),
  createStringAttr("glyphOrientationVertical"),
  createStringAttr("glyphOrientationHorizontal"),
  createStringAttr("textRendering"),
  createStringAttr("fontFamily"),
  createNumberAttr("fontSize"),
  createNumberAttr("fontSizeAdjust"),
  createStringAttr("fontStretch"),
  createStringAttr("fontStyle"),
  createStringAttr("fontVariant"),
  createStringAttr("fontWeight"),
  createStringAttr("fontFeatureSettings"),
  createStringAttr("fontVariationSettings"),
];

const textPositioningAttributes = [
  createTupleAttr("at", 2, { produce: produceNumberPair("x", "y") }),
  createNumberAttr("dx"),
  createNumberAttr("dy"),
  createStringAttr("rotate"),
  createNumberAttr("textLength"),
  createStringAttr("lengthAdjust"),
];

const textContainerAttributes = combineAttributes(
  graphicsElementAttributes,
  textLayoutAttributes
);

const textElementAttributes = combineAttributes(
  textContainerAttributes,
  textPositioningAttributes
);

const viewBoxAttributes = [
  createStringAttr("viewBox"),
  createStringAttr("preserveAspectRatio"),
];

const animationTimingAttributes = [
  createStringAttr("begin"),
  createStringAttr("dur"),
  createStringAttr("end"),
  createStringAttr("min"),
  createStringAttr("max"),
  createStringAttr("restart"),
  createNumberAttr("repeat", { produce: (value) => ({ repeatCount: value }) }),
  createStringAttr("repeatDur"),
  createStringAttr("fill"),
];

const animationAttributeTargeting = [
  createStringAttr("prop", { produce: (value) => ({ attributeName: value }) }),
  createStringAttr("attributeType"),
];

const animationValueAttributes = [
  createStringAttr("calcMode"),
  createStringAttr("values"),
  createStringAttr("keyTimes"),
  createStringAttr("keySplines"),
  createNumberAttr("from"),
  createNumberAttr("to"),
  createNumberAttr("by"),
  createStringAttr("additive"),
  createStringAttr("accumulate"),
];

const animationPlaybackAttributes = [
  createNumberAttr("accelerate"),
  createNumberAttr("decelerate"),
  createBooleanAttr("autoReverse"),
];

const animationCoreAttributes = combineAttributes(
  coreAttributes,
  referencingAttributes,
  animationTimingAttributes,
  animationAttributeTargeting
);

const filterPrimitiveBaseAttributes = combineAttributes(coreAttributes, [
  createTupleAttr("at", 2, { produce: produceNumberPair("x", "y") }),
  createTupleAttr("size", 2, { produce: produceNumberPair("width", "height") }),
  createStringAttr("result"),
]);

const filterPrimitiveInputAttributes = [createStringAttr("in")];

const filterPrimitiveSecondInputAttributes = [createStringAttr("in2")];

const gradientBaseAttributes = combineAttributes(
  coreAttributes,
  conditionalProcessingAttributes,
  referencingAttributes,
  [
    createStringAttr("gradientUnits"),
    createStringAttr("gradientTransform"),
    createStringAttr("spreadMethod"),
  ]
);

const patternBaseAttributes = combineAttributes(
  coreAttributes,
  conditionalProcessingAttributes,
  referencingAttributes,
  [
    createTupleAttr("at", 2, { produce: produceNumberPair("x", "y") }),
    createTupleAttr("size", 2, {
      produce: produceNumberPair("width", "height"),
    }),
    createStringAttr("patternUnits"),
    createStringAttr("patternContentUnits"),
    createStringAttr("patternTransform"),
    createStringAttr("viewBox"),
    createStringAttr("preserveAspectRatio"),
  ]
);

const markerBaseAttributes = combineAttributes(graphicsElementAttributes, [
  createNumberAttr("refX"),
  createNumberAttr("refY"),
  createNumberAttr("markerWidth"),
  createNumberAttr("markerHeight"),
  createStringAttr("markerUnits"),
  createStringAttr("orient"),
  createStringAttr("viewBox"),
  createStringAttr("preserveAspectRatio"),
]);

const maskBaseAttributes = combineAttributes(
  coreAttributes,
  conditionalProcessingAttributes,
  [
    createStringAttr("maskUnits"),
    createStringAttr("maskContentUnits"),
    createStringAttr("maskType"),
    createTupleAttr("at", 2, { produce: produceNumberPair("x", "y") }),
    createTupleAttr("size", 2, {
      produce: produceNumberPair("width", "height"),
    }),
  ]
);

const clipPathBaseAttributes = combineAttributes(
  coreAttributes,
  conditionalProcessingAttributes,
  [createStringAttr("clipPathUnits"), createStringAttr("transform")]
);

const filterContainerAttributes = combineAttributes(
  coreAttributes,
  conditionalProcessingAttributes,
  referencingAttributes,
  [
    createTupleAttr("at", 2, { produce: produceNumberPair("x", "y") }),
    createTupleAttr("size", 2, {
      produce: produceNumberPair("width", "height"),
    }),
    createStringAttr("filterUnits"),
    createStringAttr("primitiveUnits"),
    createNumberAttr("filterRes"),
  ]
);

const componentTransferFunctionAttributes = combineAttributes(coreAttributes, [
  createStringAttr("type"),
  createStringAttr("tableValues"),
  createNumberAttr("slope"),
  createNumberAttr("intercept"),
  createNumberAttr("amplitude"),
  createNumberAttr("exponent"),
  createNumberAttr("offset"),
]);

const pathDataAttribute = stringAttr("data", {
  required: true,
  produce: (value) => ({ d: value }),
});

// Prefer tuple-driven shorthands for paired coordinates and dimensions (e.g. `at` over `cx`/`cy`, `size` over `width`/`height`).
export const svgKeywordAttributes: Record<string, AttributeSpec[]> = {
  a: combineAttributes(graphicsElementAttributes, referencingAttributes, [
    createStringAttr("target"),
    createStringAttr("download"),
    createStringAttr("rel"),
    createStringAttr("ping"),
    createStringAttr("referrerPolicy"),
    createStringAttr("hreflang"),
    createStringAttr("type"),
  ]),
  animate: combineAttributes(
    animationCoreAttributes,
    animationValueAttributes,
    animationPlaybackAttributes
  ),
  animateMotion: combineAttributes(
    animationCoreAttributes,
    animationValueAttributes,
    animationPlaybackAttributes,
    [
      createStringAttr("path"),
      createStringAttr("keyPoints"),
      createStringAttr("rotate"),
    ]
  ),
  animateTransform: combineAttributes(
    animationCoreAttributes,
    animationValueAttributes,
    animationPlaybackAttributes,
    [createStringAttr("type")]
  ),
  circle: combineAttributes(graphicsElementAttributes, [
    createTupleAttr("at", 2, { produce: produceNumberPair("cx", "cy") }),
    createNumberAttr("r", {
      required: true,
      produce: produceScalar("r"),
    }),
    createNumberAttr("pathLength"),
    createBooleanAttr("filled"),
  ]),
  clipPath: clipPathBaseAttributes,
  defs: combineAttributes(coreAttributes, conditionalProcessingAttributes),
  desc: coreAttributes,
  discard: combineAttributes(coreAttributes, referencingAttributes, [
    createStringAttr("begin"),
  ]),
  ellipse: combineAttributes(graphicsElementAttributes, [
    createTupleAttr("at", 2, { produce: produceNumberPair("cx", "cy") }),
    createTupleAttr("radius", 2, {
      required: true,
      produce: produceNumberPair("rx", "ry"),
    }),
    createNumberAttr("pathLength"),
  ]),
  feBlend: combineAttributes(
    filterPrimitiveBaseAttributes,
    filterPrimitiveInputAttributes,
    filterPrimitiveSecondInputAttributes,
    [createStringAttr("mode")]
  ),
  feColorMatrix: combineAttributes(
    filterPrimitiveBaseAttributes,
    filterPrimitiveInputAttributes,
    [createStringAttr("type"), createStringAttr("values")]
  ),
  feComponentTransfer: combineAttributes(
    filterPrimitiveBaseAttributes,
    filterPrimitiveInputAttributes
  ),
  feComposite: combineAttributes(
    filterPrimitiveBaseAttributes,
    filterPrimitiveInputAttributes,
    filterPrimitiveSecondInputAttributes,
    [
      createStringAttr("operator"),
      createNumberAttr("k1"),
      createNumberAttr("k2"),
      createNumberAttr("k3"),
      createNumberAttr("k4"),
    ]
  ),
  feConvolveMatrix: combineAttributes(
    filterPrimitiveBaseAttributes,
    filterPrimitiveInputAttributes,
    [
      createStringAttr("order"),
      createStringAttr("kernelMatrix"),
      createNumberAttr("divisor"),
      createNumberAttr("bias"),
      createNumberAttr("targetX"),
      createNumberAttr("targetY"),
      createStringAttr("edgeMode"),
      createStringAttr("kernelUnitLength"),
      createBooleanAttr("preserveAlpha"),
    ]
  ),
  feDiffuseLighting: combineAttributes(
    filterPrimitiveBaseAttributes,
    filterPrimitiveInputAttributes,
    [
      createNumberAttr("surfaceScale"),
      createNumberAttr("diffuseConstant"),
      createStringAttr("kernelUnitLength"),
      createStringAttr("lightingColor"),
    ]
  ),
  feDisplacementMap: combineAttributes(
    filterPrimitiveBaseAttributes,
    filterPrimitiveInputAttributes,
    filterPrimitiveSecondInputAttributes,
    [
      createNumberAttr("scale"),
      createStringAttr("xChannelSelector"),
      createStringAttr("yChannelSelector"),
    ]
  ),
  feDistantLight: combineAttributes(coreAttributes, [
    createNumberAttr("azimuth"),
    createNumberAttr("elevation"),
  ]),
  feDropShadow: combineAttributes(
    filterPrimitiveBaseAttributes,
    filterPrimitiveInputAttributes,
    [
      createNumberAttr("dx"),
      createNumberAttr("dy"),
      createStringAttr("stdDeviation"),
      createStringAttr("floodColor"),
      createNumberAttr("floodOpacity"),
    ]
  ),
  feFlood: combineAttributes(filterPrimitiveBaseAttributes, [
    createStringAttr("floodColor"),
    createNumberAttr("floodOpacity"),
  ]),
  feFuncA: componentTransferFunctionAttributes,
  feFuncB: componentTransferFunctionAttributes,
  feFuncG: componentTransferFunctionAttributes,
  feFuncR: componentTransferFunctionAttributes,
  feGaussianBlur: combineAttributes(
    filterPrimitiveBaseAttributes,
    filterPrimitiveInputAttributes,
    [createStringAttr("stdDeviation"), createStringAttr("edgeMode")]
  ),
  feImage: combineAttributes(
    filterPrimitiveBaseAttributes,
    referencingAttributes,
    [createStringAttr("preserveAspectRatio"), createStringAttr("crossOrigin")]
  ),
  feMerge: filterPrimitiveBaseAttributes,
  feMergeNode: combineAttributes(
    coreAttributes,
    filterPrimitiveInputAttributes
  ),
  feMorphology: combineAttributes(
    filterPrimitiveBaseAttributes,
    filterPrimitiveInputAttributes,
    [createStringAttr("radius"), createStringAttr("operator")]
  ),
  feOffset: combineAttributes(
    filterPrimitiveBaseAttributes,
    filterPrimitiveInputAttributes,
    [createNumberAttr("dx"), createNumberAttr("dy")]
  ),
  fePointLight: combineAttributes(coreAttributes, [
    createTupleAttr("at", 3, {
      produce: produceNumberTriple("x", "y", "z"),
    }),
  ]),
  feSpecularLighting: combineAttributes(
    filterPrimitiveBaseAttributes,
    filterPrimitiveInputAttributes,
    [
      createNumberAttr("surfaceScale"),
      createNumberAttr("specularConstant"),
      createNumberAttr("specularExponent"),
      createStringAttr("kernelUnitLength"),
      createStringAttr("lightingColor"),
    ]
  ),
  feSpotLight: combineAttributes(coreAttributes, [
    createTupleAttr("at", 3, {
      produce: produceNumberTriple("x", "y", "z"),
    }),
    createTupleAttr("pointsAt", 3, {
      produce: produceNumberTriple("pointsAtX", "pointsAtY", "pointsAtZ"),
    }),
    createNumberAttr("specularExponent"),
    createNumberAttr("limitingConeAngle"),
  ]),
  feTile: combineAttributes(
    filterPrimitiveBaseAttributes,
    filterPrimitiveInputAttributes
  ),
  feTurbulence: combineAttributes(filterPrimitiveBaseAttributes, [
    createStringAttr("baseFrequency"),
    createNumberAttr("numOctaves"),
    createNumberAttr("seed"),
    createStringAttr("stitchTiles"),
    createStringAttr("type"),
  ]),
  filter: filterContainerAttributes,
  foreignObject: combineAttributes(graphicsElementAttributes, [
    createTupleAttr("at", 2, { produce: produceNumberPair("x", "y") }),
    createTupleAttr("size", 2, {
      produce: produceNumberPair("width", "height"),
    }),
  ]),
  g: graphicsElementAttributes,
  image: combineAttributes(graphicsElementAttributes, referencingAttributes, [
    createTupleAttr("at", 2, { produce: produceNumberPair("x", "y") }),
    createTupleAttr("size", 2, {
      produce: produceNumberPair("width", "height"),
    }),
    createStringAttr("preserveAspectRatio"),
    createStringAttr("crossOrigin"),
    createStringAttr("referrerPolicy"),
  ]),
  line: combineAttributes(graphicsElementAttributes, [
    createTupleAttr("from", 2, {
      required: true,
      produce: produceNumberPair("x1", "y1"),
    }),
    createTupleAttr("to", 2, {
      required: true,
      produce: produceNumberPair("x2", "y2"),
    }),
    createNumberAttr("pathLength"),
    createStringAttr("stroke", { required: true }),
  ]),
  linearGradient: combineAttributes(gradientBaseAttributes, [
    createTupleAttr("from", 2, {
      produce: produceNumberPair("x1", "y1"),
    }),
    createTupleAttr("to", 2, {
      produce: produceNumberPair("x2", "y2"),
    }),
  ]),
  marker: markerBaseAttributes,
  mask: maskBaseAttributes,
  metadata: coreAttributes,
  mpath: combineAttributes(coreAttributes, referencingAttributes),
  path: combineAttributes(graphicsElementAttributes, [
    pathDataAttribute,
    createStringAttr("d"),
    createNumberAttr("pathLength"),
  ]),
  pattern: patternBaseAttributes,
  polygon: combineAttributes(graphicsElementAttributes, [
    createStringAttr("points", { required: true }),
    createNumberAttr("pathLength"),
  ]),
  polyline: combineAttributes(graphicsElementAttributes, [
    createStringAttr("points", { required: true }),
    createNumberAttr("pathLength"),
    createStringAttr("stroke", { required: true }),
  ]),
  radialGradient: combineAttributes(gradientBaseAttributes, [
    createTupleAttr("at", 2, { produce: produceNumberPair("cx", "cy") }),
    createNumberAttr("r"),
    createTupleAttr("focus", 2, { produce: produceNumberPair("fx", "fy") }),
    createNumberAttr("fr"),
  ]),
  rect: combineAttributes(graphicsElementAttributes, [
    createTupleAttr("at", 2, { produce: produceNumberPair("x", "y") }),
    createTupleAttr("size", 2, {
      required: true,
      produce: produceNumberPair("width", "height"),
    }),
    createTupleAttr("radius", 2, {
      produce: produceNumberPair("rx", "ry"),
    }),
    createNumberAttr("pathLength"),
  ]),
  script: combineAttributes(coreAttributes, referencingAttributes, [
    createStringAttr("type"),
    createStringAttr("crossOrigin"),
    createStringAttr("referrerPolicy"),
  ]),
  set: combineAttributes(animationCoreAttributes, [createStringAttr("to")]),
  stop: combineAttributes(coreAttributes, [
    createNumberAttr("offset", { required: true }),
    createStringAttr("stopColor"),
    createNumberAttr("stopOpacity"),
  ]),
  style: combineAttributes(coreAttributes, [
    createStringAttr("type"),
    createStringAttr("media"),
    createStringAttr("title"),
    createStringAttr("nonce"),
  ]),
  switch: graphicsElementAttributes,
  svg: combineAttributes(graphicsElementAttributes, [
    createTupleAttr("size", 2, {
      produce: produceNumberPair("width", "height"),
    }),
    createTupleAttr("box", 4, {
      produce: ([minX, minY, width, height]) => ({
        viewBox: `${minX} ${minY} ${width} ${height}`,
      }),
    }),
    createTupleAttr("preserve", 2, {
      itemTypes: ["identifier", "identifier"] as TupleItemType[],
      produce: ([align, meet]) => ({
        preserveAspectRatio: `${align} ${meet}`,
      }),
    }),
    createTupleAttr("at", 2, { produce: produceNumberPair("x", "y") }),
    createStringAttr("xmlns"),
    createStringAttr("xmlnsXlink"),
    createStringAttr("version"),
    createStringAttr("baseProfile"),
    createStringAttr("contentScriptType"),
    createStringAttr("contentStyleType"),
  ]),
  symbol: combineAttributes(graphicsElementAttributes, viewBoxAttributes, [
    createTupleAttr("ref", 2, { produce: produceNumberPair("refX", "refY") }),
  ]),
  text: textElementAttributes,
  textPath: combineAttributes(textContainerAttributes, referencingAttributes, [
    createStringAttr("startOffset"),
    createStringAttr("method"),
    createStringAttr("spacing"),
    createStringAttr("side"),
  ]),
  title: coreAttributes,
  tspan: textElementAttributes,
  use: combineAttributes(graphicsElementAttributes, referencingAttributes, [
    createTupleAttr("at", 2, { produce: produceNumberPair("x", "y") }),
    createTupleAttr("size", 2, {
      produce: produceNumberPair("width", "height"),
    }),
  ]),
  view: combineAttributes(coreAttributes, [
    createStringAttr("viewBox"),
    createStringAttr("preserveAspectRatio"),
    createStringAttr("viewTarget"),
    createStringAttr("zoomAndPan"),
  ]),
};
