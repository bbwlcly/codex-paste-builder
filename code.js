try {
  figma.showUI(__html__, { width: 460, height: 680, themeColors: true });
} catch (error) {
  figma.showUI(__html__, { width: 460, height: 680 });
}

const DEFAULT_FONT_FAMILY = "Inter";
const DEFAULT_FONT_STYLE = "Regular";

const SUPPORTED_TEXT_ALIGN = ["LEFT", "CENTER", "RIGHT", "JUSTIFIED"];
const SUPPORTED_TEXT_AUTO_RESIZE = ["WIDTH_AND_HEIGHT", "HEIGHT", "NONE", "TRUNCATE"];
const SUPPORTED_ALIGN_MAIN = ["MIN", "CENTER", "MAX", "SPACE_BETWEEN"];
const SUPPORTED_ALIGN_CROSS = ["MIN", "CENTER", "MAX", "BASELINE"];
const SUPPORTED_SIZE_MODE = ["FIXED", "HUG", "FILL"];
const SUPPORTED_SCALE_MODE = ["FILL", "FIT", "CROP", "TILE"];
const SUPPORTED_CONSTRAINT = ["MIN", "CENTER", "MAX", "STRETCH", "SCALE"];

const COMMON_FIELDS = [
  "type", "name", "width", "height", "x", "y", "position", "constraints", "opacity",
  "fill", "stroke", "strokeWidth", "radius", "shadow", "shadows", "layout", "padding",
  "paddingHorizontal", "paddingVertical", "gap", "alignMain", "alignCross", "widthMode",
  "heightMode", "clipContent", "children"
];
const TEXT_FIELDS = COMMON_FIELDS.concat([
  "text", "fontFamily", "fontStyle", "fontSize", "lineHeight", "letterSpacing",
  "weight", "color", "textAlign", "textAutoResize", "resize"
]);
const IMAGE_FIELDS = COMMON_FIELDS.concat(["src", "imageHash", "scaleMode", "label"]);
const BUTTON_FIELDS = TEXT_FIELDS.concat(["paddingX", "paddingY"]);

function createReport() {
  return { created: 0, warnings: [], errors: [] };
}

function warn(report, message) {
  report.warnings.push(message);
}

function fail(report, message) {
  report.errors.push(message);
}

