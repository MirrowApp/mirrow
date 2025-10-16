import test from "node:test";
import assert from "node:assert/strict";
import { compile } from "../dist/index.js";

test("numeric variable resolves in compiled SVG", () => {
  const svg = compile(`vars { width: 150 } svg { size: ($width, 100) }`);
  assert.ok(svg.includes('width="150"'), "width should be resolved to 150");
  assert.ok(svg.includes('height="100"'), "height should be 100");
});

test("string variable resolves in compiled SVG", () => {
  const svg = compile(`vars { color: "#ff0000" } rect { at: (0, 0) size: (10, 10) fill: $color }`);
  assert.ok(svg.includes('fill="#ff0000"'), "fill should be resolved to #ff0000");
});

test("identifier variable resolves in compiled SVG", () => {
  const svg = compile(`vars { align: center } text { at: (0, 0) textAnchor: $align }`);
  assert.ok(svg.includes('text-anchor="center"'), "textAnchor should be resolved to center");
});

test("multiple variables in tuple resolve correctly", () => {
  const svg = compile(`
    vars {
      width: 150
      height: 200
    }
    rect { at: (0, 0) size: ($width, $height) }
  `);
  assert.ok(svg.includes('width="150"'), "width should be resolved to 150");
  assert.ok(svg.includes('height="200"'), "height should be resolved to 200");
});

test("variables resolve in nested elements", () => {
  const svg = compile(`
    vars {
      radius: 50
    }
    svg { size: (100, 100)
      circle { at: (50, 50) r: $radius }
    }
  `);
  assert.ok(svg.includes('r="50"'), "radius should be resolved to 50");
});

test("tuple variable resolves correctly", () => {
  const svg = compile(`
    vars {
      position: (10, 20)
    }
    rect { at: $position size: (50, 50) }
  `);
  assert.ok(svg.includes('x="10"'), "x should be resolved from tuple");
  assert.ok(svg.includes('y="20"'), "y should be resolved from tuple");
});

test("compilation without vars block works", () => {
  const svg = compile(`svg { size: (100, 100) }`);
  assert.ok(svg.includes('<svg'), "should compile successfully");
  assert.ok(svg.includes('width="100"'), "width should be 100");
});

test("empty vars block compiles correctly", () => {
  const svg = compile(`vars {} svg { size: (100, 100) }`);
  assert.ok(svg.includes('<svg'), "should compile successfully");
  assert.ok(svg.includes('width="100"'), "width should be 100");
});

// 1. Basic variable declaration and usage tests
test("declare and use numeric variable", () => {
  const svg = compile(`vars { boxSize: 80 } rect { at: (0, 0) size: ($boxSize, $boxSize) }`);
  assert.ok(svg.includes('width="80"'), "numeric variable should resolve to 80");
  assert.ok(svg.includes('height="80"'), "numeric variable should resolve to 80");
});

test("declare and use string variable", () => {
  const svg = compile(`vars { strokeColor: "#333333" } rect { at: (0, 0) size: (10, 10) stroke: $strokeColor }`);
  assert.ok(svg.includes('stroke="#333333"'), "string variable should resolve correctly");
});

test("declare and use identifier variable", () => {
  const svg = compile(`vars { anchorPos: middle } text { at: (0, 0) textAnchor: $anchorPos }`);
  assert.ok(svg.includes('text-anchor="middle"'), "identifier variable should resolve correctly");
});

// 2. Variables in tuples tests
test("single variable in tuple", () => {
  const svg = compile(`vars { width: 120 } rect { at: (0, 0) size: ($width, 100) }`);
  assert.ok(svg.includes('width="120"'), "variable in tuple should resolve");
  assert.ok(svg.includes('height="100"'), "literal in tuple should work");
});

test("multiple variables in tuple", () => {
  const svg = compile(`
    vars {
      w: 150
      h: 200
    }
    rect { at: (0, 0) size: ($w, $h) }
  `);
  assert.ok(svg.includes('width="150"'), "first variable should resolve");
  assert.ok(svg.includes('height="200"'), "second variable should resolve");
});

test("mixed literals and variables in tuple", () => {
  const svg = compile(`vars { y: 30 } rect { at: (10, $y) size: (50, 50) }`);
  assert.ok(svg.includes('x="10"'), "literal should work in tuple");
  assert.ok(svg.includes('y="30"'), "variable should resolve in tuple");
});

// 3. Variables in CSS states tests
test("variable in @hover block", () => {
  const svg = compile(`
    vars {
      hoverColor: "#0070f3"
    }
    svg { size: (100, 100)
      rect { at: (0, 0) size: (50, 50) id: "box" }
      @hover {
        #box { stroke: $hoverColor; }
      }
    }
  `);
  assert.ok(svg.includes('stroke: #0070f3'), "variable should resolve in @hover block");
});

