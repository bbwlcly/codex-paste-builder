export type NodeType =
  | "frame"
  | "section"
  | "card"
  | "text"
  | "button"
  | "rect"
  | "image"
  | "imagePlaceholder";

export type LayoutDirection = "row" | "column";
export type AlignMain = "MIN" | "CENTER" | "MAX" | "SPACE_BETWEEN";
export type AlignCross = "MIN" | "CENTER" | "MAX" | "BASELINE";
export type SizeMode = "FIXED" | "HUG" | "FILL";
export type TextAlign = "LEFT" | "CENTER" | "RIGHT" | "JUSTIFIED";
export type TextAutoResize = "WIDTH_AND_HEIGHT" | "HEIGHT" | "NONE" | "TRUNCATE";
export type ImageScaleMode = "FILL" | "FIT" | "CROP" | "TILE";
export type ConstraintValue = "MIN" | "CENTER" | "MAX" | "STRETCH" | "SCALE";

export interface ShadowSpec {
  x?: number;
  y?: number;
  blur?: number;
  spread?: number;
  color?: string;
}

export interface PaddingSpec {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
}

export interface RadiusSpec {
  topLeft?: number;
  topRight?: number;
  bottomRight?: number;
  bottomLeft?: number;
}

export interface ConstraintsSpec {
  horizontal?: ConstraintValue;
  vertical?: ConstraintValue;
}

export interface BaseNodeSpec {
  type?: NodeType;
  name?: string;
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  position?: "auto" | "absolute";
  constraints?: ConstraintsSpec;
  opacity?: number;
  fill?: string | "transparent";
  stroke?: string;
  strokeWidth?: number;
  radius?: number | RadiusSpec;
  shadow?: ShadowSpec;
  shadows?: ShadowSpec[];
  layout?: LayoutDirection;
  padding?: number | PaddingSpec;
  paddingHorizontal?: number;
  paddingVertical?: number;
  gap?: number;
  alignMain?: AlignMain;
  alignCross?: AlignCross;
  widthMode?: SizeMode;
  heightMode?: SizeMode;
  clipContent?: boolean;
  children?: CodexPasteNode[];
}

export interface TextNodeSpec extends BaseNodeSpec {
  type: "text";
  text?: string;
  fontFamily?: string;
  fontStyle?: string;
  fontSize?: number;
  lineHeight?: number | "AUTO";
  letterSpacing?: number;
  weight?: "regular" | "medium" | "semibold" | "bold";
  color?: string;
  textAlign?: TextAlign;
  textAutoResize?: TextAutoResize;
}

export interface ImageNodeSpec extends BaseNodeSpec {
  type: "image";
  src?: string;
  imageHash?: string;
  scaleMode?: ImageScaleMode;
}

export interface ImagePlaceholderSpec extends BaseNodeSpec {
  type: "imagePlaceholder";
  label?: string;
}

export interface ButtonNodeSpec extends BaseNodeSpec {
  type: "button";
  text?: string;
  color?: string;
  fontFamily?: string;
  fontStyle?: string;
  fontSize?: number;
  lineHeight?: number | "AUTO";
  letterSpacing?: number;
  weight?: "regular" | "medium" | "semibold" | "bold";
  paddingX?: number;
  paddingY?: number;
}

export interface ContainerNodeSpec extends BaseNodeSpec {
  type?: "frame" | "section" | "card" | "rect";
}

export type CodexPasteNode =
  | TextNodeSpec
  | ImageNodeSpec
  | ImagePlaceholderSpec
  | ButtonNodeSpec
  | ContainerNodeSpec;

export interface CodexPasteDocument extends BaseNodeSpec {
  name?: string;
  background?: string;
  children: CodexPasteNode[];
}