function nodeLabel(spec) {
  return spec && spec.name ? spec.name : spec && spec.type ? spec.type : "Unnamed node";
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function normalizeHex(value, fallback) {
  fallback = fallback || "#FFFFFF";
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed.toUpperCase();
  if (/^#[0-9a-fA-F]{3}$/.test(trimmed)) {
    return ("#" + trimmed.slice(1).split("").map(function (char) {
      return char + char;
    }).join("")).toUpperCase();
  }
  return fallback;
}

function parseColorWithAlpha(value, fallback) {
  fallback = fallback || "#000000";
  if (typeof value !== "string") value = fallback;
  let hex = value.trim();
  if (/^#[0-9a-fA-F]{3}$/.test(hex)) {
    const chars = hex.slice(1).split("");
    hex = "#" + chars.map(function (char) { return char + char; }).join("") + "FF";
  } else if (/^#[0-9a-fA-F]{4}$/.test(hex)) {
    const chars = hex.slice(1).split("");
    hex = "#" + chars.map(function (char) { return char + char; }).join("");
  } else if (/^#[0-9a-fA-F]{6}$/.test(hex)) {
    hex = hex + "FF";
  } else if (!/^#[0-9a-fA-F]{8}$/.test(hex)) {
    hex = normalizeHex(fallback, "#000000") + "FF";
  }

  const intValue = parseInt(hex.slice(1), 16);
  return {
    r: ((intValue >> 24) & 255) / 255,
    g: ((intValue >> 16) & 255) / 255,
    b: ((intValue >> 8) & 255) / 255,
    a: (intValue & 255) / 255
  };
}

function toPaint(value, fallback) {
  const color = parseColorWithAlpha(value || fallback || "#FFFFFF", fallback || "#FFFFFF");
  return { type: "SOLID", color: { r: color.r, g: color.g, b: color.b }, opacity: color.a };
}

function channelToHex(value) {
  const number = Math.max(0, Math.min(255, Math.round(value * 255)));
  return number.toString(16).padStart(2, "0").toUpperCase();
}

function paintToHex(paints, fallback) {
  fallback = fallback || "#FFFFFF";
  if (!paints || paints === figma.mixed || !paints.length) return fallback;
  const paint = paints[0];
  if (!paint || paint.type !== "SOLID") return fallback;
  const alpha = typeof paint.opacity === "number" && paint.opacity < 1 ? channelToHex(paint.opacity) : "";
  return "#" + channelToHex(paint.color.r) + channelToHex(paint.color.g) + channelToHex(paint.color.b) + alpha;
}

function getPadding(spec) {
  const numeric = typeof spec.padding === "number" ? spec.padding : 0;
  const horizontal = typeof spec.paddingHorizontal === "number" ? spec.paddingHorizontal : numeric;
  const vertical = typeof spec.paddingVertical === "number" ? spec.paddingVertical : numeric;

  if (isPlainObject(spec.padding)) {
    return {
      top: typeof spec.padding.top === "number" ? spec.padding.top : 0,
      right: typeof spec.padding.right === "number" ? spec.padding.right : 0,
      bottom: typeof spec.padding.bottom === "number" ? spec.padding.bottom : 0,
      left: typeof spec.padding.left === "number" ? spec.padding.left : 0
    };
  }

  return { top: vertical, right: horizontal, bottom: vertical, left: horizontal };
}

function applyRadius(node, spec) {
  if (!("cornerRadius" in node) && !("topLeftRadius" in node)) return;
  if (typeof spec.radius === "number" && "cornerRadius" in node) {
    node.cornerRadius = spec.radius;
    return;
  }
  if (isPlainObject(spec.radius) && "topLeftRadius" in node) {
    node.topLeftRadius = typeof spec.radius.topLeft === "number" ? spec.radius.topLeft : 0;
    node.topRightRadius = typeof spec.radius.topRight === "number" ? spec.radius.topRight : 0;
    node.bottomRightRadius = typeof spec.radius.bottomRight === "number" ? spec.radius.bottomRight : 0;
    node.bottomLeftRadius = typeof spec.radius.bottomLeft === "number" ? spec.radius.bottomLeft : 0;
  }
}

function applyEffects(node, spec, report) {
  const source = Array.isArray(spec.shadows) ? spec.shadows : isPlainObject(spec.shadow) ? [spec.shadow] : [];
  if (!source.length || !("effects" in node)) return;
  const effects = [];
  for (const shadow of source) {
    if (!isPlainObject(shadow)) {
      warn(report, "Node \"" + nodeLabel(spec) + "\" has an invalid shadow entry, skipped.");
      continue;
    }
    effects.push({
      type: "DROP_SHADOW",
      offset: {
        x: typeof shadow.x === "number" ? shadow.x : 0,
        y: typeof shadow.y === "number" ? shadow.y : 0
      },
      radius: typeof shadow.blur === "number" ? shadow.blur : 0,
      spread: typeof shadow.spread === "number" ? shadow.spread : 0,
      color: parseColorWithAlpha(shadow.color || "#00000033", "#00000033"),
      visible: true,
      blendMode: "NORMAL"
    });
  }
  node.effects = effects;
}

function applyBox(node, spec, report, options) {
  options = options || {};
  if (typeof spec.width === "number" && typeof spec.height === "number" && !options.skipResize) {
    try {
      node.resize(spec.width, spec.height);
    } catch (error) {
      warn(report, "Node \"" + nodeLabel(spec) + "\" could not be resized to " + spec.width + "x" + spec.height + ".");
    }
  } else if (typeof spec.width === "number" && typeof node.resizeWithoutConstraints === "function" && !options.skipResize) {
    try {
      node.resizeWithoutConstraints(spec.width, node.height || 1);
    } catch (error) {
      warn(report, "Node \"" + nodeLabel(spec) + "\" width could not be applied.");
    }
  }

  if (typeof spec.x === "number") node.x = spec.x;
  if (typeof spec.y === "number") node.y = spec.y;
  applyRadius(node, spec);

  if (spec.stroke && "strokes" in node) {
    node.strokes = [toPaint(spec.stroke, "#E5E7EB")];
    node.strokeWeight = typeof spec.strokeWidth === "number" ? spec.strokeWidth : 1;
  }
  if (typeof spec.opacity === "number") node.opacity = spec.opacity;
  if ("clipsContent" in node && typeof spec.clipContent === "boolean") {
    node.clipsContent = spec.clipContent;
  }
  if (isPlainObject(spec.constraints) && "constraints" in node) {
    const horizontal = validateEnum(spec.constraints.horizontal, SUPPORTED_CONSTRAINT, "MIN", "constraints.horizontal", spec, report);
    const vertical = validateEnum(spec.constraints.vertical, SUPPORTED_CONSTRAINT, "MIN", "constraints.vertical", spec, report);
    node.constraints = { horizontal: horizontal, vertical: vertical };
  }
  applyEffects(node, spec, report);
}

function validateEnum(value, allowed, fallback, field, spec, report) {
  if (value === undefined || value === null || value === "") return fallback;
  if (allowed.indexOf(value) >= 0) return value;
  warn(report, "Node \"" + nodeLabel(spec) + "\" uses unsupported " + field + " value \"" + value + "\", fell back to " + fallback + ".");
  return fallback;
}

function applyLayout(frame, spec, report) {
  if (!spec.layout) {
    if (spec.alignMain || spec.alignCross || spec.padding || spec.paddingHorizontal || spec.paddingVertical || spec.gap) {
      warn(report, "Node \"" + nodeLabel(spec) + "\" has layout-related fields but no layout value.");
    }
    return;
  }

  frame.layoutMode = spec.layout === "row" ? "HORIZONTAL" : "VERTICAL";
  frame.itemSpacing = typeof spec.gap === "number" ? spec.gap : 12;
  const padding = getPadding(spec);
  frame.paddingTop = padding.top;
  frame.paddingRight = padding.right;
  frame.paddingBottom = padding.bottom;
  frame.paddingLeft = padding.left;
  frame.primaryAxisAlignItems = validateEnum(spec.alignMain, SUPPORTED_ALIGN_MAIN, "MIN", "alignMain", spec, report);
  frame.counterAxisAlignItems = validateEnum(spec.alignCross, SUPPORTED_ALIGN_CROSS, "MIN", "alignCross", spec, report);
  const isRow = frame.layoutMode === "HORIZONTAL";
  const widthHug = spec.widthMode === "HUG";
  const heightHug = spec.heightMode === "HUG";
  frame.primaryAxisSizingMode = (isRow ? widthHug : heightHug) ? "AUTO" : "FIXED";
  frame.counterAxisSizingMode = (isRow ? heightHug : widthHug) ? "AUTO" : "FIXED";
}

function applySizingMode(node, spec, parent, report) {
  if (!("layoutSizingHorizontal" in node)) return;
  const parentHasAutoLayout = parent && "layoutMode" in parent && parent.layoutMode !== "NONE";
  const widthMode = validateEnum(spec.widthMode, SUPPORTED_SIZE_MODE, "FIXED", "widthMode", spec, report);
  const heightMode = validateEnum(spec.heightMode, SUPPORTED_SIZE_MODE, "FIXED", "heightMode", spec, report);

  if (widthMode === "FILL" && !parentHasAutoLayout) {
    warn(report, "Node \"" + nodeLabel(spec) + "\" requested widthMode FILL outside an Auto Layout parent.");
  } else if (widthMode !== "FIXED") {
    node.layoutSizingHorizontal = widthMode;
  }

  if (heightMode === "FILL" && !parentHasAutoLayout) {
    warn(report, "Node \"" + nodeLabel(spec) + "\" requested heightMode FILL outside an Auto Layout parent.");
  } else if (heightMode !== "FIXED") {
    node.layoutSizingVertical = heightMode;
  }
}

function applyPositioning(node, spec, parent, report) {
  if (spec.position !== "absolute") return;
  if (!parent || !("children" in parent)) {
    fail(report, "Absolute node \"" + nodeLabel(spec) + "\" has no container parent.");
    return;
  }
  if ("layoutPositioning" in node) {
    node.layoutPositioning = "ABSOLUTE";
    if (typeof spec.x === "number") node.x = spec.x;
    if (typeof spec.y === "number") node.y = spec.y;
  } else {
    fail(report, "Absolute node \"" + nodeLabel(spec) + "\" does not support layoutPositioning.");
  }
}

function weightToStyle(weight) {
  switch (String(weight || "").toLowerCase()) {
    case "medium":
      return "Medium";
    case "semibold":
    case "semi-bold":
      return "Semibold";
    case "bold":
      return "Bold";
    case "regular":
    default:
      return "Regular";
  }
}

function resolveFont(spec) {
  return {
    family: spec.fontFamily || DEFAULT_FONT_FAMILY,
    style: spec.fontStyle || weightToStyle(spec.weight || "regular")
  };
}

async function loadResolvedFont(spec, report, explicitNode) {
  const font = resolveFont(spec);
  try {
    await figma.loadFontAsync(font);
    return font;
  } catch (error) {
    const message = "Font " + font.family + " / " + font.style + " could not be loaded. Please confirm the font is installed and accessible to Figma.";
    if (explicitNode || spec.fontFamily || spec.fontStyle) {
      fail(report, message);
      return null;
    }
    fail(report, message);
    return null;
  }
}

function chooseTextAutoResize(spec) {
  if (spec.textAutoResize) return spec.textAutoResize;
  if (spec.resize) return spec.resize;
  if (typeof spec.width !== "number") return "WIDTH_AND_HEIGHT";
  if (typeof spec.height !== "number") return "HEIGHT";
  return "NONE";
}

async function createText(spec, report) {
  report = report || createReport();
  checkUnknownFields(spec, TEXT_FIELDS, report);
  const font = await loadResolvedFont(spec, report, true);
  if (!font) return null;

  const node = figma.createText();
  node.name = spec.name || "Text";
  node.fontName = font;
  node.characters = spec.text || "Text";
  node.fontSize = typeof spec.fontSize === "number" ? spec.fontSize : 16;
  node.fills = [toPaint(spec.color, "#111827")];
  node.textAlignHorizontal = validateEnum(spec.textAlign, SUPPORTED_TEXT_ALIGN, "LEFT", "textAlign", spec, report);
  node.textAutoResize = validateEnum(chooseTextAutoResize(spec), SUPPORTED_TEXT_AUTO_RESIZE, "WIDTH_AND_HEIGHT", "textAutoResize", spec, report);

  if (typeof spec.lineHeight === "number") {
    node.lineHeight = { unit: "PIXELS", value: spec.lineHeight };
  } else if (spec.lineHeight === "AUTO") {
    node.lineHeight = { unit: "AUTO" };
  } else {
    node.lineHeight = { unit: "PERCENT", value: 120 };
  }
  if (typeof spec.letterSpacing === "number") {
    node.letterSpacing = { unit: "PIXELS", value: spec.letterSpacing };
  }

  if (typeof spec.width === "number" && typeof spec.height === "number") {
    node.resize(spec.width, spec.height);
  } else if (typeof spec.width === "number") {
    node.resize(spec.width, node.height);
  }
  if (typeof spec.x === "number") node.x = spec.x;
  if (typeof spec.y === "number") node.y = spec.y;
  if (typeof spec.opacity === "number") node.opacity = spec.opacity;
  report.created += 1;
  return node;
}

function createRect(spec, report) {
  report = report || createReport();
  checkUnknownFields(spec, COMMON_FIELDS, report);
  const node = figma.createRectangle();
  node.name = spec.name || "Rectangle";
  node.fills = spec.fill === "transparent" ? [] : [toPaint(spec.fill, "#E5E7EB")];
  applyBox(node, spec, report);
  report.created += 1;
  return node;
}

async function fetchBytes(src) {
  if (typeof src !== "string" || !src) throw new Error("Missing image src.");
  if (/^[a-zA-Z]:\\/.test(src)) throw new Error("Local Windows file paths are not supported.");
  if (src.indexOf("data:image/") === 0) {
    const base64 = src.split(",")[1] || "";
    return base64ToUint8Array(base64);
  }
  if (/^https?:\/\//.test(src)) {
    const response = await fetch(src);
    if (!response.ok) throw new Error("HTTP " + response.status);
    return new Uint8Array(await response.arrayBuffer());
  }
  throw new Error("Unsupported image src format.");
}

function base64ToUint8Array(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function uint8ArrayToBase64(bytes) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, Array.prototype.slice.call(chunk));
  }
  return btoa(binary);
}

