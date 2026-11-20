/* GRAMMAR:    the-descent (hero, one pinned real site, sites, questions, packages, brief)
   SIGNATURE:  frame-scrub of a real recording of Calder Row, owns 220vh (150vh on a phone)
   SUPPORTING: ground travel (one root property set), line assembly on three headlines
   Frames: frames/calder (72, desktop) and frames/calder-m (30, phone), recorded from the live site. */
(function () {
  const sc = window.sc;
  if (!sc) return;
  const phone = matchMedia('(max-width: 760px)').matches;
  const pinLen = phone ? 1.5 : 2.2, approach = 0.85, release = 0.9;
  const total = approach + pinLen + release;

  /* ground travel: the kit's palette tokens glide to a deep olive for the scene and back */
  const LIGHT = { '--p-bg': '#ecebe7', '--p-surface': '#e1dfd9', '--p-ink': '#38450f', '--p-muted': '#5a6537', '--p-action': '#38450f', '--p-action-ink': '#ecebe7' };
  const DARK  = { '--p-bg': '#171c0a', '--p-surface': '#222a0e', '--p-ink': '#ecebe7', '--p-muted': '#b4b8a6', '--p-action': '#ecebe7', '--p-action-ink': '#171c0a' };
  const smooth = (g) => g * g * (3 - 2 * g);
  sc.range('#work', { start: 'top 85%', end: '+=' + total * 100 + '%' }, (t) => {
    const up = sc.clamp(t / (approach / total), 0, 1);
    const down = sc.clamp((t - (approach + pinLen) / total) / (release / total), 0, 1);
    const g = smooth(up) * (1 - smooth(down));
    for (const k in LIGHT) sc.setVar(k, sc.lerpColor([[0, LIGHT[k]], [1, DARK[k]]], g));
  });

  /* signature: scrub the recording */
  const dir = phone ? 'calder-m' : 'calder';
  const frames = sc.sequence({
    canvas: '#scrub-canvas',
    count: phone ? 30 : 72,
    src: (i) => 'frames/' + dir + '/' + String(i).padStart(4, '0') + '.webp',
    eager: phone ? 10 : 20,
  });
  const beats = [...document.querySelectorAll('.scrub__beat')];
  const bar = document.querySelector('.scrub__bar');
  sc.range('#work', { start: 'top top', end: '+=' + pinLen * 100 + '%', pin: true }, (t) => {
    frames.draw(t);
    const idx = t < 0.34 ? 0 : t < 0.7 ? 1 : 2;
    beats.forEach((b, i) => b.classList.toggle('on', i === idx));
    if (bar) bar.style.transform = 'scaleX(' + t + ')';
  });

  /* headline assembly, once each */
  document.querySelectorAll('.assemble').forEach((h) => sc.once(h, (el) => el.classList.add('in')));
})();
