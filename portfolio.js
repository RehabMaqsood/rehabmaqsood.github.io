/* =========================================================
   portfolio.js — reveals, halo, scroll-spy, horizon parallax,
                   + Section 1 animations (script-adapt,
                   typewriter, character-place, QA timestamp)
   ========================================================= */
(function(){

  /* ---------- Reveal on scroll ----------
     Two tiers so animation timing matches reading pace:
       • Light reveals (text, cards, metrics) fade in a touch before they're
         centred, so content is never blank when you arrive.
       • Heavy animated stages (flowcharts, dashboards) hold until they are
         genuinely in the reading zone — otherwise their multi-second
         sequences play out below the fold before you scroll to them.
  */
  const HEAVY_ANIM = '.flow-stage, .flow-subflow, .gov-dash';
  const allReveals = [...document.querySelectorAll('.reveal')];
  const lightReveals = allReveals.filter(el => !el.matches(HEAVY_ANIM));
  const heavyReveals = allReveals.filter(el => el.matches(HEAVY_ANIM));

  const ioLight = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in'); ioLight.unobserve(e.target); }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -14% 0px' });
  lightReveals.forEach(el => ioLight.observe(el));

  const ioHeavy = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in'); ioHeavy.unobserve(e.target); }
    });
  }, { threshold: 0.2, rootMargin: '0px 0px -32% 0px' });
  heavyReveals.forEach(el => ioHeavy.observe(el));

  // Defensive fallback — if nothing revealed (e.g. IO unsupported), show all
  setTimeout(() => {
    if (document.querySelectorAll('.reveal.in').length === 0) {
      allReveals.forEach(el => el.classList.add('in'));
    }
  }, 700);

  /* ---------- Cursor halo ---------- */
  const halo = document.getElementById('cursorHalo');
  let tx = 0, ty = 0, x = 0, y = 0, visible = false;
  if (halo) {
    window.addEventListener('mousemove', (e) => {
      tx = e.clientX; ty = e.clientY;
      if (!visible) { halo.style.opacity = '1'; visible = true; }
    });
    window.addEventListener('mouseleave', () => { halo.style.opacity = '0'; visible = false; });
    (function tick(){
      x += (tx - x) * 0.08;
      y += (ty - y) * 0.08;
      halo.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
      requestAnimationFrame(tick);
    })();
    if (window.matchMedia('(pointer: coarse)').matches) halo.style.display = 'none';
  }

  /* ---------- Smooth nav ---------- */
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href').slice(1);
      const target = document.getElementById(id);
      if (target) {
        e.preventDefault();
        window.scrollTo({ top: target.offsetTop - 8, behavior: 'smooth' });
      }
    });
  });

  /* ---------- Scroll-spy ---------- */
  const navLinks = Array.from(document.querySelectorAll('.topbar .nav a'));
  const sectionMap = navLinks
    .map(a => ({ a, sec: document.getElementById(a.getAttribute('href').slice(1)) }))
    .filter(x => x.sec);
  function syncSpy(){
    const y = window.scrollY + window.innerHeight * 0.35;
    let active = null;
    for (const item of sectionMap) {
      if (item.sec.offsetTop <= y) active = item;
    }
    // If scrolled to (or near) the very bottom of the page, force the last
    // nav item active — the footer's offsetTop may sit beyond the 35% line
    // and otherwise the previous section stays highlighted at end-of-page.
    const atBottom = (window.innerHeight + window.scrollY) >= (document.documentElement.scrollHeight - 4);
    if (atBottom && sectionMap.length) active = sectionMap[sectionMap.length - 1];
    navLinks.forEach(l => l.classList.remove('active'));
    if (active) active.a.classList.add('active');
  }

  /* ---------- Horizon parallax on hero ---------- */
  const hero = document.querySelector('.hero');
  function syncHorizon(){
    if (!hero) return;
    const h = hero.offsetHeight;
    const yy = Math.min(window.scrollY, h);
    hero.style.setProperty('--horizon-shift', (-(yy * 0.35)).toFixed(1) + 'px');
  }

  let raf = null;
  window.addEventListener('scroll', () => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      syncSpy(); syncHorizon();
      raf = null;
    });
  }, { passive: true });
  syncSpy(); syncHorizon();

  /* =========================================================
     Section 1 animations
     Each animation observes its host element. When it enters
     view, plays once. A "↻" replay control re-runs it.
     ========================================================= */

  /* --- Helpers --- */
  function onceVisible(el, run, opts){
    const o = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          o.unobserve(el);
          run();
        }
      }
    }, Object.assign({ threshold: 0.35, rootMargin: '0px 0px -12% 0px' }, opts || {}));
    o.observe(el);
  }

  function attachReplay(stage, runFn){
    let btn = stage.querySelector('.replay');
    if (!btn) {
      btn = document.createElement('button');
      btn.className = 'replay';
      btn.type = 'button';
      btn.setAttribute('aria-label', 'Replay animation');
      btn.textContent = '↻';
      stage.appendChild(btn);
    }
    btn.addEventListener('click', () => runFn());
  }

  /* Promise-based delay */
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  /* Typewriter — types `text` into target element, char by char */
  async function typeInto(el, text, opts){
    const speed = (opts && opts.speed) || 26; // ms per char
    el.textContent = '';
    el.classList.add('active');
    el.classList.remove('done');
    for (let i = 0; i < text.length; i++){
      el.textContent = text.slice(0, i + 1);
      const ch = text[i];
      const pause = (ch === '.' || ch === '?' || ch === '!') ? 220
                  : (ch === ',' || ch === ';' || ch === ':') ? 110
                  : speed + (Math.random() * 12 - 6);
      await sleep(Math.max(8, pause));
    }
    // re-append caret span if requested
    if (opts && opts.caret){
      const c = document.createElement('span');
      c.className = 'caret';
      el.appendChild(c);
    }
  }

  async function typeLines(stage, lines, opts){
    // lines: [{ selector, text, speed?, hold? }]
    for (const item of lines){
      const el = stage.querySelector(item.selector);
      if (!el) continue;
      // mark all sibling .line as inactive
      stage.querySelectorAll('.line').forEach(l => l.classList.remove('active'));
      el.classList.add('active');
      await typeInto(el, item.text, { speed: item.speed || 24 });
      el.classList.remove('active');
      el.classList.add('done');
      await sleep(item.hold || 280);
    }
  }

  /* =========================================================
     ADGM — Script adaptation timeline
     Stages:
       1: doc fades in
       2: target line highlights, siblings dim, doc scales toward target
       3: adapted line crossfades in below
     ========================================================= */
  document.querySelectorAll('.adgm-script').forEach(stage => {
    const run = async () => {
      // Reset cleanly: suppress transitions so the highlight snaps back to 0%
      // (otherwise on replay it scales DOWN first, then back up).
      stage.classList.add('resetting');
      stage.classList.remove('stage-1','stage-2','stage-3');
      stage.querySelectorAll('.doc p').forEach(p => p.classList.remove('dim'));
      void stage.offsetWidth; // force reflow with transitions off
      stage.classList.remove('resetting');
      void stage.offsetWidth; // settle before re-enabling
      await sleep(200);
      stage.classList.add('stage-1');
      await sleep(900);
      stage.classList.add('stage-2');
      // mark sibling paragraphs dim except the target
      stage.querySelectorAll('.doc p').forEach(p => {
        if (!p.classList.contains('target')) p.classList.add('dim');
      });
      await sleep(1600);
      stage.classList.add('stage-3');
    };
    attachReplay(stage, run);
    onceVisible(stage, run);
  });

  /* =========================================================
     PBL — typewriter sequences
     ========================================================= */
  document.querySelectorAll('.pbl-stage').forEach(stage => {
    const sequence = JSON.parse(stage.dataset.sequence || '[]');
    // Snapshot prefilled content so replay doesn't wipe it.
    const prefilled = new Map();
    stage.querySelectorAll('.line.prefilled').forEach(l => {
      prefilled.set(l, l.innerHTML);
    });
    const run = async () => {
      stage.querySelectorAll('.line').forEach(l => {
        if (l.classList.contains('prefilled')) {
          // restore original markup, keep prefilled intact
          l.innerHTML = prefilled.get(l) || '';
        } else {
          l.textContent = '';
          l.classList.remove('active','done');
        }
      });
      await sleep(220);
      await typeLines(stage, sequence);
    };
    attachReplay(stage, run);
    onceVisible(stage, run);
  });

  /* =========================================================
     LUMSx — character placement onto storyboard
     The storyboard shows a "drop target" outline; the character
     image then translates down + scales into place.
     ========================================================= */
  document.querySelectorAll('.lumsx-stage').forEach(stage => {
    const run = async () => {
      // hide character before re-animating in
      stage.classList.add('resetting');
      stage.classList.remove('placed');
      void stage.offsetWidth;
      stage.classList.remove('resetting');
      void stage.offsetWidth;
      await sleep(900); // dwell on the empty frame so the marker reads
      stage.classList.add('placed');
    };
    attachReplay(stage, run);
    onceVisible(stage, run);
  });

  /* =========================================================
     LUMSx — QA timestamp + typed instruction
     ========================================================= */
  document.querySelectorAll('.qa-stage').forEach(stage => {
    const text = stage.dataset.note || '';
    const stampText = stage.dataset.stamp || '00 : 02 : 32';
    const tsText = stage.dataset.ts || 'Module · 00:02:32';
    const pauseAt = parseFloat(stage.dataset.pauseAt || '2.4');
    const noteEl = stage.querySelector('.note');
    const tsEl = stage.querySelector('.note-pane .ts');
    const stampEl = stage.querySelector('.ts-stamp');
    const video = stage.querySelector('.qa-video');
    const run = async () => {
      stage.classList.remove('stamped','typing','done','paused','ts-done');
      if (noteEl) noteEl.textContent = '';
      if (tsEl) tsEl.textContent = '';
      if (stampEl) stampEl.textContent = stampText;
      if (video) {
        try {
          video.currentTime = 0;
          video.muted = true;
          video.play().catch(()=>{});
        } catch (_) {}
      }
      void stage.offsetWidth;
      // Let the video play visibly for a beat, then pause at the "2:32" mark
      await sleep(Math.max(400, pauseAt * 1000));
      if (video) { try { video.pause(); } catch (_) {} }
      stage.classList.add('paused');
      await sleep(380);
      stage.classList.add('stamped');
      await sleep(520);
      // Type the timestamp line in the note pane first
      if (tsEl) {
        await typeInto(tsEl, tsText, { speed: 24 });
      }
      stage.classList.add('ts-done');
      await sleep(280);
      stage.classList.add('typing');
      if (noteEl){
        await typeInto(noteEl, text, { speed: 30 });
        const c = document.createElement('span');
        c.className = 'caret';
        noteEl.appendChild(c);
      }
      stage.classList.remove('typing');
      stage.classList.add('done');
    };
    attachReplay(stage, run);
    onceVisible(stage, run);
  });

  /* =========================================================
     Section 2 — SOP card click-to-expand
     ========================================================= */
  document.querySelectorAll('.sop-card').forEach(card => {
    const head = card.querySelector('.sc-head');
    if (!head) return;
    head.addEventListener('click', () => {
      const open = card.getAttribute('aria-expanded') === 'true';
      card.setAttribute('aria-expanded', open ? 'false' : 'true');
    });
  });

  /* =========================================================
     Section 2 — Video Production click-to-expand
     The macro flow plays on scroll. The VP block + a "drill"
     trigger below it open the sub-flow inline; a close button
     collapses it back. Sub-flow's own animation cascade plays
     each time it expands (via .in class).
     ========================================================= */
  document.querySelectorAll('.flow-stage').forEach(stage => {
    const subflow = stage.querySelector('.flow-subflow');
    const trigger = stage.querySelector('.vp-drill-trigger');
    const closeBtn = stage.querySelector('.sf-close');
    const vpBlock = stage.querySelector('.flowchart.macro .block.drillable');
    if (!subflow) return;

    const open = () => {
      if (stage.classList.contains('expanded')) return;
      stage.classList.add('expanded');
      if (trigger) trigger.setAttribute('aria-expanded', 'true');
      if (subflow) subflow.setAttribute('aria-hidden', 'false');
      // Replay subflow cascade — strip and re-add .in on next frame
      subflow.classList.remove('in');
      void subflow.offsetWidth;
      requestAnimationFrame(() => subflow.classList.add('in'));
    };
    const close = () => {
      stage.classList.remove('expanded');
      if (trigger) trigger.setAttribute('aria-expanded', 'false');
      if (subflow) subflow.setAttribute('aria-hidden', 'true');
      subflow.classList.remove('in');
    };

    if (trigger) trigger.addEventListener('click', open);
    if (vpBlock) {
      vpBlock.style.cursor = 'pointer';
      vpBlock.addEventListener('click', open);
    }
    if (closeBtn) closeBtn.addEventListener('click', close);
  });

  /* =========================================================
     Email assembly — keep the address out of static HTML so
     Cloudflare's edge email-obfuscation can't rewrite it.
     ========================================================= */
  document.querySelectorAll('a.js-email').forEach(a => {
    const u = a.dataset.u, d = a.dataset.d;
    if (!u || !d) return;
    const addr = u + String.fromCharCode(64) + d;
    a.setAttribute('href', 'mailto:' + addr);
    a.textContent = addr;
  });

})();
