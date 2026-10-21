import { useEffect, useRef, useState } from 'react';
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from 'framer-motion';
import {
  ArrowUpRight,
  CheckCircle2,
  FileText,
  Gauge,
  Grid2X2,
  LockKeyhole,
  Maximize2,
  Menu,
  Repeat2,
  Scissors,
  ShieldCheck,
  X,
  Zap,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Content                                                            */
/* ------------------------------------------------------------------ */

const EASE = [0.22, 1, 0.36, 1];

const NAV_LINKS = [
  { href: '#services', label: 'Tools' },
  { href: '#how', label: 'How it works' },
  { href: '#privacy', label: 'Privacy' },
];

const SERVICES = [
  {
    id: 'cutter',
    icon: Scissors,
    title: 'Image cutter & grid splitter',
    description: 'Select exact regions or split an image into a clean grid.',
    tag: 'Popular',
  },
  {
    id: 'resizer',
    icon: Maximize2,
    title: 'Image resizer',
    description: 'Set exact dimensions or resize by percentage.',
  },
  {
    id: 'compressor',
    icon: Gauge,
    title: 'Compress image',
    description: 'Reduce file size and compare results before downloading.',
  },
  {
    id: 'converter',
    icon: Repeat2,
    title: 'Convert format',
    description: 'Convert images to PNG, JPEG, or WebP.',
  },
  {
    id: 'pdf',
    icon: FileText,
    title: 'Images to PDF',
    description: 'Arrange multiple images and combine them into one PDF.',
  },
];

const STEPS = [
  {
    number: '01',
    title: 'Choose a tool',
    body: 'Start with cutting, resizing, compressing, converting, or PDF export.',
  },
  {
    number: '02',
    title: 'Adjust your image',
    body: 'Use clear controls and preview the result before exporting.',
  },
  {
    number: '03',
    title: 'Download and move on',
    body: 'Save individual files or bundle supported batch results into a ZIP.',
  },
];

const TRUST_POINTS = [
  { icon: CheckCircle2, label: 'No sign-up' },
  { icon: LockKeyhole, label: 'Browser-based' },
  { icon: Zap, label: 'Simple workflow' },
];

const RIBBON_WORDS = ['Made for everyday workflows', 'One place. Five useful tools.'];

/* ------------------------------------------------------------------ */
/*  Motion presets                                                     */
/* ------------------------------------------------------------------ */

const childFade = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.65, ease: EASE } },
};

/* ------------------------------------------------------------------ */
/*  Building blocks                                                    */
/* ------------------------------------------------------------------ */

function Brand({ iconSize = 20 }) {
  return (
    <motion.a
      href="#home"
      className="brand"
      aria-label="CutMage — back to top"
      whileHover={{ x: -1 }}
      whileTap={{ scale: 0.98 }}
    >
      <motion.span
        className="brand-mark"
        whileHover={{ rotate: -12 }}
        transition={{ type: 'spring', stiffness: 320, damping: 14 }}
      >
        <Scissors size={iconSize} strokeWidth={2} />
      </motion.span>
      CutMage<span className="dot">.</span>
    </motion.a>
  );
}

