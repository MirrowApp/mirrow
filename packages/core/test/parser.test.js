import test from "node:test";
import assert from "node:assert/strict";
import { tokenize, parse } from "../dist/index.js";

const parseFromCode = (code) => {
  const [root] = parse(tokenize(code));
  return root;
};

test("rect accepts declared tuple attributes", () => {
  const ast = parseFromCode(
    `rect { at: (12, 24) size: (120, 80) strokeWidth: 2 stroke: "#333" }`
  );
  const rect = ast.children[0];
  assert.equal(rect.name, "rect");
  assert.equal(rect.attributes.length, 4);
  const names = rect.attributes.map((attr) => attr.name).sort();
  assert.deepEqual(names, ["at", "size", "stroke", "strokeWidth"]);
});

test("rect rejects undeclared attribute", () => {
  assert.throws(
    () => parseFromCode(`rect { foo: 1 size: (20, 10) }`),
    /Attribute 'foo' is not allowed on <rect>/
  );
});

test("rect enforces required attributes", () => {
  assert.throws(
    () => parseFromCode(`rect { at: (0, 0) }`),
    /Attribute 'size' is required on <rect>/
  );
});

test("circle supports at and radius shorthands", () => {
  const ast = parseFromCode(
    `circle { at: (50, 60) r: 10 fill: "red" strokeWidth: 3 filled: true }`
  );
  const circle = ast.children[0];
  assert.equal(circle.name, "circle");
  const names = circle.attributes.map((attr) => attr.name).sort();
  assert.deepEqual(names, ["at", "fill", "filled", "r", "strokeWidth"]);
});

test("circle enforces radius presence", () => {
  assert.throws(
    () => parseFromCode(`circle { at: (0, 0) }`),
    /Attribute 'r' is required on <circle>/
  );
});

test("circle rejects non-boolean filled value", () => {
  assert.throws(
    () => parseFromCode(`circle { r: 10 filled: "yes" }`),
    /expects 'true' or 'false'/
  );
});

test("line uses from/to tuple attributes", () => {
  const ast = parseFromCode(
    `line { from: (0, 0) to: (100, 200) stroke: "#fff" strokeWidth: 1 }`
  );
  const line = ast.children[0];
  assert.equal(line.name, "line");
  const names = line.attributes.map((attr) => attr.name).sort();
  assert.deepEqual(names, ["from", "stroke", "strokeWidth", "to"]);
});

test("path requires data attribute", () => {
  assert.throws(
    () => parseFromCode(`path { stroke: "#000" }`),
    /Attribute 'data' is required on <path>/
  );
});

test("svg accepts preserve tuple of identifiers", () => {
  const ast = parseFromCode(
    `svg { preserve: (xMidYMid, meet) size: (100, 100) }`
  );
  const svg = ast.children[0];
  assert.equal(svg.name, "svg");
  const names = svg.attributes.map((attr) => attr.name).sort();
  assert.deepEqual(names, ["preserve", "size"]);
});

test("directives share element id", () => {
  const ast = parseFromCode(`svg { @hover {} on:click {} }`);
  const svg = ast.children[0];
  assert.equal(svg.cssStates.size, 1);
  assert.equal(svg.jsEvents.size, 1);
  const cssId = Array.from(svg.cssStates)[0].dataId;
  const jsId = Array.from(svg.jsEvents)[0].dataId;
  assert.ok(svg.dataId, "element should expose shared id");
  assert.equal(cssId, jsId);
  assert.equal(svg.dataId, cssId);
});

test("image uses at/size tuples", () => {
  const ast = parseFromCode(
    `image { at: (10, 20) size: (200, 100) href: "asset.png" }`
  );
  const image = ast.children[0];
  assert.equal(image.name, "image");
  const names = image.attributes.map((attr) => attr.name).sort();
  assert.deepEqual(names, ["at", "href", "size"]);
});

test("foreignObject rejects legacy x attribute", () => {
  assert.throws(
    () => parseFromCode(`foreignObject { x: 10 size: (120, 60) }`),
    /Attribute 'x' is not allowed on <foreignObject>/
  );
});