async function createImageNode(spec, report) {
  report = report || createReport();
  checkUnknownFields(spec, IMAGE_FIELDS, report);
  const node = figma.createRectangle();
  node.name = spec.name || "Image";
  try {
    let imageHash = spec.imageHash;
    if (!imageHash) {
      const bytes = await fetchBytes(spec.src);
      imageHash = figma.createImage(bytes).hash;
    }
    node.fills = [{
      type: "IMAGE",
      scaleMode: validateEnum(spec.scaleMode, SUPPORTED_SCALE_MODE, "FILL", "scaleMode", spec, report),
      imageHash: imageHash
    }];
    if (typeof spec.clipContent !== "boolean" && spec.radius !== undefined && "clipsContent" in node) {
      node.clipsContent = true;
    }
  } catch (error) {
    fail(report, "Image \"" + nodeLabel(spec) + "\" failed to load from " + (spec.src || spec.imageHash || "missing src") + ": " + (error && error.message ? error.message : error));
    const placeholder = await createImagePlaceholder(Object.assign({}, spec, {
      type: "imagePlaceholder",
      label: "Image load failed"
    }), report);
    return placeholder;
  }
  applyBox(node, spec, report);
  report.created += 1;
  return node;
}

async function createFrame(spec, report) {
  report = report || createReport();
  checkUnknownFields(spec, COMMON_FIELDS, report);
  const frame = figma.createFrame();
  frame.name = spec.name || spec.type || "Frame";
  frame.fills = spec.fill === "transparent" ? [] : [toPaint(spec.fill, "#FFFFFF")];
  applyBox(frame, spec, report);
  applyLayout(frame, spec, report);
  if (typeof spec.clipContent === "boolean") frame.clipsContent = spec.clipContent;
  await appendChildren(frame, spec.children || [], report);
  report.created += 1;
  return frame;
}