test("multiple variables in CSS state", () => {
  const svg = compile(`
    vars {
      activeStroke: "#ff0000"
      activeWidth: 3
    }
    svg { size: (100, 100)
      circle { at: (50, 50) r: 20 id: "dot" }
      @active {
        #dot { stroke: $activeStroke; strokeWidth: $activeWidth; }
      }
    }
  `);
  assert.ok(svg.includes('stroke: #ff0000'), "stroke variable should resolve in @active");
  assert.ok(svg.includes('strokeWidth: 3'), "width variable should resolve in @active");
});

test("variable in @focus state", () => {
  const svg = compile(`
    vars { focusFill: "yellow" }
    svg { size: (100, 100)
      rect { at: (0, 0) size: (40, 40) id: "r" }
      @focus {
        #r { fill: $focusFill; }
      }
    }
  `);
  assert.ok(svg.includes('fill: yellow'), "variable should resolve in @focus state");
});

// 4. Error cases tests
test("error - using undeclared variable", () => {
  assert.throws(
    () => compile(`rect { at: (0, 0) size: ($undeclared, 10) }`),
    {
      name: "ParserError",
      message: /Variable '\$undeclared' is not defined/
    }
  );
});

test("error - duplicate variable declarations", () => {
  assert.throws(
    () => compile(`vars { size: 100 size: 200 } svg { size: (100, 100) }`),
    {
      name: "ParserError",
      message: /Variable 'size' is already declared/
    }
  );
});

test("error - variable reference in variable declaration", () => {
  assert.throws(
    () => compile(`vars { a: 10 b: $a } svg { size: (100, 100) }`),
    {
      name: "ParserError",
      message: /Invalid variable value.*Variables can only contain literal values/
    }
  );
});

test("error - undeclared variable in CSS state", () => {
  assert.throws(
    () => compile(`
      svg { size: (100, 100)
        rect { at: (0, 0) size: (10, 10) id: "r" }
        @hover {
          #r { fill: $undeclaredColor; }
        }
      }
    `),
    {
      name: "Error",
      message: /Variable '\$undeclaredColor' is not defined/
    }
  );
});

// 5. Edge cases tests
test("variable names with hyphens", () => {
  const svg = compile(`
    vars { stroke-color: "#ff0000" }
    rect { at: (0, 0) size: (10, 10) stroke: $stroke-color }
  `);
  assert.ok(svg.includes('stroke="#ff0000"'), "hyphenated variable name should work");
});

test("variable names with underscores", () => {
  const svg = compile(`
    vars { fill_color: "blue" }
    rect { at: (0, 0) size: (10, 10) fill: $fill_color }
  `);
  assert.ok(svg.includes('fill="blue"'), "underscore variable name should work");
});

test("variable names with mixed case", () => {
  const svg = compile(`
    vars { bgColor: "#ffffff" }
    rect { at: (0, 0) size: (10, 10) fill: $bgColor }
  `);
  assert.ok(svg.includes('fill="#ffffff"'), "camelCase variable name should work");
});

test("multiple CSS states using same variable", () => {
  const svg = compile(`
    vars { highlightColor: "orange" }
    svg { size: (100, 100)
      rect { at: (0, 0) size: (30, 30) id: "box" }
      @hover {
        #box { fill: $highlightColor; }
      }
      @focus {
        #box { stroke: $highlightColor; }
      }
    }
  `);
  assert.ok(svg.includes('fill: orange'), "variable should work in @hover");
  assert.ok(svg.includes('stroke: orange'), "variable should work in @focus");
});

test("variable with boolean value", () => {
  const svg = compile(`
    vars { shouldFill: true }
    circle { at: (50, 50) r: 20 filled: $shouldFill }
  `);
  assert.ok(svg.includes('filled="true"'), "boolean variable should resolve for filled attribute");
});

test("tuple variable with all literals", () => {
  const svg = compile(`
    vars { pos: (25, 75) }
    rect { at: $pos size: (40, 40) }
  `);
  assert.ok(svg.includes('x="25"'), "tuple variable x should resolve");
  assert.ok(svg.includes('y="75"'), "tuple variable y should resolve");
});

test("many variables declared and used", () => {
  const svg = compile(`
    vars {
      x: 10
      y: 20
      w: 100
      h: 80
      stroke: "#000"
      strokeW: 2
      fillColor: "red"
    }
    rect {
      at: ($x, $y)
      size: ($w, $h)
      stroke: $stroke
      strokeWidth: $strokeW
      fill: $fillColor
    }
  `);
  assert.ok(svg.includes('x="10"'), "x variable should resolve");
  assert.ok(svg.includes('y="20"'), "y variable should resolve");
  assert.ok(svg.includes('width="100"'), "width variable should resolve");
  assert.ok(svg.includes('height="80"'), "height variable should resolve");
  assert.ok(svg.includes('stroke="#000"'), "stroke variable should resolve");
  assert.ok(svg.includes('stroke-width="2"'), "strokeWidth variable should resolve");
  assert.ok(svg.includes('fill="red"'), "fill variable should resolve");
});
