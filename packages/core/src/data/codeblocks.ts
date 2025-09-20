export type CodeblockKind = "css-state" | "js-event";

export class Codeblock {
  constructor(public name: string, public kind: CodeblockKind) {}
}

const normalizeCssStateName = (name: string): string =>
  name.replace(/^:+/, "").toLowerCase();

const normalizeJsEventName = (name: string): string =>
  name.replace(/^on/i, "").toLowerCase();

export const CSS_STATES = [
  "active",
  "any-link",
  "autofill",
  "blank",
  "checked",
  "current",
  "default",
  "defined",
  "disabled",
  "empty",
  "enabled",
  "first-child",
  "first-of-type",
  "focus",
  "focus-visible",
  "focus-within",
  "fullscreen",
  "future",
  "has",
  "host",
  "host-context",
  "hover",
  "indeterminate",
  "in-range",
  "invalid",
  "is",
  "lang",
  "last-child",
  "last-of-type",
  "link",
  "local-link",
  "not",
  "nth-child",
  "nth-last-child",
  "nth-last-of-type",
  "nth-of-type",
  "only-child",
  "only-of-type",
  "optional",
  "out-of-range",
  "past",
  "placeholder-shown",
  "playing",
  "paused",
  "read-only",
  "read-write",
  "required",
  "root",
  "scope",
  "target",
  "target-within",
  "user-invalid",
  "user-valid",
  "valid",
  "visited",
  "where",
  "dir",
] as const;

export const JS_EVENTS = [
  "abort",
  "animationcancel",
  "animationend",
  "animationiteration",
  "animationstart",
  "auxclick",
  "beforeinput",
  "blur",
  "canplay",
  "canplaythrough",
  "change",
  "click",
  "close",
  "compositionend",
  "compositionstart",
  "compositionupdate",
  "contextmenu",
  "copy",
  "cut",
  "dblclick",
  "drag",
  "dragend",
  "dragenter",
  "dragleave",
  "dragover",
  "dragstart",
  "drop",
  "durationchange",
  "ended",
  "error",
  "focus",
  "focusin",
  "focusout",
  "formdata",
  "input",
  "invalid",
  "keydown",
  "keypress",
  "keyup",
  "load",
  "loadeddata",
  "loadedmetadata",
  "loadstart",
  "mousedown",
  "mouseenter",
  "mouseleave",
  "mousemove",
  "mouseout",
  "mouseover",
  "mouseup",
  "paste",
  "pause",
  "play",
  "playing",
  "pointercancel",
  "pointerdown",
  "pointerenter",
  "pointerleave",
  "pointermove",
  "pointerout",
  "pointerover",
  "pointerup",
  "progress",
  "ratechange",
  "reset",
  "resize",
  "scroll",
  "securitypolicyviolation",
  "seeked",
  "seeking",
  "select",
  "slotchange",
  "stalled",
  "submit",
  "suspend",
  "timeupdate",
  "toggle",
  "touchcancel",
  "touchend",
  "touchmove",
  "touchstart",
  "transitioncancel",
  "transitionend",
  "transitionrun",
  "transitionstart",
  "volumechange",
  "waiting",
  "wheel",
] as const;

const cssStateLookup = new Set<string>(
  CSS_STATES.map((state) => normalizeCssStateName(state))
);

const jsEventLookup = new Set<string>(
  JS_EVENTS.map((eventName) => normalizeJsEventName(eventName))
);

export const CSS_UNIT_SUFFIXES = new Set<string>([
  "%",
  // Absolute length units
  "cm",
  "mm",
  "Q",
  "in",
  "pc",
  "pt",
  "px",
  // Font-relative length units
  "em",
  "ex",
  "ch",
  "ic",
  "rem",
  "cap",
  "lh",
  "rlh",
  // Viewport-percentage length units
  "vw",
  "vh",
  "vi",
  "vb",
  "vmin",
  "vmax",
  "svw",
  "svh",
  "svi",
  "svb",
  "svmin",
  "svmax",
  "lvw",
  "lvh",
  "lvi",
  "lvb",
  "lvmin",
  "lvmax",
  "dvw",
  "dvh",
  "dvi",
  "dvb",
  "dvmin",
  "dvmax",
  // Container query length units
  "cqw",
  "cqh",
  "cqi",
  "cqb",
  "cqmin",
  "cqmax",
  // Angle units
  "deg",
  "grad",
  "rad",
  "turn",
  // Time units
  "s",
  "ms",
  // Frequency units
  "Hz",
  "kHz",
  // Resolution units
  "dpi",
  "dpcm",
  "dppx",
  "x",
  // Flexible fractions
  "fr",
]);

const cssExceptions = new Set<string>(["infinite", "none", "auto"]);

const specialCodeblocks = new Set<string>(["style", "script"]);

export function isCssState(name: string): boolean {
  return cssStateLookup.has(normalizeCssStateName(name));
}

export function isCssException(name: string): boolean {
  return cssExceptions.has(name);
}

export function isJsEvent(name: string): boolean {
  return jsEventLookup.has(normalizeJsEventName(name));
}

export function isSpecialCodeblock(name: string): {
  valid: boolean;
  kind?: string;
} {
  if (specialCodeblocks.has(name.toLowerCase())) {
    return { valid: true, kind: name.toLowerCase() };
  }
  return { valid: false };
}
