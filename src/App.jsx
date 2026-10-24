import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Home, Scissors } from 'lucide-react';

import LandingPage from './components/LandingPage.jsx';
import ImageCutter from './components/ImageCutter.jsx';
import ImageResizer from './components/ImageResizer.jsx';
import ImageCompressor from './components/ImageCompressor.jsx';
import ImageConverter from './components/ImageConverter.jsx';
import ImageToPdf from './components/ImageToPdf.jsx';

/* ------------------------------------------------------------------ */
/*  Tool registry                                                      */
/*  Each tool owns a URL path so links are real, shareable, and        */
/*  the browser back / forward buttons work as expected.               */
/* ------------------------------------------------------------------ */

const TOOLS = {
  cutter: {
    path: '/image-cutter',
    title: 'Image cutter & grid splitter',
    component: ImageCutter,
  },
  resizer: {
    path: '/image-resizer',
    title: 'Image resizer',
    component: ImageResizer,
  },
  compressor: {
    path: '/image-compressor',
    title: 'Compress image',
    component: ImageCompressor,
  },
  converter: {
    path: '/image-converter',
    title: 'Convert image format',
    component: ImageConverter,
  },
  pdf: {
    path: '/images-to-pdf',
    title: 'Images to PDF',
    component: ImageToPdf,
  },
};

const DEFAULT_TOOL = 'cutter';

/* Map a pathname back to a tool id, or null for the landing page. */
function toolFromPath(pathname) {
  const clean = (pathname || '/').replace(/\/+$/, '') || '/';
  if (clean === '/') return null;
  const entry = Object.entries(TOOLS).find(([, tool]) => tool.path === clean);
  return entry ? entry[0] : null;
}

/* ------------------------------------------------------------------ */
/*  App                                                                */
/* ------------------------------------------------------------------ */

export default function App() {
  const [activeTool, setActiveTool] = useState(() => toolFromPath(window.location.pathname));

  /* Keep state in sync with the address bar (back / forward). */
  useEffect(() => {
    const handlePopState = () => {
      setActiveTool(toolFromPath(window.location.pathname));
      window.scrollTo({ top: 0, behavior: 'auto' });
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const openTool = useCallback((id) => {
    const nextId = TOOLS[id] ? id : DEFAULT_TOOL;
    const nextPath = TOOLS[nextId].path;
    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, '', nextPath);
    }
    setActiveTool(nextId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const goHome = useCallback(() => {
    if (window.location.pathname !== '/') {
      window.history.pushState({}, '', '/');
    }
    setActiveTool(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  /* -------------------------- Landing page -------------------------- */
  if (!activeTool) {
    return (
      <LandingPage
        onLaunchApp={() => openTool(DEFAULT_TOOL)}
        onOpenTool={openTool}
        tools={TOOLS}
      />
    );
  }

  /* --------------------------- Tool view --------------------------- */
  const { title, component: Tool } = TOOLS[activeTool];

  return (
    <div className="app-shell">
      <header className="topbar">
        <a
          href="/"
          className="brand"
          onClick={(event) => {
            event.preventDefault();
            goHome();
          }}
          aria-label="CutMage home"
        >
          <span className="brand-mark">
            <Scissors size={20} />
          </span>
          CutMage<span className="dot">.</span>
        </a>

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