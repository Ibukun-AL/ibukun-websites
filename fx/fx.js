/* Motion layer. Pointer depth in the hero, word-by-word headlines, staggered reveals, magnetic buttons.
   Nothing here blocks content: without JS the page shows everything at rest. */
(function () {
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  root.classList.add('fx-ready');
  if (reduced) return;

  /* work cards: measure the frame so the site inside can scroll exactly to its end */
  const panels = [...document.querySelectorAll('#work .panel')];
  const measure = () => panels.forEach((p) => p.style.setProperty('--ph', p.clientHeight + 'px'));
  measure(); addEventListener('resize', measure, { passive: true });

  /* scroll progress bar */
  const bar = document.createElement('div');
  bar.className = 'fx-progress'; bar.setAttribute('aria-hidden', 'true');
  document.body.appendChild(bar);
  if (!CSS.supports('animation-timeline: scroll()')) {
    const upd = () => { const m = root.scrollHeight - innerHeight; bar.style.transform = 'scaleX(' + (m > 0 ? scrollY / m : 0) + ')'; };
    addEventListener('scroll', upd, { passive: true }); upd();
  }

  /* word-by-word split for section headlines */
  function split(node, counter) {
    [...node.childNodes].forEach((c) => {
      if (c.nodeType === 3) {
        const parts = c.textContent.split(/(\s+)/);
        const frag = document.createDocumentFragment();
        parts.forEach((p) => {
          if (!p) return;
          if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(' ')); return; }
          const w = document.createElement('span'); w.className = 'w';
          const s = document.createElement('span'); s.textContent = p; s.style.setProperty('--wi', counter.n++);
          w.appendChild(s); frag.appendChild(w);
        });
        c.replaceWith(frag);
      } else if (c.nodeType === 1) split(c, counter);
    });
  }
  document.querySelectorAll('main h2, .closing h2').forEach((h) => {
    if (h.classList.contains('assemble')) h.classList.remove('assemble');
    h.setAttribute('aria-label', h.textContent.replace(/\s+/g, ' ').trim());
    h.classList.add('fx-split');
    split(h, { n: 0 });
    [...h.querySelectorAll('.w')].forEach((w) => w.setAttribute('aria-hidden', 'true'));
  });

  /* reveal on enter: tag the things that should arrive, with a stagger inside each group */
  const groups = [
    '#work .grid > .card', '.principle', '.faq > .faq__item', '#packages .rows > li',
    '#brief .rows > li', '#brief-form', '.footer .closing__cta', '.footer .closing__links', '#sites .grid > .card',
  ];
  groups.forEach((sel) => document.querySelectorAll(sel).forEach((el, i) => { el.setAttribute('data-reveal', ''); el.style.setProperty('--i', i % 6); }));
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return;
    e.target.classList.add('in'); io.unobserve(e.target);
  }), { rootMargin: '0px 0px -12% 0px', threshold: 0.05 });
  document.querySelectorAll('[data-reveal], .fx-split').forEach((el) => io.observe(el));

  /* hero pointer depth: smoothed, desktop only */
  const stack = document.querySelector('.hero-depth');
  if (stack && fine) {
    let tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;
    const loop = () => {
      cx += (tx - cx) * 0.08; cy += (ty - cy) * 0.08;
      stack.style.setProperty('--px', cx.toFixed(3)); stack.style.setProperty('--py', cy.toFixed(3));
      raf = Math.abs(tx - cx) + Math.abs(ty - cy) > 0.002 ? requestAnimationFrame(loop) : 0;
    };
    addEventListener('pointermove', (e) => {
      tx = (e.clientX / innerWidth - 0.5) * 2; ty = (e.clientY / innerHeight - 0.5) * 2;
      if (!raf) raf = requestAnimationFrame(loop);
    }, { passive: true });
  }

  /* magnetic primary buttons */
  if (fine) {
    document.querySelectorAll('.btn--primary, .btn--xl').forEach((b) => {
      const pad = 70;
      const move = (e) => {
        const r = b.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
        const inside = Math.abs(dx) < r.width / 2 + pad && Math.abs(dy) < r.height / 2 + pad;
        b.style.transform = inside ? 'translate3d(' + (dx * 0.18).toFixed(1) + 'px,' + (dy * 0.28).toFixed(1) + 'px,0)' : '';
      };
      addEventListener('pointermove', move, { passive: true });
      b.addEventListener('pointerleave', () => { b.style.transform = ''; });
    });
  }
})();