test("filter accepts at/size tuples", () => {
  const ast = parseFromCode(`filter { at: (0, 0) size: (300, 150) }`);
  const filterNode = ast.children[0];
  assert.equal(filterNode.name, "filter");
  const names = filterNode.attributes.map((attr) => attr.name).sort();
  assert.deepEqual(names, ["at", "size"]);
});

test("text accepts at positioning tuple", () => {
  const ast = parseFromCode(`text { at: (5, 8) }`);
  const textNode = ast.children[0];
  assert.equal(textNode.name, "text");
  const names = textNode.attributes.map((attr) => attr.name).sort();
  assert.deepEqual(names, ["at"]);
});

test("feSpotLight supports 3d tuples", () => {
  const ast = parseFromCode(
    `feSpotLight { at: (1, 2, 3) pointsAt: (4, 5, 6) specularExponent: 2 limitingConeAngle: 40 }`
  );
  const spot = ast.children[0];
  assert.equal(spot.name, "feSpotLight");
  const names = spot.attributes.map((attr) => attr.name).sort();
  assert.deepEqual(names, [
    "at",
    "limitingConeAngle",
    "pointsAt",
    "specularExponent",
  ]);
});

test("undeclared variable throws error", () => {
  assert.throws(
    () => parseFromCode(`svg { size: ($width, 100) }`),
    {
      name: "ParserError",
      message: /Variable '\$width' is not defined/,
    }
  );
});

test("undeclared variable in tuple throws error", () => {
  assert.throws(
    () => parseFromCode(`rect { at: (10, 20) size: ($w, $h) }`),
    {
      name: "ParserError",
      message: /Variable '\$(w|h)' is not defined/,
    }
  );
});

test("duplicate variable declaration throws error", () => {
  assert.throws(
    () => parseFromCode(`vars { width: 100 width: 200 } svg { size: (100, 100) }`),
    {
      name: "ParserError",
      message: /Variable 'width' is already declared/,
    }
  );
});

test("invalid variable value throws error", () => {
  assert.throws(
    () => parseFromCode(`vars { invalid: $other } svg { size: (100, 100) }`),
    {
      name: "ParserError",
      message: /Invalid variable value.*Variables can only contain literal values/,
    }
  );
});

test("variable reference succeeds with declared variable", () => {
  const ast = parseFromCode(`vars { width: 150 } svg { size: ($width, 100) }`);
  assert.ok(ast.varsBlock, "varsBlock should exist");
  assert.equal(ast.varsBlock.declarations.length, 1);
  assert.equal(ast.varsBlock.declarations[0].name, "width");

  const svg = ast.children[0];
  const sizeAttr = svg.attributes.find(attr => attr.name === "size");
  assert.ok(sizeAttr, "size attribute should exist");
  assert.equal(sizeAttr.value.type, "TupleLiteral");
  assert.equal(sizeAttr.value.values[0].type, "VariableReference");
  assert.equal(sizeAttr.value.values[0].name, "width");
});

test("multiple declared variables work correctly", () => {
  const ast = parseFromCode(`
    vars {
      width: 150
      height: 200
      color: "#ff0000"
    }
    rect { at: (0, 0) size: ($width, $height) fill: $color }
  `);

  assert.equal(ast.varsBlock.declarations.length, 3);
  const rect = ast.children[0];
  const sizeAttr = rect.attributes.find(attr => attr.name === "size");
  const fillAttr = rect.attributes.find(attr => attr.name === "fill");

  assert.equal(sizeAttr.value.values[0].name, "width");
  assert.equal(sizeAttr.value.values[1].name, "height");
  assert.equal(fillAttr.value.name, "color");
});

test("empty vars block is valid", () => {
  const ast = parseFromCode(`vars {} svg { size: (100, 100) }`);
  assert.ok(ast.varsBlock, "varsBlock should exist");
  assert.equal(ast.varsBlock.declarations.length, 0);
});

test("variables with hyphens and underscores", () => {
  const ast = parseFromCode(`
    vars {
      my-width: 100
      my_height: 200
    }
    rect { at: (0, 0) size: ($my-width, $my_height) }
  `);

  assert.equal(ast.varsBlock.declarations.length, 2);
  assert.equal(ast.varsBlock.declarations[0].name, "my-width");
  assert.equal(ast.varsBlock.declarations[1].name, "my_height");
});