async function createButton(spec, report) {
  report = report || createReport();
  checkUnknownFields(spec, BUTTON_FIELDS, report);
  const frame = figma.createFrame();
  frame.name = spec.name || "Button";
  frame.fills = [toPaint(spec.fill, "#111827")];
  frame.layoutMode = "HORIZONTAL";
  frame.primaryAxisSizingMode = "AUTO";
  frame.counterAxisSizingMode = "AUTO";
  frame.primaryAxisAlignItems = validateEnum(spec.alignMain, SUPPORTED_ALIGN_MAIN, "CENTER", "alignMain", spec, report);
  frame.counterAxisAlignItems = validateEnum(spec.alignCross, SUPPORTED_ALIGN_CROSS, "CENTER", "alignCross", spec, report);
  frame.itemSpacing = typeof spec.gap === "number" ? spec.gap : 8;

  const buttonPadding = Object.assign({}, spec);
  if (typeof spec.padding !== "number" && !isPlainObject(spec.padding)) {
    buttonPadding.paddingHorizontal = typeof spec.paddingX === "number" ? spec.paddingX : 16;
    buttonPadding.paddingVertical = typeof spec.paddingY === "number" ? spec.paddingY : 10;
  }
  const padding = getPadding(buttonPadding);
  frame.paddingTop = padding.top;
  frame.paddingRight = padding.right;
  frame.paddingBottom = padding.bottom;
  frame.paddingLeft = padding.left;
  applyBox(frame, spec, report);

  const label = await createText({
    type: "text",
    name: spec.name ? spec.name + " label" : "Button label",
    text: spec.text || "Button",
    color: spec.color || "#FFFFFF",
    fontFamily: spec.fontFamily,
    fontStyle: spec.fontStyle,
    fontSize: spec.fontSize || 14,
    lineHeight: spec.lineHeight,
    letterSpacing: spec.letterSpacing,
    weight: spec.weight || "medium",
    textAlign: "CENTER",
    textAutoResize: "WIDTH_AND_HEIGHT"
  }, report);
  if (label) frame.appendChild(label);
  report.created += 1;
  return frame;
}

