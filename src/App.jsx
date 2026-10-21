import { useState, useCallback } from 'react';
import { ArrowLeft, Home, Scissors } from 'lucide-react';

import LandingPage from './components/LandingPage.jsx';
import ImageCutter from './components/ImageCutter.jsx';
import ImageResizer from './components/ImageResizer.jsx';
import ImageCompressor from './components/ImageCompressor.jsx';
import ImageConverter from './components/ImageConverter.jsx';
import ImageToPdf from './components/ImageToPdf.jsx';

/* ------------------------------------------------------------------ */
/*  Tool registry                                                      */
/*  Single source of truth for every workspace the app can open.       */
/* ------------------------------------------------------------------ */

const TOOLS = {
  cutter: { title: 'Image cutter & grid splitter', component: ImageCutter },
  resizer: { title: 'Image resizer', component: ImageResizer },
  compressor: { title: 'Compress image', component: ImageCompressor },
  converter: { title: 'Convert image format', component: ImageConverter },
  pdf: { title: 'Images to PDF', component: ImageToPdf },
};

const DEFAULT_TOOL = 'cutter';

/* ------------------------------------------------------------------ */
/*  App                                                                */
/* ------------------------------------------------------------------ */

export default function App() {
  // `null` means “show the landing page”; otherwise this is a tool id.
  const [activeTool, setActiveTool] = useState(null);

  const openTool = useCallback((id) => {
    const nextId = TOOLS[id] ? id : DEFAULT_TOOL;
    setActiveTool(nextId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const goHome = useCallback(() => {
    setActiveTool(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  /* -------------------------- Landing page -------------------------- */
  if (!activeTool) {
    return <LandingPage onLaunchApp={() => openTool(DEFAULT_TOOL)} onOpenTool={openTool} />;
  }

  /* --------------------------- Tool view --------------------------- */
  const { title, component: Tool } = TOOLS[activeTool];

  return (
    <div className="app-shell">
      <header className="topbar">
        <button type="button" className="brand" onClick={goHome} aria-label="CutMage home">
          <span className="brand-mark">
            <Scissors size={20} />
          </span>
          CutMage<span className="dot">.</span>
        </button>

        <div className="top-actions">
          <button type="button" className="btn btn-light" onClick={goHome}>
            <Home size={16} /> Home
          </button>
          <button type="button" className="btn btn-light" onClick={goHome}>
            <ArrowLeft size={16} /> All tools
          </button>
        </div>
      </header>

      <main className="tool-page">
        <div className="tool-title">
          <p className="eyebrow">CutMage workspace</p>
          <h1>{title}</h1>
          <p>Simple image tools that work right in your browser.</p>
        </div>

        <Tool />
      </main>

      <footer className="footer compact">
        <span>© {new Date().getFullYear()} CutMage</span>
        <span>Private by design · No account required</span>
      </footer>
    </div>
  );
}