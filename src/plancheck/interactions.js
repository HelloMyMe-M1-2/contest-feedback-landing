// 원본 시안의 인터랙션을 React 이전 중 유지하기 위한 어댑터. 입력값을 분석기로 전달하지 않습니다.
export function initPrototype(report) {
  const cleanups = [];
  const addEventListener = (type, listener, options) => { window.addEventListener(type, listener, options); cleanups.push(() => window.removeEventListener(type, listener, options)); };
  const observe = (...args) => { const observer = new IntersectionObserver(...args); cleanups.push(() => observer.disconnect()); return observer; };

  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile = () => matchMedia('(max-width:640px)').matches;
  const track = (event, params={}) => report(event, params);

  /* header */
  const hd = $('#hd');
  const onScrollHd = () => hd.classList.toggle('scrolled', scrollY > 8);
  addEventListener('scroll', onScrollHd, {passive:true}); onScrollHd();

  /* mobile drawer */
  const menuBtn = $('.menu-btn'), drawer = $('#drawer');
  const setMenu = (open) => { drawer.classList.toggle('open', open); menuBtn.setAttribute('aria-expanded', open); menuBtn.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기'); menuBtn.querySelector('use').setAttribute('href', open ? '#i-x' : '#i-menu'); };
  menuBtn.addEventListener('click', () => setMenu(!drawer.classList.contains('open')));
  $$('a', drawer).forEach(a => a.addEventListener('click', () => setMenu(false)));

  /* cta tracking */
  $$('[data-cta]').forEach(a => a.addEventListener('click', () => track('cta_click', {location:a.dataset.cta, target:a.getAttribute('href')})));

  /* hero ring */
  requestAnimationFrame(() => setTimeout(() => { $('#ring').classList.add('go'); $('#rcard').classList.add('go'); }, 150));

  /* reveal */
  const io = observe((es) => es.forEach(e => { if (e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } }), {threshold:.12, rootMargin:'0px 0px -6% 0px'});
  $$('.rv').forEach(el => io.observe(el));

  /* scenes play */
  const doc = $('#doc'), chat = $('#chat');
  let docTimer, docTouched = false;
  const placeNotes = () => {
    const marks = $$('mark', doc), notes = $$('.note', doc), dw = doc.clientWidth;
    marks.forEach((m,k) => {
      const n = notes[k]; if (!n) return;
      const pp = m.parentElement; const top = pp.offsetTop + pp.offsetHeight + 1;
      const left = Math.min(m.offsetLeft, dw - n.offsetWidth - 10);
      n.style.top = top + 'px'; n.style.left = Math.max(10, left) + 'px';
    });
  };
  placeNotes(); addEventListener('resize', placeNotes);
  document.fonts && document.fonts.ready.then(placeNotes);
  const setEye = (mode) => {
    doc.classList.toggle('judge', mode === 'judge');
    placeNotes();
    $$('.s1 .eye button').forEach(b => b.setAttribute('aria-pressed', b.dataset.eye === mode));
  };
  $$('.s1 .eye button').forEach(b => b.addEventListener('click', () => { docTouched = true; clearTimeout(docTimer); setEye(b.dataset.eye); track('empathy_eye_toggle', {mode:b.dataset.eye}); }));
  const playIO = observe((es) => es.forEach(e => {
    if (!e.isIntersecting) return;
    const el = e.target; el.classList.add('play'); playIO.unobserve(el);
    if (el.classList.contains('s1') && !docTouched) docTimer = setTimeout(() => setEye('judge'), reduce ? 0 : 1500);
    if (el.classList.contains('s2')) setTimeout(() => chat.classList.add('is-done'), reduce ? 0 : 3700);
    if (el.querySelector('#crit')) runScan();
  }), {threshold:.45});
  $$('.scene, .step[data-play]').forEach(el => playIO.observe(el));

  /* criteria scan loop */
  function runScan(){
    const list = $('#crit'), rows = $$('li', list), scan = $('.scan', list);
    let i = 0, hits = 0;
    const step = () => {
      const r = rows[i];
      scan.style.top = r.offsetTop + 'px'; scan.style.height = r.offsetHeight + 'px';
      if (r.hasAttribute('data-hit')) setTimeout(() => r.classList.add('hit'), 300);
      i++;
      if (i < rows.length) setTimeout(step, reduce ? 0 : 650);
      else setTimeout(() => { scan.style.opacity = 0; }, 700);
    };
    step();
  }

  /* mobile scenes dots */
  const scenes = $('#scenes'), dots = $$('#dots i');
  scenes.addEventListener('scroll', () => {
    const cards = $$('.scene', scenes); const mid = scenes.scrollLeft + scenes.clientWidth/2;
    let idx = 0, best = 1e9;
    cards.forEach((c,k) => { const d = Math.abs(c.offsetLeft + c.offsetWidth/2 - mid); if (d < best){ best = d; idx = k; } });
    dots.forEach((d,k) => d.classList.toggle('on', k === idx));
  }, {passive:true});

  /* ===== sample report viewer ===== */
  const SECTIONS = [
    {id:'overview', t:'종합 진단', d:'76점 · B+ 등급과 한 줄 진단', at:0},
    {id:'criteria', t:'심사 기준별 진단', d:'배점 기준에 따른 항목별 점수와 근거', at:.1074},
    {id:'strengths', t:'살려야 할 강점', d:'페이지 위치까지 짚은 강점 3건', at:.2185},
    {id:'basic', t:'기본 점검', d:'분량·필수 구성·심사위원의 첫 30초', at:.2815},
    {id:'weaknesses', t:'점수를 잃고 있는 지점', d:'감점 요인 5건의 진단과 수정안', at:.379, lock:true},
    {id:'questions', t:'문장 첨삭 · 예상 질문', d:'첨삭 12건 · 심사위원 예상 질문 6개', at:.6573, lock:true},
    {id:'deep', t:'심층 분석', d:'보완 후 점수 시뮬레이션과 로드맵', at:.8099, lock:true},
  ];
  const CLIP_AT = .52; // 리포트 자체의 '심층 분석 영역' 배너 아래까지 먼저 보여줌
  const img = $('#reportImg'), clip = $('#clip'), toc = $('#toc'), chips = $('#chips');
  const lockSvg = '<svg aria-hidden="true"><use href="#i-lock"/></svg>';
  SECTIONS.forEach((s,k) => {
    const li = document.createElement('li');
    li.innerHTML = `<button type="button"><b>${s.t}${s.lock?lockSvg:''}</b><small>${s.d}</small></button>`;
    li.querySelector('button').addEventListener('click', () => goTo(k));
    toc.appendChild(li);
    const c = document.createElement('button');
    c.type = 'button'; c.setAttribute('role','tab'); c.innerHTML = s.t + (s.lock?lockSvg:'');
    c.addEventListener('click', () => goTo(k));
    chips.appendChild(c);
  });
  const tocItems = $$('li', toc), chipItems = $$('button', chips);
  let open = false;
  const fullH = () => img.getBoundingClientRect().height;
  const setClip = () => { if (!open) clip.style.height = Math.round(fullH() * CLIP_AT) + 'px'; };
  const expand = (instant) => {
    if (open) return; open = true;
    clip.style.height = fullH() + 'px'; clip.classList.add('open');
    const done = () => { if (open) clip.style.height = 'auto'; };
    instant ? done() : setTimeout(done, 750);
    track('sample_expand');
  };
  $('#expandBtn').addEventListener('click', () => expand());
  if (img.complete) setClip(); else img.addEventListener('load', setClip);
  setClip();
  addEventListener('resize', setClip);

  const offsetTop = () => (isMobile() ? chips.offsetHeight : 54) + parseInt(getComputedStyle(document.documentElement).getPropertyValue('--hd')) + 6;
  function goTo(k){
    const s = SECTIONS[k];
    if (s.lock && !open) expand(true);
    const y = img.getBoundingClientRect().top + scrollY + fullH() * s.at - offsetTop() + (k === 0 ? 0 : 4);
    scrollTo({top: y, behavior: reduce ? 'auto' : 'smooth'});
    track('sample_section_click', {section_id:s.id});
  }
  let cur = -1; const seen = new Set();
  function syncViewer(){
    const r = img.getBoundingClientRect();
    const visibleH = open ? r.height : r.height * CLIP_AT;
    const pos = (offsetTop() + 40 - r.top) / r.height;
    let k = 0; SECTIONS.forEach((s,i) => { if (pos >= s.at) k = i; });
    if (!open && k > 4) k = 4;
    const prog = Math.min(1, Math.max(0, (offsetTop() + innerHeight*.5 - r.top) / visibleH));
    $('#vwProg').style.width = (prog*100).toFixed(1) + '%';
    if (k !== cur){
      cur = k;
      tocItems.forEach((li,i) => li.classList.toggle('on', i === k));
      chipItems.forEach((c,i) => { c.classList.toggle('on', i === k); c.setAttribute('aria-selected', i === k); });
      $('#vwCur').textContent = SECTIONS[k].t;
      $('#vwPg').textContent = (k+1) + ' / ' + SECTIONS.length;
      const c = chipItems[k]; if (c && chips.scrollWidth > chips.clientWidth) chips.scrollTo({left: c.offsetLeft - 12, behavior: reduce ? 'auto' : 'smooth'});
      if (r.top < innerHeight && !seen.has(k)){ seen.add(k); track('sample_section_view', {section:SECTIONS[k].t}); }
    }
  }
  addEventListener('scroll', syncViewer, {passive:true}); syncViewer();

  /* lightbox */
  const lb = $('#lb'), lbSc = $('#lbSc');
  let lastFocus;
  const setZoom = (z) => {
    const ratio = lbSc.scrollTop / Math.max(1, lbSc.scrollHeight);
    lb.classList.toggle('z2', z === 2);
    $$('.seg button', lb).forEach(b => b.setAttribute('aria-pressed', +b.dataset.z === z));
    requestAnimationFrame(() => { lbSc.scrollTop = ratio * lbSc.scrollHeight; if (z === 2) lbSc.scrollLeft = (lbSc.scrollWidth - lbSc.clientWidth) / 2; });
  };
  const openLB = () => {
    lastFocus = document.activeElement;
    const r = img.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (offsetTop() - r.top) / r.height));
    lb.classList.add('open'); document.body.style.overflow = 'hidden';
    setZoom(isMobile() ? 2 : 1);
    requestAnimationFrame(() => { lbSc.scrollTop = ratio * lbSc.scrollHeight; $('#lbClose').focus(); });
    track('sample_zoom_open');
  };
  const closeLB = () => { lb.classList.remove('open'); document.body.style.overflow = ''; lastFocus && lastFocus.focus(); };
  img.addEventListener('click', openLB);
  $('#zoomBtn').addEventListener('click', openLB);
  $('#lbClose').addEventListener('click', closeLB);
  $$('.seg button', lb).forEach(b => b.addEventListener('click', () => setZoom(+b.dataset.z)));
  addEventListener('keydown', e => { if (e.key === 'Escape' && lb.classList.contains('open')) closeLB(); });
  const hint = $('#tapHint');
  addEventListener('scroll', function h(){ if (img.getBoundingClientRect().top < innerHeight*.3){ setTimeout(() => hint.classList.add('gone'), 2600); removeEventListener('scroll', h); } }, {passive:true});

  /* header CTA / mobile bar / nav state */
  const hdCta = $('.hd-cta'), mbar = $('#mbar'), mbarBtn = $('.btn', mbar);
  const secs = ['empathy','how','sample','faq'].map(id => document.getElementById(id));
  const sample = $('#sample'), signup = $('#signup'), hero = $('.hero');
  function syncState(){
    const vh = innerHeight;
    const reachedSample = sample.getBoundingClientRect().top < vh * .35;
    hdCta.textContent = reachedSample ? '사전 신청하기' : '리포트 보기';
    hdCta.setAttribute('href', reachedSample ? '#signup' : '#sample');
    hdCta.classList.toggle('is-signup', reachedSample);
    mbarBtn.textContent = reachedSample ? '사전 신청하기' : '샘플 리포트 보기';
    mbarBtn.setAttribute('href', reachedSample ? '#signup' : '#sample');
    const pastHero = hero.getBoundingClientRect().bottom < vh * .4;
    const sr = signup.getBoundingClientRect();
    const inSignup = sr.top < vh * .85 && sr.bottom > 0;
    const inSample = sample.getBoundingClientRect().top < vh*.2 && sample.getBoundingClientRect().bottom > vh*.6;
    mbar.classList.toggle('show', pastHero && !inSignup && !inSample);
    let on = null; secs.forEach(s => { const r = s.getBoundingClientRect(); if (r.top < vh*.4 && r.bottom > vh*.4) on = s.id; });
    $$('.gnb a').forEach(a => a.classList.toggle('on', a.dataset.nav === on));
  }
  addEventListener('scroll', syncState, {passive:true}); addEventListener('resize', syncState); syncState();


 return () => { cleanups.forEach(fn => fn()); };
}