async function createImagePlaceholder(spec, report) {
  const frame = figma.createFrame();
  frame.name = spec.name || "Image placeholder";
  frame.fills = [toPaint(spec.fill, "#F3F4F6")];
  applyBox(frame, spec, report);
  frame.layoutMode = "VERTICAL";
  frame.primaryAxisAlignItems = "CENTER";
  frame.counterAxisAlignItems = "CENTER";
  frame.primaryAxisSizingMode = "FIXED";
  frame.counterAxisSizingMode = "FIXED";

  const label = await createText({
    type: "text",
    name: "Placeholder label",
    text: spec.label || "Image",
    color: spec.color || "#6B7280",
    fontSize: 14,
    weight: "medium"
  }, report);
  if (label) frame.appendChild(label);
  report.created += 1;
  return frame;
}

async function createNode(spec, report) {
  if (!spec || typeof spec !== "object") {
    warn(report, "Skipped an invalid child node.");
    return null;
  }
  let node = null;
  try {
    switch (spec.type) {
      case "text":
        node = await createText(spec, report);
        break;
      case "rect":
        node = createRect(spec, report);
        break;
      case "button":
        node = await createButton(spec, report);
        break;
      case "image":
        node = await createImageNode(spec, report);
        break;
      case "imagePlaceholder":
        node = await createImagePlaceholder(spec, report);
        break;
      case "card":
      case "frame":
      case "section":
      default:
        node = await createFrame(spec, report);
        break;
    }
  } catch (error) {
    fail(report, "Node \"" + nodeLabel(spec) + "\" failed: " + (error && error.message ? error.message : error));
  }
  return node;
}

