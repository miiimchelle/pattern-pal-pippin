# Figma Plugin API Reference

Detailed reference for the `figma.*` global available in the plugin sandbox.

## Document Structure

```js
figma.root // DocumentNode — the file root
figma.currentPage // PageNode — active page
figma.root.children // ReadonlyArray<PageNode> — all pages
```

## Creating Nodes

```js
figma.createFrame() // FrameNode
figma.createRectangle() // RectangleNode
figma.createEllipse() // EllipseNode
figma.createPolygon() // PolygonNode
figma.createStar() // StarNode
figma.createLine() // LineNode
figma.createText() // TextNode
figma.createVector() // VectorNode
figma.createBooleanOperation() // BooleanOperationNode
figma.createComponent() // ComponentNode
figma.createComponentSet() // From existing ComponentNodes
figma.createSlice() // SliceNode
figma.createSection() // SectionNode
figma.group(nodes, parent) // GroupNode — groups nodes under parent
figma.flatten(nodes) // Flatten into single vector
figma.union(nodes, parent) // Boolean union
figma.subtract(nodes, parent) // Boolean subtract
figma.intersect(nodes, parent) // Boolean intersect
figma.exclude(nodes, parent) // Boolean exclude
```

New nodes are appended to `figma.currentPage` by default. Move them:

```js
parentFrame.appendChild(newNode)
parentFrame.insertChild(index, newNode)
```

## Node Lookup

```js
figma.getNodeById(id) // BaseNode | null
figma.currentPage.findAll(predicate) // SceneNode[] — walks entire tree
figma.currentPage.findOne(predicate) // SceneNode | null — first match
figma.currentPage.findAllWithCriteria({ types: ['TEXT'] }) // Optimized by type

// findAllWithCriteria supported types:
// 'BOOLEAN_OPERATION', 'COMPONENT', 'COMPONENT_SET', 'ELLIPSE', 'FRAME',
// 'GROUP', 'INSTANCE', 'LINE', 'POLYGON', 'RECTANGLE', 'SECTION',
// 'SLICE', 'STAR', 'STAMP', 'STICKY', 'TEXT', 'VECTOR'

// Children traversal
node.children // ReadonlyArray<SceneNode>
node.parent // BaseNode | null
node.removed // boolean — has this node been deleted
```

## Geometry & Transform

```js
;(node.x, node.y) // Position relative to parent
;(node.width, node.height) // Dimensions
node.rotation // Degrees (0–360)
node.resize(width, height) // Resize without constraints
node.rescale(factor) // Scale uniformly
node.relativeTransform // [[a,b,tx],[c,d,ty]] — 2D affine matrix
node.absoluteTransform // Transform relative to page
node.absoluteBoundingBox // { x, y, width, height } in page coords
node.absoluteRenderBounds // Includes effects like shadows
```

## Fills, Strokes & Effects

### Paint Types

```js
// Solid
{ type: 'SOLID', color: { r, g, b }, opacity?: number, visible?: boolean }

// Linear/Radial/Angular/Diamond Gradient
{ type: 'GRADIENT_LINEAR', gradientStops: [...], gradientTransform: [...] }

// Image
{ type: 'IMAGE', imageHash: string, scaleMode: 'FILL' | 'FIT' | 'CROP' | 'TILE' }

// Video
{ type: 'VIDEO', videoHash: string, scaleMode: '...' }
```

### Applying Fills/Strokes

```js
// IMPORTANT: fills/strokes are readonly arrays. Clone to modify:
const fills = JSON.parse(JSON.stringify(node.fills))
fills.push(newPaint)
node.fills = fills

// Strokes
node.strokes = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }]
node.strokeWeight = 2
node.strokeAlign = 'INSIDE' // 'CENTER' | 'OUTSIDE'
node.strokeCap = 'ROUND' // 'NONE' | 'SQUARE'
node.strokeJoin = 'ROUND' // 'MITER' | 'BEVEL'
node.dashPattern = [4, 4] // Dashed line
```

### Effects

```js
node.effects = [
  {
    type: 'DROP_SHADOW',
    color: { r: 0, g: 0, b: 0, a: 0.25 },
    offset: { x: 0, y: 4 },
    radius: 8,
    spread: 0,
    visible: true,
    blendMode: 'NORMAL',
  },
  {
    type: 'INNER_SHADOW',
    // same as DROP_SHADOW structure
  },
  {
    type: 'LAYER_BLUR',
    radius: 10,
    visible: true,
  },
  {
    type: 'BACKGROUND_BLUR',
    radius: 20,
    visible: true,
  },
]
```

### Corner Radius

```js
node.cornerRadius = 8 // Uniform
// Or per-corner:
node.topLeftRadius = 8
node.topRightRadius = 8
node.bottomLeftRadius = 0
node.bottomRightRadius = 0
```

## Text API

