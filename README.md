# CutMage 2.0 — Redesigned project

Responsive React + Vite image toolkit using your palette:
- Cream `#F7F1DE`
- Sage `#B0BA99`
- Brown `#9D6638`
- Deep brown `#4E220F`

## Included
- Redesigned landing page with five service cards
- Image cutter with Box Select and Grid Lines
- Pointer Events for touch, pen, and mouse input
- Improved mobile line selection, line list, and delete controls
- Contrast-based heuristic auto-detection (not AI/ML)
- Image resizer with aspect-ratio lock and output formats
- Batch image compression
- Batch image conversion with ZIP download
- Multi-image PDF creator with page reorder, size, orientation, and margins
- ZIP download for all image cutter crops

## Run locally
Requires Node.js compatible with Vite 8.

```bash
npm install
npm run dev
```

Build for deployment:

```bash
npm run build
```

## Important implementation notes
- Core processing happens locally in the browser; this project does not upload images to a CutMage server.
- The cutter uses Pointer Events and calculates coordinates using the displayed canvas bounding rectangle mapped to the original image pixels. This avoids the previous `offsetX / zoom` coordinate mismatch and supports touch dragging.
- Auto-detection compares pixels with the average corner color. It is heuristic and will not correctly identify every image; let users adjust detections manually.
- Browser support for image formats varies. JPEG cannot retain transparency and is flattened onto white.
- Large images can consume significant browser memory.
