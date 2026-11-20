/* Scrollcraft — dependency-free scroll engine.
 * Scroll position is a timeline. Every move is f(t), t in 0..1.
 *
 *   sc.range(el, opts, t => {...})   register a scroll range
 *   sc.rangeDoc(t => {...})          whole-document progress
 *   sc.sequence({...})               frame-by-frame canvas playback
 *   sc.pointer((px,py) => {...})     damped pointer, -1..1
 *   sc.setVar(name, value)           write a CSS custom property on :root
 *   sc.lerpColor(stops, t)           OKLCH-interpolated colour
 *   sc.countTo(el, from, to, ms)     eased number count-up
 *   sc.once(el, fn)                  fire once when element enters view
 */
(function (global) {
  'use strict';

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const touch = matchMedia('(hover: none)').matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const el = (x) => (typeof x === 'string' ? document.querySelector(x) : x);

  /* ---------- smooth scroll damping ---------- */
  let target = window.scrollY;
  let current = window.scrollY;
  const damping = reduced || touch ? 1 : 0.1;

  /* ---------- range registry ---------- */
  const ranges = [];
  const pointerFns = [];
  let docFn = null;

  /** Resolve "top top" / "top 80%" / "+=200%" into absolute px. */
  function resolve(node, spec) {
    const rect = node.getBoundingClientRect();
    const top = rect.top + window.scrollY;
    const vh = window.innerHeight;

    function edge(str, fallback) {
      if (!str) return fallback;
      if (str.startsWith('+=')) {
        const v = str.slice(2);
        return v.endsWith('%') ? (parseFloat(v) / 100) * vh : parseFloat(v);
      }
      const [self, view] = str.split(/\s+/);
      const selfPx = self === 'top' ? 0 : self === 'bottom' ? rect.height
        : self === 'center' ? rect.height / 2 : parseFloat(self) || 0;
      const viewPx = view === 'top' ? 0 : view === 'bottom' ? vh
        : view === 'center' ? vh / 2
        : String(view).endsWith('%') ? (parseFloat(view) / 100) * vh : parseFloat(view) || 0;
      return top + selfPx - viewPx;
    }

    const start = edge(spec.start || 'top bottom', top - vh);
    const endSpec = spec.end || 'bottom top';
    const end = endSpec.startsWith('+=') ? start + edge(endSpec, vh) : edge(endSpec, top + rect.height);
    return { start, end: Math.max(end, start + 1) };
  }

  function range(node, opts, fn) {
    node = el(node);
    if (!node) return;
    const r = { node, opts: opts || {}, fn, pinned: false, spacer: null };
    ranges.push(r);
    measure(r);
    return r;
  }

  function measure(r) {
    if (r.spacer) { r.spacer.remove(); r.spacer = null; }
    Object.assign(r, resolve(r.node, r.opts));

    if (r.opts.pin && !reduced) {
      const len = r.end - r.start;
      const spacer = document.createElement('div');
      spacer.style.height = len + 'px';
      spacer.setAttribute('data-sc-spacer', '');
      r.node.after(spacer);
      r.spacer = spacer;
      Object.assign(r, resolve(r.node, r.opts)); // re-measure after height change
      r.node.style.willChange = 'transform';
    }
  }

  function rangeDoc(fn) { docFn = fn; }

  /* ---------- pointer ---------- */
  let ptx = 0, pty = 0, ptxT = 0, ptyT = 0;
  if (!touch && !reduced) {
    addEventListener('pointermove', (e) => {
      ptxT = (e.clientX / innerWidth) * 2 - 1;
      ptyT = (e.clientY / innerHeight) * 2 - 1;
    }, { passive: true });
  }
  function pointer(fn) { pointerFns.push(fn); }

  /* ---------- frame sequence ---------- */
  function sequence(cfg) {
    const canvas = el(cfg.canvas);
    const ctx = canvas.getContext('2d', { alpha: false });
    const count = cfg.count;
    const imgs = new Array(count);
    let loaded = 0, last = -1;

    function load(i, cb) {
      if (imgs[i] || i < 0 || i >= count) return cb && cb();
      const im = new Image();
      im.decoding = 'async';
      im.onload = () => { imgs[i] = im; loaded++; if (i === 0) draw(0); cb && cb(); };
      im.onerror = () => cb && cb();
      im.src = cfg.src(i + 1);
    }

    // first frame, then an eager head, then the rest during idle
    load(0, () => {
      const eager = Math.min(cfg.eager || 20, count);
      for (let i = 1; i < eager; i++) load(i);
      const idle = global.requestIdleCallback || ((f) => setTimeout(f, 200));
      let next = eager;
      (function chunk() {
        idle(() => {
          const stop = Math.min(next + 8, count);
          for (; next < stop; next++) load(next);
          if (next < count) chunk();
        });
      })();
    });

    function fit(im) {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      const w = canvas.clientWidth * dpr, h = canvas.clientHeight * dpr;
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      const s = Math.max(w / im.width, h / im.height);          // cover
      const dw = im.width * s, dh = im.height * s;
      return [(w - dw) / 2, (h - dh) / 2, dw, dh];
    }

    function draw(t) {
      let i = Math.round(clamp(t, 0, 1) * (count - 1));
      if (i === last) return;
      // fall back to the nearest already-loaded frame while streaming
      let j = i;
      while (j >= 0 && !imgs[j]) j--;
      if (j < 0) return;
      const im = imgs[j];
      ctx.drawImage(im, ...fit(im));
      last = i;
    }

    return { draw, get progress() { return loaded / count; } };
  }

  /* ---------- colour (OKLCH interpolation) ---------- */
  function hexToRgb(h) {
    h = h.replace('#', '');
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  const srgbToLin = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  const linToSrgb = c => Math.round(255 * (c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055));

  function rgbToOklab([r, g, b]) {
    const R = srgbToLin(r), G = srgbToLin(g), B = srgbToLin(b);
    const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
    const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
    const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
    return [
      0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
      1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
      0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s,
    ];
  }
  function oklabToRgb([L, a, b]) {
    const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
    const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
    const s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3;
    return [
      linToSrgb(+4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
      linToSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
      linToSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s),
    ].map(v => clamp(v, 0, 255));
  }

  function lerpColor(stops, t) {
    t = clamp(t, 0, 1);
    let i = 0;
    while (i < stops.length - 2 && t > stops[i + 1][0]) i++;
    const [p0, c0] = stops[i], [p1, c1] = stops[i + 1];
    const k = p1 === p0 ? 0 : (t - p0) / (p1 - p0);
    if (reduced) return k < 0.5 ? c0 : c1;                     // snap, don't interpolate
    const A = rgbToOklab(hexToRgb(c0)), B = rgbToOklab(hexToRgb(c1));
    const out = oklabToRgb(A.map((v, n) => v + (B[n] - v) * k));
    return `rgb(${out[0]},${out[1]},${out[2]})`;
  }

  const setVar = (n, v) => document.documentElement.style.setProperty(n, v);

  /* ---------- counters + once ---------- */
  function countTo(node, from, to, ms) {
    node = el(node);
    if (reduced) { node.textContent = to.toLocaleString(); return; }
    const t0 = performance.now();
    (function step(now) {
      const k = clamp((now - t0) / ms, 0, 1);
      const e = 1 - Math.pow(1 - k, 3);
      node.textContent = Math.round(from + (to - from) * e).toLocaleString();
      if (k < 1) requestAnimationFrame(step);
    })(t0);
  }

  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.__scOnce && e.target.__scOnce(); io.unobserve(e.target); }
    });
  }, { rootMargin: '0px 0px -20% 0px' });

  function once(node, fn) { node = el(node); if (!node) return; node.__scOnce = () => fn(node); io.observe(node); }

  /* ---------- loop ---------- */
  function frame() {
    target = window.scrollY;
    current += (target - current) * damping;
    if (Math.abs(target - current) < 0.1) current = target;

    const y = current;
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    if (docFn) docFn(clamp(y / maxScroll, 0, 1));

    for (const r of ranges) {
      const t = clamp((y - r.start) / (r.end - r.start), 0, 1);
      if (r.opts.pin && !reduced) {
        const inside = y >= r.start && y <= r.end;
        const offset = inside ? y - r.start : y > r.end ? r.end - r.start : 0;
        r.node.style.transform = `translate3d(0, ${offset}px, 0)`;
      }
      r.fn(t);
    }

    if (pointerFns.length) {
      ptx += (ptxT - ptx) * 0.08;
      pty += (ptyT - pty) * 0.08;
      for (const fn of pointerFns) fn(ptx, pty);
    }
    running = document.visibilityState !== 'hidden';
    if (running) requestAnimationFrame(frame);
  }

  let running = true;
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'hidden' && !running) {
      running = true;
      current = window.scrollY;          // resync; don't animate the gap
      requestAnimationFrame(frame);
    }
  });

  let rt;
  addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => ranges.forEach(measure), 150);
  });

  requestAnimationFrame(frame);

  global.sc = {
    range, rangeDoc, sequence, pointer, setVar, lerpColor, countTo, once,
    reduced, touch, clamp,
  };
})(window);