```js
// MUST load font before any text mutations
await figma.loadFontAsync({ family: 'Inter', style: 'Regular' })
await figma.loadFontAsync({ family: 'Inter', style: 'Bold' })

const text = figma.createText()
text.characters = 'Hello World'

// Whole-node properties
text.fontSize = 16
text.fontName = { family: 'Inter', style: 'Bold' }
text.textAlignHorizontal = 'CENTER' // 'LEFT' | 'RIGHT' | 'JUSTIFIED'
text.textAlignVertical = 'CENTER' // 'TOP' | 'BOTTOM'
text.lineHeight = { value: 24, unit: 'PIXELS' } // or { unit: 'AUTO' }
text.letterSpacing = { value: 0.5, unit: 'PIXELS' } // or { unit: 'PERCENT' }
text.textCase = 'UPPER' // 'ORIGINAL' | 'LOWER' | 'TITLE' | 'SMALL_CAPS'
text.textDecoration = 'UNDERLINE' // 'NONE' | 'STRIKETHROUGH'
text.paragraphSpacing = 12
text.paragraphIndent = 20
text.textAutoResize = 'WIDTH_AND_HEIGHT' // 'HEIGHT' | 'NONE' | 'TRUNCATE'
text.hyperlink = { type: 'URL', value: 'https://...' }

// Range-based styling
text.setRangeFontSize(start, end, 24)
text.setRangeFontName(start, end, { family: 'Inter', style: 'Bold' })
text.setRangeFills(start, end, [solidPaint])
text.setRangeTextDecoration(start, end, 'UNDERLINE')
text.setRangeHyperlink(start, end, { type: 'URL', value: 'https://...' })

// Read range properties
text.getRangeFontSize(start, end)
text.getRangeFontName(start, end)
text.getRangeAllFontNames(start, end) // For mixed-font text nodes
```

## Components & Instances

### ComponentNode

```js
const comp = figma.createComponent()
comp.key // string — unique key for publishing
comp.description // string
comp.documentationLinks // Array<{ uri: string }>
comp.remote // boolean — from a library?
comp.createInstance() // InstanceNode
```

### ComponentSetNode (Variant Container)

```js
componentSet.variantGroupProperties
// { "Size": { values: ["S", "M", "L"] }, "State": { values: ["Default", "Hover"] } }

componentSet.defaultVariant // ComponentNode — the default variant
componentSet.children // ReadonlyArray<ComponentNode> — all variants
```

### InstanceNode

```js
instance.mainComponent // ComponentNode | null
await instance.getMainComponentAsync() // ComponentNode | null (preferred)
instance.swapComponent(newComponent) // Swap to different component
instance.detachInstance() // Detach → becomes FrameNode
instance.resetOverrides() // Reset all overrides
instance.overrides // Array of overrides

// Exposed/nested instance properties
instance.componentProperties // Record<string, ComponentProperty>
instance.setProperties({ PropName: value })

// Instance swap property
instance.setProperties({ 'IconSlot#id': newComponent.key })
```

### Importing Components

```js
// Import published component by key
const comp = await figma.importComponentByKeyAsync('abc123...')

// Import published component set by key
const compSet = await figma.importComponentSetByKeyAsync('abc123...')

// Import style by key
const style = await figma.importStyleByKeyAsync('abc123...')
```

## Styles

```js
// Local styles
const paintStyles = await figma.getLocalPaintStylesAsync()
const textStyles = await figma.getLocalTextStylesAsync()
const effectStyles = await figma.getLocalEffectStylesAsync()
const gridStyles = await figma.getLocalGridStylesAsync()

// Create style
const style = figma.createPaintStyle()
style.name = 'Brand/Primary'
style.paints = [{ type: 'SOLID', color: { r: 0.2, g: 0.4, b: 1 } }]

// Apply style to node
node.fillStyleId = style.id
node.strokeStyleId = style.id
node.effectStyleId = effectStyle.id
node.textStyleId = textStyle.id // TextNode only
node.gridStyleId = gridStyle.id // FrameNode only
```

## Variables API

```js
// Collections
const collections = await figma.variables.getLocalVariableCollectionsAsync()
const collection = figma.variables.createVariableCollection('Tokens')

// Modes
collection.modes // [{ modeId: string, name: string }]
collection.addMode('Dark')
collection.renameMode(modeId, 'Light')
collection.removeMode(modeId)

// Variables
const variables = await figma.variables.getLocalVariablesAsync()
const variable = figma.variables.createVariable('primary', collection, 'COLOR')
// resolvedType: 'BOOLEAN' | 'FLOAT' | 'STRING' | 'COLOR'

variable.setValueForMode(modeId, { r: 0.2, g: 0.4, b: 1 })
variable.setValueForMode(darkModeId, { r: 0.3, g: 0.5, b: 1 })

// Alias (variable referencing another variable)
variable.setValueForMode(modeId, figma.variables.createVariableAlias(otherVariable))

// Bind to node
node.setBoundVariable('fills', 0, colorVariable) // Bind to first fill color
node.setBoundVariable('opacity', floatVariable)
node.setBoundVariable('visible', boolVariable)
node.setBoundVariable('itemSpacing', floatVariable) // Auto-layout spacing

// Read bindings
node.boundVariables // Record of bound variable aliases

// Consume by ID
const variable = await figma.variables.getVariableByIdAsync(id)
const collection = await figma.variables.getVariableCollectionByIdAsync(id)
```

## Constraints & Layout