async function appendChildren(parent, children, report) {
  for (const childSpec of children) {
    const child = await createNode(childSpec, report);
    if (child) {
      parent.appendChild(child);
      applyPositioning(child, childSpec, parent, report);
      applySizingMode(child, childSpec, parent, report);
    }
  }
}

async function importDesign(design, report) {
  const rootSpec = {
    type: "frame",
    name: design.name || "Codex Generated Page",
    width: design.width || 1440,
    height: design.height || 1200,
    x: typeof design.x === "number" ? design.x : undefined,
    y: typeof design.y === "number" ? design.y : undefined,
    fill: design.fill || design.background || "#FFFFFF",
    layout: design.layout,
    gap: design.gap,
    padding: design.padding,
    paddingHorizontal: design.paddingHorizontal,
    paddingVertical: design.paddingVertical,
    alignMain: design.alignMain,
    alignCross: design.alignCross,
    widthMode: design.widthMode,
    heightMode: design.heightMode,
    clipContent: design.clipContent,
    children: design.children || []
  };
  const root = await createFrame(rootSpec, report);
  placeRootFrame(root, design);
  figma.currentPage.appendChild(root);
  figma.viewport.scrollAndZoomIntoView([root]);
  return root;
}

function placeRootFrame(root, design) {
  if (typeof design.x === "number" || typeof design.y === "number") {
    if (typeof design.x === "number") root.x = design.x;
    if (typeof design.y === "number") root.y = design.y;
    return;
  }

  const center = figma.viewport.center;
  root.x = Math.round(center.x - root.width / 2);
  root.y = Math.round(center.y - root.height / 2);
}

