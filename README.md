# Codex Paste Builder

Codex Paste Builder is a local Figma development plugin for a copy-paste workflow with Codex.

It can:

- Import Codex JSON into editable Figma layers.
- Export selected Figma layers back to the same JSON protocol.
- Report created node counts, warnings, and errors in the plugin UI.
- Work without Figma MCP, which makes it useful for free Figma accounts.

## Install

1. Open Figma desktop.
2. Go to `Plugins` -> `Development` -> `Import plugin from manifest...`.
3. Select `manifest.json` from this folder.
4. Run `Codex Paste Builder` from `Plugins` -> `Development`.

If you changed plugin files, re-import the manifest or remove and import the development plugin again.

## Import Workflow

1. Ask Codex to generate `Codex Paste Builder JSON`.
2. Paste the JSON into the plugin.
3. Click `Create in Figma`.
4. Check the report area for created nodes, warnings, and errors.

## Export Workflow

1. Select one or more frames, components, or layers in Figma.
2. Run `Codex Paste Builder`.
3. Optional: enable `Include image data when exporting`.
4. Click `Export selection`.
5. Click `Copy JSON`.
6. Paste the JSON into Codex for design review.

When image data is not included, exported `imageHash` values are only useful inside the current Figma file or document environment. They are not fully portable assets.

## Supported Nodes

- `frame`
- `section`
- `card`
- `text`
- `button`
- `rect`
- `image`
- `imagePlaceholder`

## Common Container Fields

Used by `frame`, `section`, `card`, `button`, `image`, and `imagePlaceholder` where applicable:

- `name`
- `width`, `height`
- `x`, `y`
- `position`: `auto` or `absolute`
- `constraints`
- `fill`, including `"transparent"`
- `stroke`, `strokeWidth`
- `radius`: number or `{ topLeft, topRight, bottomRight, bottomLeft }`
- `shadow` or `shadows`
- `layout`: `row` or `column`
- `padding`: number or `{ top, right, bottom, left }`
- `paddingHorizontal`, `paddingVertical`
- `gap`
- `alignMain`: `MIN`, `CENTER`, `MAX`, `SPACE_BETWEEN`
- `alignCross`: `MIN`, `CENTER`, `MAX`, `BASELINE`
- `widthMode`, `heightMode`: `FIXED`, `HUG`, `FILL`
- `clipContent`
- `children`

## Text Fields

`text` nodes support:

- `text`
- `fontFamily`
- `fontStyle`
- `fontSize`
- `lineHeight`: number in pixels or `"AUTO"`
- `letterSpacing`: number in pixels
- `weight`: `regular`, `medium`, `semibold`, `bold`
- `color`
- `textAlign`: `LEFT`, `CENTER`, `RIGHT`, `JUSTIFIED`
- `textAutoResize`: `WIDTH_AND_HEIGHT`, `HEIGHT`, `NONE`, `TRUNCATE`

Font loading rules:

- `fontFamily` and `fontStyle` are used first.
- If `fontStyle` is missing, `weight` maps to a style.
- If a specified font cannot be loaded, the text node is not silently changed to Inter. The plugin reports the error in the UI.

## Image Fields

`image` nodes support:

- `src`: `http`, `https`, or `data:image/...;base64,...`
- `imageHash`: for images already known inside the Figma document
- `scaleMode`: `FILL`, `FIT`, `CROP`, `TILE`
- `radius`, `stroke`, `shadow`, `clipContent`

Local Windows file paths such as `C:\\Users\\name\\photo.jpg` are not supported.

If an image fails to load, the plugin creates an image placeholder and reports the failing node and source in the UI.

## Absolute Positioning

Child nodes can use:

```json
{
  "position": "absolute",
  "x": 12,
  "y": 196
}
```

This is static canvas positioning relative to the direct parent frame. It is not the same as prototype scroll-fixed behavior.

## Files

- `manifest.json`: Figma development plugin manifest.
- `code.js`: import/export logic.
- `ui.html`: plugin UI.
- `protocol.d.ts`: JSON protocol type definitions.
- `sample-mobile.json`: standalone mobile UI sample.
- `test-stage-1-text.json`: font and text layout test.
- `test-stage-2-layout.json`: padding, alignment, sizing, radius, and clipping test.
- `test-stage-3-shadow-absolute.json`: shadow, absolute positioning, and constraints test.
- `test-stage-4-image.json`: image import test.