### Constraints (non-auto-layout children)

```js
node.constraints = {
  horizontal: 'MIN', // 'MIN' | 'CENTER' | 'MAX' | 'STRETCH' | 'SCALE'
  vertical: 'MIN', // Same options
}
```

### Auto Layout (on FrameNode)

```js
frame.layoutMode = 'HORIZONTAL' // 'NONE' | 'HORIZONTAL' | 'VERTICAL'
frame.layoutWrap = 'WRAP' // 'NO_WRAP' | 'WRAP' (wrap auto-layout)
frame.primaryAxisAlignItems = 'SPACE_BETWEEN' // 'MIN' | 'CENTER' | 'MAX' | 'SPACE_BETWEEN'
frame.counterAxisAlignItems = 'CENTER' // 'MIN' | 'CENTER' | 'MAX' | 'BASELINE'
frame.primaryAxisSizingMode = 'AUTO' // 'FIXED' | 'AUTO' (hug contents)
frame.counterAxisSizingMode = 'FIXED'
frame.itemSpacing = 8
frame.counterAxisSpacing = 8 // Row gap (when wrap)
frame.paddingTop = frame.paddingBottom = frame.paddingLeft = frame.paddingRight = 16
frame.itemReverseZIndex = false // Stack order
frame.strokesIncludedInLayout = false // Include stroke in layout sizing

// Child properties
child.layoutAlign = 'STRETCH' // 'INHERIT' | 'STRETCH' | 'MIN' | 'CENTER' | 'MAX'
child.layoutGrow = 1 // 0 = fixed, 1 = fill
child.layoutPositioning = 'AUTO' // 'AUTO' | 'ABSOLUTE' (position absolutely within auto-layout)
child.minWidth = 100
child.maxWidth = 300
child.minHeight = 50
child.maxHeight = 200
```

## Reactions & Interactions

```js
// Read interactions on a node
node.reactions // Array<Reaction>

// Reaction structure:
{
  action: {
    type: 'NODE',          // Navigate to
    destinationId: 'nodeId',
    navigation: 'NAVIGATE', // 'NAVIGATE' | 'SWAP' | 'OVERLAY' | 'SCROLL_TO' | 'CHANGE_TO'
    transition: {
      type: 'DISSOLVE',    // 'DISSOLVE' | 'SMART_ANIMATE' | 'MOVE_IN' | 'PUSH' | etc.
      duration: 0.3,
      easing: { type: 'EASE_IN_AND_OUT' },
    },
  },
  trigger: {
    type: 'ON_CLICK',      // 'ON_CLICK' | 'ON_HOVER' | 'ON_PRESS' | 'ON_DRAG' | etc.
  },
}
```

## Images

```js
// Create image from bytes
const image = figma.createImage(uint8Array)
image.hash // string — use in IMAGE fill

// Read image bytes back
const bytes = await image.getBytesAsync() // Uint8Array

// Get image from existing fill
const imageHash = node.fills[0].imageHash
const image = figma.getImageByHash(imageHash)
const bytes = await image.getBytesAsync()
```

## Blend Modes

Available on nodes and paints:

```
'NORMAL' | 'DARKEN' | 'MULTIPLY' | 'LINEAR_BURN' | 'COLOR_BURN' |
'LIGHTEN' | 'SCREEN' | 'LINEAR_DODGE' | 'COLOR_DODGE' |
'OVERLAY' | 'SOFT_LIGHT' | 'HARD_LIGHT' |
'DIFFERENCE' | 'EXCLUSION' | 'HUE' | 'SATURATION' | 'COLOR' | 'LUMINOSITY'
```

## Plugin Parameters (Quick Actions)

Define parameters in `manifest.json` for Figma's quick actions menu:

```json
{
  "parameterOnly": true,
  "parameters": [
    { "name": "query", "key": "query", "description": "Search text", "allowFreeform": true },
    {
      "name": "color",
      "key": "color",
      "description": "Color name",
      "allowFreeform": false,
      "optional": true
    }
  ]
}
```

Handle in code:

```js
figma.parameters.on('input', ({ parameters, key, query, result }) => {
  // Suggest values
  result.setSuggestions([{ name: 'Red' }, { name: 'Blue' }])
})

figma.on('run', ({ parameters }) => {
  console.log(parameters.query, parameters.color)
})
```

## Events

```js
figma.on('selectionchange', () => {
  /* selection changed */
})
figma.on('currentpagechange', () => {
  /* page switched */
})
figma.on('close', () => {
  /* plugin closing */
})
figma.on('drop', (event) => {
  /* drag-and-drop onto canvas */
})
figma.on('run', ({ command, parameters }) => {
  /* plugin launched */
})
figma.on('documentchange', ({ documentChanges }) => {
  /* node changes */
})
```

## Timer / Async

```js
// setTimeout is available in the sandbox
setTimeout(() => {
  /* delayed action */
}, 1000)

// No setInterval — use recursive setTimeout instead:
function poll() {
  // do work
  setTimeout(poll, 1000)
}
```

## Close Plugin

```js
figma.closePlugin() // Close silently
figma.closePlugin('Done!') // Close with toast message
```