function HeroMock({ prefersReducedMotion }) {
  const floats = prefersReducedMotion
    ? {}
    : {
        animate: { y: [0, -6, 0] },
        transition: { duration: 5, repeat: Infinity, ease: 'easeInOut' },
      };

  const cropPulse = (delay) =>
    prefersReducedMotion
      ? {}
      : {
          animate: { opacity: [0.55, 1, 0.55] },
          transition: { duration: 2.4, delay, repeat: Infinity, ease: 'easeInOut' },
        };

  return (
    <div className="hero-art" aria-hidden="true">
      <motion.div
        className="mock-window"
        initial={{ opacity: 0, y: 24, rotate: -1.5 }}
        animate={{ opacity: 1, y: 0, rotate: 0 }}
        transition={{ duration: 0.9, delay: 0.15, ease: EASE }}
      >
        <div className="mock-top">
          <span className="window-dots">
            <i />
            <i />
            <i />
          </span>
          <span className="mock-path">cutmage / workspace</span>
          <motion.span
            className="mock-status"
            animate={prefersReducedMotion ? {} : { opacity: [1, 0.55, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <i /> Ready
          </motion.span>
        </div>

        <div className="mock-canvas">
          <div className="mock-landscape">
            <i className="sun" />
            <i className="mountain back" />
            <i className="mountain front" />
            <i className="water" />
            <motion.span className="crop c1" {...cropPulse(0)}>01</motion.span>
            <motion.span className="crop c2" {...cropPulse(0.3)}>02</motion.span>
            <motion.span className="crop c3" {...cropPulse(0.6)}>03</motion.span>
            <motion.span className="crop c4" {...cropPulse(0.9)}>04</motion.span>
          </div>
        </div>

        <div className="mock-foot">
          <span>
            <Grid2X2 size={14} /> 4 regions selected
          </span>
          <span className="ok">Ready to export</span>
        </div>
      </motion.div>

      <motion.div
        className="float-note note-1"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, delay: 0.6, ease: EASE }}
        {...floats}
      >
        <span className="note-icon">✂</span>
        <div>
          <b>Precise cuts</b>
          <small>Pick every detail</small>
        </div>
      </motion.div>

      <motion.div
        className="float-note note-2"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, delay: 0.75, ease: EASE }}
        {...(prefersReducedMotion
          ? {}
          : {
              animate: { opacity: 1, x: 0, y: [0, 6, 0] },
              transition: {
                y: { duration: 5.5, repeat: Infinity, ease: 'easeInOut' },
                opacity: { duration: 0.6, delay: 0.75 },
                x: { duration: 0.6, delay: 0.75 },
              },
            })}
      >
        <span className="note-icon">✓</span>
        <div>
          <b>Your files stay yours</b>
          <small>Processed in your browser</small>
        </div>
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function LandingPage({ onLaunchApp, onOpenTool }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const heroRef = useRef(null);

  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const parallaxY = useSpring(useTransform(scrollYProgress, [0, 1], [0, 60]), {
    stiffness: 120,
    damping: 24,
  });
  const parallaxOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0.5]);

  useEffect(() => {
    if (!isMenuOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setIsMenuOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMenuOpen]);

  const closeMenu = () => setIsMenuOpen(false);

  const scrollToServices = () => {
    document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' });
    closeMenu();
  };

  /* Open a tool — used by the whole card, not just a nested button. */
  const openTool = (id) => {
    if (typeof onOpenTool === 'function') onOpenTool(id);
  };

  return (
    <div className="landing">
      {/* ---------------------------- Header ---------------------------- */}
      <motion.header
        className="nav"
        initial={{ y: -16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: EASE }}
      >
        <div className="nav-inner">
          <Brand />

          <button
            type="button"
            className="mobile-menu"
            onClick={() => setIsMenuOpen((open) => !open)}
            aria-label={isMenuOpen ? 'Close navigation' : 'Open navigation'}
            aria-expanded={isMenuOpen}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={isMenuOpen ? 'close' : 'open'}
                initial={{ rotate: -45, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 45, opacity: 0 }}
                transition={{ duration: 0.18 }}
                style={{ display: 'inline-flex' }}
              >
                {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </motion.span>
            </AnimatePresence>
          </button>

          <nav className={`nav-links${isMenuOpen ? ' is-open' : ''}`}>
            {NAV_LINKS.map((link) => (
              <motion.a
                key={link.href}
                href={link.href}
                onClick={closeMenu}
                whileHover={{ y: -1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              >
                {link.label}
              </motion.a>
            ))}

            <motion.button
              type="button"
              className="btn btn-primary"
              onClick={() => onLaunchApp?.()}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
            >
              Open workspace <ArrowUpRight size={16} />
            </motion.button>
          </nav>
        </div>
      </motion.header>

      {/* ----------------------------- Hero ----------------------------- */}
      <section id="home" className="hero" ref={heroRef}>
        <div className="hero-inner">
          <motion.div
            className="hero-copy"
            style={prefersReducedMotion ? {} : { y: parallaxY, opacity: parallaxOpacity }}
          >
            <motion.p
              className="pill"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1, ease: EASE }}
            >
              <Zap size={14} /> Your everyday image toolkit
            </motion.p>

            <motion.h1
              initial="hidden"
              animate="visible"
              variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
            >
              {['Make every image', 'work harder.'].map((line, i) => (
                <motion.span
                  key={line}
                  variants={{
                    hidden: { opacity: 0, y: 20 },
                    visible: { opacity: 1, y: 0, transition: { duration: 0.65, ease: EASE } },
                  }}
                  style={{ display: 'block' }}
                >
                  {i === 1 ? <em>{line}</em> : line}
                </motion.span>
              ))}
            </motion.h1>

            <motion.p
              className="lede"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.35, ease: EASE }}
            >
              Cut, resize, compress, convert, and turn images into PDFs — with simple tools that
              run in your browser.
            </motion.p>

            <motion.div
              className="hero-buttons"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.45, ease: EASE }}
            >
              <motion.button
                type="button"
                className="btn btn-primary btn-big"
                onClick={() => onLaunchApp?.()}
                whileHover={{ y: -3, scale: 1.01 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 360, damping: 22 }}
              >
                Start with image cutter <ArrowUpRight size={18} />
              </motion.button>
              <motion.button
                type="button"
                className="btn btn-outline btn-big"
                onClick={scrollToServices}
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.97 }}
              >
                Explore all tools
              </motion.button>
            </motion.div>

            <motion.ul
              className="trust"
              variants={{ visible: { transition: { staggerChildren: 0.07, delayChildren: 0.6 } } }}
              initial="hidden"
              animate="visible"
            >
              {TRUST_POINTS.map(({ icon: Icon, label }) => (
                <motion.li key={label} variants={childFade}>
                  <Icon size={15} /> {label}
                </motion.li>
              ))}
            </motion.ul>
          </motion.div>

          <HeroMock prefersReducedMotion={prefersReducedMotion} />
        </div>

        <motion.div
          className="hero-ribbon"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.8 }}
        >
          {RIBBON_WORDS.map((word, i) => (
            <span key={word} style={{ display: 'contents' }}>
              {i > 0 && <i />}
              <motion.span
                whileHover={
                  prefersReducedMotion ? {} : { letterSpacing: '0.18em', color: 'var(--ink)' }
                }
                transition={{ duration: 0.3, ease: EASE }}
              >
                {word}
              </motion.span>
            </span>
          ))}
        </motion.div>
      </section>

      {/* --------------------------- Services --------------------------- */}
      <section id="services" className="section services">
        <div className="section-head">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.4 }}
          >
            <p className="eyebrow">The toolkit</p>
            <h2>
              Everything you need.
              <br />
              <em>Nothing in the way.</em>
            </h2>
          </motion.div>

          <motion.p
            className="section-note"
            custom={0.1}
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.4 }}
          >
            Choose a tool, make your edits, and export. No account setup, no complicated software
            to learn.
          </motion.p>
        </div>

        <motion.div
          className="service-grid"
          variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
        >
          {SERVICES.map(({ id, icon: Icon, title, description, tag }, index) => (
            <motion.button
              type="button"
              key={id}
              className={`service-card${index === 0 ? ' featured' : ''}`}
              variants={childFade}
              onClick={() => openTool(id)}
              whileHover={
                prefersReducedMotion ? {} : { y: -6, transition: { duration: 0.25, ease: EASE } }
              }
              whileTap={{ scale: 0.98 }}
              aria-label={`Open ${title}`}
            >
              <div className="service-top">
                <motion.span
                  className="service-icon"
                  whileHover={{ rotate: -8, scale: 1.05 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 16 }}
                >
                  <Icon size={22} strokeWidth={1.75} />
                </motion.span>
                {tag && <span className="tag">{tag}</span>}
                <motion.span
                  className="service-arrow"
                  whileHover={{ x: 3, y: -3 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 18 }}
                >
                  <ArrowUpRight size={19} aria-hidden="true" />
                </motion.span>
              </div>

              <h3>{title}</h3>
              <p>{description}</p>
              <span className="service-open">Open tool</span>
            </motion.button>
          ))}
        </motion.div>
      </section>

      {/* --------------------------- Workflow --------------------------- */}
      <section id="how" className="workflow">
        <div className="workflow-inner">
          <motion.div
            className="workflow-copy"
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ duration: 0.65, ease: EASE }}
          >
            <p className="eyebrow">A better workflow</p>
            <h2>
              Less busywork.
              <br />
              <em>More done.</em>
            </h2>
            <p className="section-note">
              CutMage keeps common image tasks in one tidy workspace — whether you are preparing
              product photos, organising assets, or getting images ready for a document.
            </p>
            <motion.button
              type="button"
              className="btn btn-primary"
              onClick={() => onLaunchApp?.()}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
            >
              Try image cutter <ArrowUpRight size={16} />
            </motion.button>
          </motion.div>

          <ol className="steps">
            {STEPS.map((step, i) => (
              <motion.li
                key={step.number}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.5, delay: i * 0.08, ease: EASE }}
              >
                <motion.span
                  className="step-number"
                  whileHover={{ scale: 1.08, rotate: -4 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 14 }}
                >
                  {step.number}
                </motion.span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                </div>
              </motion.li>
            ))}
          </ol>
        </div>
      </section>

      {/* --------------------------- Privacy ---------------------------- */}
      <motion.section
        id="privacy"
        className="privacy"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.6, ease: EASE }}
      >
        <div className="privacy-inner">
          <motion.span
            className="privacy-icon"
            whileHover={{ rotate: 6, scale: 1.08 }}
            transition={{ type: 'spring', stiffness: 280, damping: 14 }}
          >
            <ShieldCheck size={22} />
          </motion.span>

          <div className="privacy-copy">
            <p className="eyebrow">Privacy first</p>
            <h2>Your images are yours.</h2>
            <p>
              These tools process images locally in your browser. Files are never sent to a
              CutMage server.
            </p>
          </div>

          <motion.span
            className="privacy-badge"
            whileHover={{ y: -2 }}
            transition={{ type: 'spring', stiffness: 320, damping: 18 }}
          >
            <LockKeyhole size={14} /> No account required
          </motion.span>
        </div>
      </motion.section>

      {/* ---------------------------- Footer ---------------------------- */}
      <footer className="footer">
        <Brand iconSize={18} />
        <p>Useful image tools. A little less hassle.</p>
        <span className="footer-legal">© {new Date().getFullYear()} CutMage</span>
      </footer>
    </div>
  );
}