function checkUnknownFields(spec, allowed, report) {
  Object.keys(spec || {}).forEach(function (key) {
    if (allowed.indexOf(key) < 0) {
      warn(report, "Node \"" + nodeLabel(spec) + "\" has unsupported field \"" + key + "\", ignored.");
    }
  });
}

function getTextWeight(node) {
  if (!node.fontName || node.fontName === figma.mixed) return "regular";
  const style = String(node.fontName.style || "").toLowerCase();
  if (style.indexOf("semibold") >= 0 || style.indexOf("semi bold") >= 0) return "semibold";
  if (style.indexOf("bold") >= 0 || style.indexOf("black") >= 0) return "bold";
  if (style.indexOf("medium") >= 0) return "medium";
  return "regular";
}

function getRadius(node) {
  if ("cornerRadius" in node && node.cornerRadius !== figma.mixed && typeof node.cornerRadius === "number") {
    return node.cornerRadius;
  }
  if ("topLeftRadius" in node) {
    return {
      topLeft: node.topLeftRadius || 0,
      topRight: node.topRightRadius || 0,
      bottomRight: node.bottomRightRadius || 0,
      bottomLeft: node.bottomLeftRadius || 0
    };
  }
  return undefined;
}

function effectsToShadows(node) {
  if (!("effects" in node) || node.effects === figma.mixed) return [];
  return node.effects.filter(function (effect) {
    return effect.type === "DROP_SHADOW" && effect.visible !== false;
  }).map(function (effect) {
    return {
      x: effect.offset.x,
      y: effect.offset.y,
      blur: effect.radius,
      spread: effect.spread || 0,
      color: "#" + channelToHex(effect.color.r) + channelToHex(effect.color.g) + channelToHex(effect.color.b) + channelToHex(effect.color.a)
    };
  });
}

function getNodeType(node) {
  if (node.type === "TEXT") return "text";
  if (node.type === "RECTANGLE") {
    const fills = node.fills !== figma.mixed ? node.fills : [];
    if (fills && fills[0] && fills[0].type === "IMAGE") return "image";
    return "rect";
  }
  return "frame";
}

