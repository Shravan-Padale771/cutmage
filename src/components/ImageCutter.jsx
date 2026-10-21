import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import JSZip from 'jszip';
import {
  Upload, Scissors, Grid2X2, MousePointer2, WandSparkles, Trash2,
  Download, Minus, Plus, RotateCcw, X, Image as ImageIcon, LockKeyhole,
  CheckCircle2, MoveHorizontal, MoveVertical,
} from 'lucide-react';
import { loadImage, safeName } from '../lib/imageUtils.js';

const MIN_SIZE = 8;
const DEFAULT_SENSITIVITY = 42;
const DEFAULT_MERGE_GAP = 14;

/* ------------------------------------------------------------------ */
/*  Region helpers                                                     */
/* ------------------------------------------------------------------ */

function normaliseBox(b) {
  return {
    id: b.id,
    x: Math.min(b.x, b.x + b.w),
    y: Math.min(b.y, b.y + b.h),
    w: Math.abs(b.w),
    h: Math.abs(b.h),
  };
}

function mergeBoxes(boxes, gap) {
  if (gap <= 0) return boxes;
  const result = [];
  const used = new Array(boxes.length).fill(false);

  for (let i = 0; i < boxes.length; i += 1) {
    if (used[i]) continue;
    let current = { ...boxes[i] };
    used[i] = true;

    let changed = true;
    while (changed) {
      changed = false;
      for (let j = 0; j < boxes.length; j += 1) {
        if (used[j]) continue;
        const other = boxes[j];
        const aRight = current.x + current.w;
        const aBottom = current.y + current.h;
        const bRight = other.x + other.w;
        const bBottom = other.y + other.h;

        const overlapX = current.x <= bRight + gap && other.x <= aRight + gap;
        const overlapY = current.y <= bBottom + gap && other.y <= aBottom + gap;

        if (overlapX && overlapY) {
          const x1 = Math.min(current.x, other.x);
          const y1 = Math.min(current.y, other.y);
          const x2 = Math.max(aRight, bRight);
          const y2 = Math.max(aBottom, bBottom);
          current = { ...current, x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
          used[j] = true;
          changed = true;
        }
      }
    }
    result.push(current);
  }
  return result;
}

/* ------------------------------------------------------------------ */
/*  Auto-detect engine                                                 */
/* ------------------------------------------------------------------ */

function detectRegions(image, { sensitivity, mergeGap }) {
  const scale = Math.min(1, 900 / image.naturalWidth, 900 / image.naturalHeight);
  const w = Math.max(1, Math.floor(image.naturalWidth * scale));
  const h = Math.max(1, Math.floor(image.naturalHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(image, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;

  const corners = [[0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1]];
  const bg = [0, 0, 0];
  corners.forEach(([x, y]) => {
    const i = (y * w + x) * 4;
    bg[0] += data[i] / 4;
    bg[1] += data[i + 1] / 4;
    bg[2] += data[i + 2] / 4;
  });

  const mask = new Uint8Array(w * h);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const i = (y * w + x) * 4;
      const dr = data[i] - bg[0];
      const dg = data[i + 1] - bg[1];
      const db = data[i + 2] - bg[2];
      if (Math.hypot(dr, dg, db) > sensitivity) mask[y * w + x] = 1;
    }
  }

  const visited = new Uint8Array(w * h);
  const boxes = [];
  const stack = [];
  const PADDING = 4;
  const MIN_AREA = 250;

  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const idx = y * w + x;
      if (!mask[idx] || visited[idx]) continue;

      let minX = x;
      let maxX = x;
      let minY = y;
      let maxY = y;

      stack.length = 0;
      stack.push(idx);
      visited[idx] = 1;

      while (stack.length) {
        const cur = stack.pop();
        const cy = Math.floor(cur / w);
        const cx = cur - cy * w;
        if (cx < minX) minX = cx;
        if (cx > maxX) maxX = cx;
        if (cy < minY) minY = cy;
        if (cy > maxY) maxY = cy;

        const neighbours = [cur - 1, cur + 1, cur - w, cur + w];
        for (let k = 0; k < neighbours.length; k += 1) {
          const n = neighbours[k];
          if (n < 0 || n >= w * h || visited[n] || !mask[n]) continue;
          if (k === 0 && n % w === w - 1) continue;
          if (k === 1 && n % w === 0) continue;
          visited[n] = 1;
          stack.push(n);
        }
      }

      const bw = maxX - minX + 1;
      const bh = maxY - minY + 1;
      if (bw * bh < MIN_AREA) continue;

      const x0 = Math.max(0, (minX - PADDING) / scale);
      const y0 = Math.max(0, (minY - PADDING) / scale);
      const x1 = Math.min(image.naturalWidth, (maxX + 1 + PADDING) / scale);
      const y1 = Math.min(image.naturalHeight, (maxY + 1 + PADDING) / scale);

      boxes.push({
        id: `auto-${Date.now()}-${boxes.length}`,
        x: x0,
        y: y0,
        w: x1 - x0,
        h: y1 - y0,
      });
    }
  }

  return mergeBoxes(boxes, mergeGap * scale);
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function ImageCutter() {
  const [src, setSrc] = useState(null);
  const [dims, setDims] = useState({ width: 0, height: 0 });
  const [filename, setFilename] = useState('image');

  const [mode, setMode] = useState('box');
  const [boxes, setBoxes] = useState([]);
  const [vLines, setVLines] = useState([]);
  const [hLines, setHLines] = useState([]);
  const [lineMode, setLineMode] = useState('vertical');
  const [selectedBox, setSelectedBox] = useState(null);
  const [selectedLine, setSelectedLine] = useState(null);
  const [interaction, setInteraction] = useState(null);

  const [padding, setPadding] = useState(0);
  const [prefix, setPrefix] = useState('cutmage-crop');
  const [zoom, setZoom] = useState(1);

  const [sensitivity, setSensitivity] = useState(DEFAULT_SENSITIVITY);
  const [mergeGap, setMergeGap] = useState(DEFAULT_MERGE_GAP);

  const [busy, setBusy] = useState(false);
  const [zipping, setZipping] = useState(false);
  const [notice, setNotice] = useState('');
  const [preview, setPreview] = useState(null);
  const [crops, setCrops] = useState([]);

  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const dragRef = useRef(null);
  const canvasAreaRef = useRef(null);

  /* -------------------------------------------------------------- */
  /*  Measure available width for fitting the image                  */
  /* -------------------------------------------------------------- */

  const [containerWidth, setContainerWidth] = useState(800);

  useEffect(() => {
    const measure = () => {
      const el = canvasAreaRef.current;
      if (el) setContainerWidth(Math.max(240, el.clientWidth - 48));
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [src]);

  const view = useMemo(() => {
    const im = imageRef.current;
    if (!im) return { width: 0, height: 0 };
    const fit = Math.min(1, containerWidth / im.naturalWidth);
    return {
      width: im.naturalWidth * fit * zoom,
      height: im.naturalHeight * fit * zoom,
    };
  }, [containerWidth, zoom, src]);

  /* -------------------------------------------------------------- */
  /*  Canvas drawing                                                 */
  /* -------------------------------------------------------------- */

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const im = imageRef.current;
    if (!canvas || !im) return;

    const ctx = canvas.getContext('2d');
    canvas.width = im.naturalWidth;
    canvas.height = im.naturalHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(im, 0, 0);

    if (mode === 'box') {
      boxes.forEach((rawBox, i) => {
        const b = normaliseBox(rawBox);
        const selected = b.id === selectedBox;
        ctx.fillStyle = selected ? 'rgba(157,102,56,.20)' : 'rgba(176,186,153,.16)';
        ctx.strokeStyle = selected ? '#9D6638' : '#4E220F';
        ctx.lineWidth = selected ? 5 : 3;
        ctx.fillRect(b.x, b.y, b.w, b.h);
        ctx.strokeRect(b.x, b.y, b.w, b.h);

        const r = Math.max(9, 11 / zoom);
        [
          [b.x, b.y],
          [b.x + b.w, b.y],
          [b.x, b.y + b.h],
          [b.x + b.w, b.y + b.h],
        ].forEach(([hx, hy]) => {
          ctx.beginPath();
          ctx.arc(hx, hy, r, 0, Math.PI * 2);
          ctx.fillStyle = '#F7F1DE';
          ctx.fill();
          ctx.stroke();
        });

        ctx.fillStyle = '#4E220F';
        ctx.font = `bold ${Math.max(16, 16 / zoom)}px sans-serif`;
        ctx.fillText(String(i + 1), b.x + 7, Math.max(18, b.y + 20));
      });

      if (interaction?.action === 'draw' && interaction.draft) {
        const d = interaction.draft;
        ctx.strokeStyle = '#9D6638';
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 6]);
        ctx.strokeRect(
          Math.min(d.x, d.x + d.w),
          Math.min(d.y, d.y + d.h),
          Math.abs(d.w),
          Math.abs(d.h),
        );
        ctx.setLineDash([]);
      }
    } else {
      const drawLine = (coord, vertical, index) => {
        const selected =
          selectedLine?.type === (vertical ? 'v' : 'h') && selectedLine.index === index;

        ctx.beginPath();
        if (vertical) {
          ctx.moveTo(coord, 0);
          ctx.lineTo(coord, canvas.height);
        } else {
          ctx.moveTo(0, coord);
          ctx.lineTo(canvas.width, coord);
        }
        ctx.strokeStyle = selected ? '#9D6638' : vertical ? '#4E220F' : '#8b9873';
        ctx.lineWidth = selected ? Math.max(5, 5 / zoom) : Math.max(3, 3 / zoom);
        ctx.setLineDash(selected ? [] : [10, 7]);
        ctx.stroke();
        ctx.setLineDash([]);

        const mid = vertical ? canvas.height / 2 : canvas.width / 2;
        ctx.fillStyle = selected ? '#9D6638' : '#F7F1DE';
        ctx.strokeStyle = '#4E220F';
        ctx.lineWidth = 2;
        ctx.beginPath();
        if (vertical) {
          ctx.roundRect(coord - 12 / zoom, mid - 25 / zoom, 24 / zoom, 50 / zoom, 8 / zoom);
        } else {
          ctx.roundRect(mid - 25 / zoom, coord - 12 / zoom, 50 / zoom, 24 / zoom, 8 / zoom);
        }
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#4E220F';
        ctx.font = `bold ${Math.max(14, 14 / zoom)}px sans-serif`;
        ctx.fillText(
          vertical ? '↔' : '↕',
          vertical ? coord - 7 / zoom : mid - 5 / zoom,
          vertical ? mid + 5 / zoom : coord + 5 / zoom,
        );
      };

      vLines.forEach((x, i) => drawLine(x, true, i));
      hLines.forEach((y, i) => drawLine(y, false, i));
    }
  }, [mode, boxes, vLines, hLines, selectedBox, selectedLine, interaction, zoom]);

  useEffect(() => {
    draw();
  }, [draw, view]);

  /* -------------------------------------------------------------- */
  /*  Upload                                                         */
  /* -------------------------------------------------------------- */

  const upload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      if (!file.type.startsWith('image/')) throw new Error('Choose a valid image file.');
      const url = URL.createObjectURL(file);
      const image = await loadImage(url);
      if (imageRef.current?.src?.startsWith('blob:')) {
        URL.revokeObjectURL(imageRef.current.src);
      }
      imageRef.current = image;
      setSrc(url);
      setDims({ width: image.naturalWidth, height: image.naturalHeight });
      setFilename(file.name);
      setPrefix(`${safeName(file.name)}-crop`);
      setBoxes([]);
      setVLines([]);
      setHLines([]);
      setCrops([]);
      setSelectedBox(null);
      setSelectedLine(null);
      setNotice('');
      setZoom(1);
    } catch (err) {
      setNotice(err.message || 'Could not open image.');
    }
    event.target.value = '';
  };

  /* -------------------------------------------------------------- */
  /*  Pointer helpers                                                */
  /* -------------------------------------------------------------- */

  const point = (event) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(canvas.width, ((event.clientX - rect.left) * canvas.width) / rect.width)),
      y: Math.max(0, Math.min(canvas.height, ((event.clientY - rect.top) * canvas.height) / rect.height)),
    };
  };

  const boxHit = (x, y) => {
    const tolerance = Math.max(18, 24 / zoom);
    for (let i = boxes.length - 1; i >= 0; i -= 1) {
      const b = normaliseBox(boxes[i]);
      const handles = [
        ['tl', b.x, b.y],
        ['tr', b.x + b.w, b.y],
        ['bl', b.x, b.y + b.h],
        ['br', b.x + b.w, b.y + b.h],
      ];
      for (const [corner, hx, hy] of handles) {
        if (Math.abs(x - hx) < tolerance && Math.abs(y - hy) < tolerance) {
          return { index: i, action: `resize-${corner}` };
        }
      }
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
        return { index: i, action: 'move' };
      }
    }
    return null;
  };

  const lineHit = (x, y) => {
    const tolerance = Math.max(18, 25 / zoom);
    let best = null;
    let distance = Infinity;
    vLines.forEach((v, i) => {
      const d = Math.abs(v - x);
      if (d < tolerance && d < distance) {
        best = { type: 'v', index: i };
        distance = d;
      }
    });
    hLines.forEach((v, i) => {
      const d = Math.abs(v - y);
      if (d < tolerance && d < distance) {
        best = { type: 'h', index: i };
        distance = d;
      }
    });
    return best;
  };

  /* -------------------------------------------------------------- */
  /*  Pointer events                                                 */
  /* -------------------------------------------------------------- */

  const handlePointerDown = (event) => {
    if (!src) return;
    event.preventDefault();
    canvasRef.current?.setPointerCapture?.(event.pointerId);
    const p = point(event);

    if (mode === 'box') {
      const hit = boxHit(p.x, p.y);
      if (hit) {
        const box = normaliseBox(boxes[hit.index]);
        const state = { ...hit, start: p, original: { ...box }, pointerId: event.pointerId };
        dragRef.current = state;
        setInteraction(state);
        setSelectedBox(box.id);
      } else {
        const state = {
          action: 'draw',
          start: p,
          draft: { x: p.x, y: p.y, w: 0, h: 0 },
          pointerId: event.pointerId,
        };
        dragRef.current = state;
        setInteraction(state);
        setSelectedBox(null);
      }
    } else {
      const hit = lineHit(p.x, p.y);
      if (hit) {
        setSelectedLine(hit);
        const state = { action: 'line', hit, start: p, pointerId: event.pointerId };
        dragRef.current = state;
        setInteraction(state);
      } else {
        const isVertical = lineMode === 'vertical';
        const newLine = isVertical
          ? { type: 'v', index: vLines.length }
          : { type: 'h', index: hLines.length };
        if (isVertical) setVLines((prev) => [...prev, p.x]);
        else setHLines((prev) => [...prev, p.y]);
        setSelectedLine(newLine);
        const state = { action: 'line', hit: newLine, start: p, pointerId: event.pointerId };
        dragRef.current = state;
        setInteraction(state);
      }
    }
  };

  const handlePointerMove = (event) => {
    const state = dragRef.current;
    if (!state || !src) return;
    const p = point(event);
    const dx = p.x - state.start.x;
    const dy = p.y - state.start.y;

    if (state.action === 'draw') {
      const next = { ...state, draft: { x: state.start.x, y: state.start.y, w: dx, h: dy } };
      dragRef.current = next;
      setInteraction(next);
    } else if (state.action === 'line') {
      const value = state.hit.type === 'v' ? p.x : p.y;
      if (state.hit.type === 'v') {
        setVLines((prev) => prev.map((n, i) => (i === state.hit.index ? value : n)));
      } else {
        setHLines((prev) => prev.map((n, i) => (i === state.hit.index ? value : n)));
      }
    } else {
      const box = { ...state.original };
      if (state.action === 'move') {
        box.x += dx;
        box.y += dy;
      }
      if (state.action === 'resize-br') {
        box.w += dx;
        box.h += dy;
      }
      if (state.action === 'resize-tl') {
        box.x += dx;
        box.y += dy;
        box.w -= dx;
        box.h -= dy;
      }
      if (state.action === 'resize-tr') {
        box.y += dy;
        box.w += dx;
        box.h -= dy;
      }
      if (state.action === 'resize-bl') {
        box.x += dx;
        box.w -= dx;
        box.h += dy;
      }
      setBoxes((prev) => prev.map((item, i) => (i === state.index ? box : item)));
    }
  };

  const handlePointerUp = () => {
    const state = dragRef.current;
    if (!state) return;

    if (state.action === 'draw' && state.draft) {
      const draft = state.draft;
      const x = Math.min(draft.x, draft.x + draft.w);
      const y = Math.min(draft.y, draft.y + draft.h);
      const w = Math.abs(draft.w);
      const h = Math.abs(draft.h);
      if (w > MIN_SIZE && h > MIN_SIZE) {
        const id = `box-${Date.now()}`;
        setBoxes((prev) => [...prev, { id, x, y, w, h }]);
        setSelectedBox(id);
      }
    } else if (state.action?.startsWith('resize')) {
      setBoxes((prev) => prev.map((b, i) => (i === state.index ? normaliseBox(b) : b)));
    }

    dragRef.current = null;
    setInteraction(null);
  };

  /* -------------------------------------------------------------- */
  /*  Selection helpers                                              */
  /* -------------------------------------------------------------- */

  const removeSelected = useCallback(() => {
    if (mode === 'box' && selectedBox) {
      setBoxes((prev) => prev.filter((b) => b.id !== selectedBox));
      setSelectedBox(null);
    } else if (mode === 'grid' && selectedLine) {
      if (selectedLine.type === 'v') {
        setVLines((prev) => prev.filter((_, i) => i !== selectedLine.index));
      } else {
        setHLines((prev) => prev.filter((_, i) => i !== selectedLine.index));
      }
      setSelectedLine(null);
    }
  }, [mode, selectedBox, selectedLine]);

  useEffect(() => {
    const handler = (event) => {
      const tag = document.activeElement?.tagName;
      if (
        (event.key === 'Delete' || event.key === 'Backspace') &&
        !['INPUT', 'TEXTAREA'].includes(tag)
      ) {
        event.preventDefault();
        removeSelected();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [removeSelected]);

  /* -------------------------------------------------------------- */
  /*  Auto-detect                                                    */
  /* -------------------------------------------------------------- */

  const autoDetect = async () => {
    if (!imageRef.current) return;
    setBusy(true);
    setNotice('');
    try {
      await new Promise(requestAnimationFrame);
      const found = detectRegions(imageRef.current, { sensitivity, mergeGap });
      if (!found.length) {
        setNotice('No regions found. Lower the sensitivity or try manual boxes.');
      } else {
        setBoxes(found);
        setSelectedBox(found[0].id);
        setNotice(`Found ${found.length} region${found.length > 1 ? 's' : ''}. Review before exporting.`);
      }
    } catch {
      setNotice('Auto-detection failed for this image. Try manual selection.');
    } finally {
      setBusy(false);
    }
  };

  /* -------------------------------------------------------------- */
  /*  Crop generation                                                */
  /* -------------------------------------------------------------- */

  const generate = () => {
    const image = imageRef.current;
    if (!image) return;

    let regions = [];

    if (mode === 'box') {
      regions = boxes.map(normaliseBox);
    } else {
      const xs = [0, ...vLines.filter((v) => v > 0 && v < dims.width).sort((a, b) => a - b), dims.width];
      const ys = [0, ...hLines.filter((v) => v > 0 && v < dims.height).sort((a, b) => a - b), dims.height];
      for (let r = 0; r < ys.length - 1; r += 1) {
        for (let c = 0; c < xs.length - 1; c += 1) {
          const w = xs[c + 1] - xs[c];
          const h = ys[r + 1] - ys[r];
          if (w > MIN_SIZE && h > MIN_SIZE) {
            regions.push({ x: xs[c], y: ys[r], w, h });
          }
        }
      }
    }

    if (!regions.length) {
      setNotice(mode === 'box' ? 'Draw at least one box first.' : 'Add at least one grid line first.');
      return;
    }

    try {
      const output = regions.map((rawBox, i) => {
        const b = normaliseBox(rawBox);
        const x = Math.max(0, Math.round(b.x));
        const y = Math.max(0, Math.round(b.y));
        const w = Math.min(image.naturalWidth - x, Math.round(b.w));
        const h = Math.min(image.naturalHeight - y, Math.round(b.h));

        const canvas = document.createElement('canvas');
        canvas.width = w + padding * 2;
        canvas.height = h + padding * 2;
        const ctx = canvas.getContext('2d');
        if (padding > 0) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        ctx.drawImage(image, x, y, w, h, padding, padding, w, h);

        return {
          id: `crop-${i}`,
          name: `${safeName(prefix)}-${String(i + 1).padStart(2, '0')}.png`,
          width: canvas.width,
          height: canvas.height,
          url: canvas.toDataURL('image/png'),
        };
      });

      setCrops(output);
      setNotice(`${output.length} crop${output.length > 1 ? 's' : ''} generated.`);
      setTimeout(() => {
        document.getElementById('crop-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 120);
    } catch {
      setNotice('Could not generate crops. Try fewer regions or a smaller image.');
    }
  };

  /* -------------------------------------------------------------- */
  /*  Downloads                                                      */
  /* -------------------------------------------------------------- */

  const downloadOne = (crop) => {
    const a = document.createElement('a');
    a.href = crop.url;
    a.download = crop.name;
    a.click();
  };

  const downloadZip = async () => {
    if (!crops.length) return;
    setZipping(true);
    try {
      const zip = new JSZip();
      crops.forEach((crop) => {
        zip.file(crop.name, crop.url.split(',')[1], { base64: true });
      });
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${safeName(prefix)}.zip`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    } catch {
      setNotice('ZIP creation failed. Try fewer or smaller crops.');
    } finally {
      setZipping(false);
    }
  };

  /* -------------------------------------------------------------- */
  /*  Misc actions                                                   */
  /* -------------------------------------------------------------- */

  const clearSelections = () => {
    if (mode === 'box') setBoxes([]);
    else {
      setVLines([]);
      setHLines([]);
    }
    setSelectedBox(null);
    setSelectedLine(null);
    dragRef.current = null;
    setInteraction(null);
    setCrops([]);
    setNotice('');
  };

  const removeLine = (type, index) => {
    if (type === 'v') setVLines((prev) => prev.filter((_, i) => i !== index));
    else setHLines((prev) => prev.filter((_, i) => i !== index));
    setSelectedLine(null);
  };

  /* -------------------------------------------------------------- */
  /*  Render                                                         */
  /* -------------------------------------------------------------- */

  return (
    <div className="cutter-layout">
      {/* --------------------------- Sidebar --------------------------- */}
      <aside className="cutter-panel">
        <div className="panel-heading">
          <span className="panel-icon">
            <Scissors size={20} />
          </span>
          <div>
            <h2>Image cutter</h2>
            <p>Mark regions, then export.</p>
          </div>
        </div>

        <div className="segmented">
          <button
            type="button"
            className={mode === 'box' ? 'active' : ''}
            onClick={() => {
              setMode('box');
              setSelectedLine(null);
              setInteraction(null);
              dragRef.current = null;
            }}
          >
            <MousePointer2 size={15} /> Box select
          </button>
          <button
            type="button"
            className={mode === 'grid' ? 'active' : ''}
            onClick={() => {
              setMode('grid');
              setSelectedBox(null);
              setInteraction(null);
              dragRef.current = null;
            }}
          >
            <Grid2X2 size={15} /> Grid lines
          </button>
        </div>

        <label className="field-label">Image source</label>
        <label className="upload">
          <Upload size={21} />
          <span>
            <b>{src ? 'Choose another image' : 'Upload an image'}</b>
            <small>PNG, JPG, WebP · local processing</small>
          </span>
          <input type="file" accept="image/*" onChange={upload} />
        </label>

        {src && (
          <div className="file-meta">
            <span>{filename}</span>
            <small>{dims.width} × {dims.height}</small>
          </div>
        )}

        {mode === 'grid' ? (
          <>
            <label className="field-label">Add grid line</label>
            <div className="segmented small-segmented">
              <button
                type="button"
                className={lineMode === 'vertical' ? 'active' : ''}
                onClick={() => setLineMode('vertical')}
              >
                <MoveHorizontal size={14} /> Vertical
              </button>
              <button
                type="button"
                className={lineMode === 'horizontal' ? 'active' : ''}
                onClick={() => setLineMode('horizontal')}
              >
                <MoveVertical size={14} /> Horizontal
              </button>
            </div>
            <p className="hint">
              Click the image to add a line. Drag to move, or pick one below to delete.
            </p>

            {selectedLine && (
              <button type="button" className="btn btn-danger full" onClick={removeSelected}>
                <Trash2 size={15} /> Delete selected line
              </button>
            )}

            {(vLines.length + hLines.length) > 0 && (
              <div className="line-list">
                {vLines.map((v, i) => (
                  <div
                    key={`v${i}`}
                    className={`line-row${selectedLine?.type === 'v' && selectedLine.index === i ? ' chosen' : ''}`}
                  >
                    <button type="button" onClick={() => setSelectedLine({ type: 'v', index: i })}>
                      <i className="v-chip" /> Vertical {i + 1}
                      <small>{Math.round(v)} px</small>
                    </button>
                    <button
                      type="button"
                      className="line-x"
                      onClick={() => removeLine('v', i)}
                      aria-label="Remove vertical line"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
                {hLines.map((v, i) => (
                  <div
                    key={`h${i}`}
                    className={`line-row${selectedLine?.type === 'h' && selectedLine.index === i ? ' chosen' : ''}`}
                  >
                    <button type="button" onClick={() => setSelectedLine({ type: 'h', index: i })}>
                      <i className="h-chip" /> Horizontal {i + 1}
                      <small>{Math.round(v)} px</small>
                    </button>
                    <button
                      type="button"
                      className="line-x"
                      onClick={() => removeLine('h', i)}
                      aria-label="Remove horizontal line"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <label className="field-label row-label">
              Automatic detection <span className="beta">BETA</span>
            </label>
            <button
              type="button"
              className="btn btn-sage full"
              disabled={!src || busy}
              onClick={autoDetect}
            >
              <WandSparkles size={16} />
              {busy ? 'Scanning image…' : 'Auto-detect regions'}
            </button>

            <div className="slider-field">
              <div className="slider-head">
                <span>Sensitivity</span>
                <b>{sensitivity}</b>
              </div>
              <input
                type="range"
                min="10"
                max="90"
                step="1"
                value={sensitivity}
                onChange={(e) => setSensitivity(Number(e.target.value))}
              />
              <div className="slider-ends">
                <span>Precise</span>
                <span>Broad</span>
              </div>
            </div>

            <div className="slider-field">
              <div className="slider-head">
                <span>Merge distance</span>
                <b>{mergeGap} px</b>
              </div>
              <input
                type="range"
                min="0"
                max="150"
                step="1"
                value={mergeGap}
                onChange={(e) => setMergeGap(Number(e.target.value))}
              />
              <div className="slider-ends">
                <span>Keep separate</span>
                <span>Merge far</span>
              </div>
            </div>
          </>
        )}

        <hr className="rule" />

        <div className="field-grid">
          <div>
            <label className="field-label">White padding (px)</label>
            <input
              className="input"
              type="number"
              min="0"
              max="500"
              value={padding}
              onChange={(e) => setPadding(Math.max(0, Math.min(500, Number(e.target.value) || 0)))}
            />
          </div>
          <div>
            <label className="field-label">File name prefix</label>
            <input className="input" value={prefix} onChange={(e) => setPrefix(e.target.value)} />
          </div>
        </div>

        <div className="row-label">
          <label className="field-label">Canvas zoom</label>
          <b className="beta">{Math.round(zoom * 100)}%</b>
        </div>
        <div className="zoom-controls">
          <button
            type="button"
            className="icon-btn"
            onClick={() => setZoom((z) => Math.max(0.25, +(z - 0.15).toFixed(2)))}
          >
            <Minus size={15} />
          </button>
          <input
            type="range"
            min="0.25"
            max="2.5"
            step="0.05"
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
          />
          <button
            type="button"
            className="icon-btn"
            onClick={() => setZoom((z) => Math.min(2.5, +(z + 0.15).toFixed(2)))}
          >
            <Plus size={15} />
          </button>
          <button type="button" className="icon-btn" onClick={() => setZoom(1)}>
            <RotateCcw size={14} />
          </button>
        </div>

        {notice && (
          <div className="notice">
            <CheckCircle2 size={15} />
            {notice}
          </div>
        )}

        <div className="actions">
          <button type="button" className="btn btn-light full" onClick={clearSelections}>
            <RotateCcw size={15} /> Clear selections
          </button>
          {mode === 'box' && selectedBox && (
            <button type="button" className="btn btn-danger full" onClick={removeSelected}>
              <Trash2 size={15} /> Delete selected box
            </button>
          )}
          <button type="button" className="btn btn-primary full" disabled={!src} onClick={generate}>
            <Scissors size={16} /> Generate crops
          </button>
        </div>

        <p className="privacy-note">
          <LockKeyhole size={13} /> Your image stays in this browser.
        </p>
      </aside>

      {/* --------------------------- Workspace --------------------------- */}
      <section className="workspace">
        <div className="workspace-top">
          <span>
            <i /> {src ? 'Editing image' : 'Workspace ready'}
          </span>
          <small>
            {mode === 'box'
              ? 'Drag to draw · drag a box to move'
              : 'Click to add line · drag line to move'}
          </small>
        </div>

        <div className="canvas-area" ref={canvasAreaRef}>
          {src ? (
            <div
              className="canvas-stage"
              style={{ width: view.width || undefined, height: view.height || undefined }}
            >
              <canvas
                ref={canvasRef}
                style={{
                  width: view.width || 'auto',
                  height: view.height || 'auto',
                  touchAction: 'none',
                  display: 'block',
                }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
              />
            </div>
          ) : (
            <div className="empty-state">
              <span className="empty-icon">
                <ImageIcon size={32} />
              </span>
              <h3>Your canvas is ready</h3>
              <p>Upload an image to start cutting it into separate pieces.</p>
              <label className="btn btn-primary">
                Choose image
                <input type="file" accept="image/*" onChange={upload} />
              </label>
              <small>PNG, JPG, or WebP · no account needed</small>
            </div>
          )}
        </div>

        {src && (
          <div className="workspace-bottom">
            <span>{dims.width} × {dims.height} px</span>
            <span>
              {mode === 'box'
                ? `${boxes.length} box${boxes.length === 1 ? '' : 'es'}`
                : `${vLines.length + hLines.length} grid lines`}
            </span>
          </div>
        )}
      </section>

      {/* --------------------------- Results --------------------------- */}
      {crops.length > 0 && (
        <section id="crop-results" className="crop-results">
          <div className="results-head">
            <div>
              <small className="eyebrow">EXPORTS</small>
              <h2>
                Generated crops <span className="count">{crops.length}</span>
              </h2>
              <p>Preview a crop or download the complete set.</p>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={downloadZip}
              disabled={zipping}
            >
              <Download size={16} /> {zipping ? 'Creating ZIP…' : 'Download all as ZIP'}
            </button>
          </div>

          <div className="crop-grid">
            {crops.map((crop) => (
              <article className="crop-card" key={crop.id}>
                <button type="button" className="crop-image" onClick={() => setPreview(crop)}>
                  <img src={crop.url} alt={crop.name} />
                  <span>Preview</span>
                </button>
                <div className="crop-foot">
                  <span title={crop.name}>{crop.name}</span>
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => downloadOne(crop)}
                    aria-label={`Download ${crop.name}`}
                  >
                    <Download size={15} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* --------------------------- Preview --------------------------- */}
      {preview && (
        <div className="modal-bg" onClick={() => setPreview(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <b>{preview.name}</b>
              <button type="button" className="icon-btn" onClick={() => setPreview(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-img checker">
              <img src={preview.url} alt={preview.name} />
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-light" onClick={() => setPreview(null)}>
                Close
              </button>
              <button type="button" className="btn btn-primary" onClick={() => downloadOne(preview)}>
                <Download size={15} /> Download image
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}