async function exportNode(node, options, report) {
  options = options || {};
  const type = getNodeType(node);
  const spec = {
    type: type,
    name: node.name,
    x: Math.round(node.x || 0),
    y: Math.round(node.y || 0),
    width: Math.round(node.width || 0),
    height: Math.round(node.height || 0)
  };

  if (node.layoutPositioning === "ABSOLUTE") spec.position = "absolute";
  if ("constraints" in node) spec.constraints = node.constraints;

  if (type === "text") {
    spec.text = node.characters;
    if (node.fontName && node.fontName !== figma.mixed) {
      spec.fontFamily = node.fontName.family;
      spec.fontStyle = node.fontName.style;
    }
    spec.fontSize = node.fontSize === figma.mixed ? 16 : node.fontSize;
    if (node.lineHeight && node.lineHeight !== figma.mixed) {
      spec.lineHeight = node.lineHeight.unit === "AUTO" ? "AUTO" : node.lineHeight.value;
    }
    if (node.letterSpacing && node.letterSpacing !== figma.mixed) {
      spec.letterSpacing = node.letterSpacing.value;
    }
    spec.weight = getTextWeight(node);
    spec.color = paintToHex(node.fills, "#111827");
    spec.textAlign = node.textAlignHorizontal || "LEFT";
    spec.textAutoResize = node.textAutoResize || "WIDTH_AND_HEIGHT";
    return spec;
  }

  if ("fills" in node && node.fills !== figma.mixed) {
    const imageFill = node.fills.find(function (fill) { return fill.type === "IMAGE"; });
    if (imageFill) {
      spec.type = "image";
      spec.scaleMode = imageFill.scaleMode || "FILL";
      if (options.includeImageData && imageFill.imageHash) {
        try {
          const image = figma.getImageByHash(imageFill.imageHash);
          if (image) {
            const bytes = await image.getBytesAsync();
            spec.src = "data:image/png;base64," + uint8ArrayToBase64(bytes);
          }
        } catch (error) {
          fail(report, "Image \"" + node.name + "\" could not export image bytes.");
        }
      }
      if (!spec.src && imageFill.imageHash) {
        spec.imageHash = imageFill.imageHash;
        warn(report, "Image \"" + node.name + "\" exported as imageHash only; it is not fully portable outside this Figma file.");
      }
    } else {
      spec.fill = node.fills.length ? paintToHex(node.fills, "#FFFFFF") : "transparent";
    }
  }

  if ("strokes" in node && node.strokes !== figma.mixed && node.strokes.length) {
    spec.stroke = paintToHex(node.strokes, "#E5E7EB");
    spec.strokeWidth = node.strokeWeight === figma.mixed ? 1 : node.strokeWeight;
  }

  const radius = getRadius(node);
  if (radius !== undefined) spec.radius = radius;
  const shadows = effectsToShadows(node);
  if (shadows.length === 1) spec.shadow = shadows[0];
  if (shadows.length > 1) spec.shadows = shadows;

  if ("layoutMode" in node && node.layoutMode !== "NONE") {
    spec.layout = node.layoutMode === "HORIZONTAL" ? "row" : "column";
    spec.padding = {
      top: node.paddingTop || 0,
      right: node.paddingRight || 0,
      bottom: node.paddingBottom || 0,
      left: node.paddingLeft || 0
    };
    spec.gap = node.itemSpacing || 0;
    spec.alignMain = node.primaryAxisAlignItems || "MIN";
    spec.alignCross = node.counterAxisAlignItems || "MIN";
  }
  if ("layoutSizingHorizontal" in node) {
    spec.widthMode = node.layoutSizingHorizontal || "FIXED";
    spec.heightMode = node.layoutSizingVertical || "FIXED";
  }
  if ("clipsContent" in node) spec.clipContent = node.clipsContent;
  if ("children" in node) {
    spec.children = [];
    for (const child of node.children) {
      spec.children.push(await exportNode(child, options, report));
    }
  }
  return spec;
}

async function exportSelection(options, report) {
  const selection = figma.currentPage.selection;
  if (!selection.length) {
    throw new Error("Select one frame, component, or layer first.");
  }

  if (selection.length === 1) return exportNode(selection[0], options, report);

  const children = [];
  for (const node of selection) {
    children.push(await exportNode(node, options, report));
  }
  return {
    name: "Figma Selection Export",
    width: Math.round(Math.max.apply(null, selection.map(function (node) { return node.x + node.width; }))),
    height: Math.round(Math.max.apply(null, selection.map(function (node) { return node.y + node.height; }))),
    fill: "#FFFFFF",
    children: children
  };
}

figma.ui.onmessage = async function (message) {
  if (message.type === "cancel") {
    figma.closePlugin();
    return;
  }

  if (message.type === "import-design") {
    const report = createReport();
    try {
      const design = JSON.parse(message.payload);
      const root = await importDesign(design, report);
      figma.ui.postMessage({ type: "success", message: 'Created "' + root.name + '"', report: report });
    } catch (error) {
      fail(report, error && error.message ? error.message : "Could not import this JSON.");
      figma.ui.postMessage({ type: "error", message: "Import finished with errors.", report: report });
    }
    return;
  }

  if (message.type === "export-selection") {
    const report = createReport();
    try {
      const exported = await exportSelection({ includeImageData: !!message.includeImageData }, report);
      figma.ui.postMessage({
        type: "exported",
        payload: JSON.stringify(exported, null, 2),
        message: "Selection exported. Copy this JSON to Codex for review.",
        report: report
      });
    } catch (error) {
      fail(report, error && error.message ? error.message : "Could not export this selection.");
      figma.ui.postMessage({ type: "error", message: "Export failed.", report: report });
    }
  }
};
