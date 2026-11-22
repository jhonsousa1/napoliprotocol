/* NapoliProtocol · jornada: ladrilhos vivos, câmera (fallback em JS), foco, abertura, trilho, doca, diálogos e desenhos dinâmicos.
   Não faz nada sob ?prerender. A rolagem é sempre nativa: nenhum preventDefault em wheel/touch/teclas. */
(function(){
  'use strict';
  if(/prerender/.test(location.search) || !window.NP) return;
  const NP = window.NP, T = NP.T, C = NP.C, root = document.documentElement, fill = NP.fill;
  const $ = (s, r=document) => r.querySelector(s), $$ = (s, r=document) => [...r.querySelectorAll(s)];
  const mo = root.classList.contains('mo'), jsd = root.classList.contains('jsd');
  const clamp = v => Math.min(1, Math.max(0, v));
  const mqMobile = matchMedia('(max-width:820px),(max-aspect-ratio:4/5)'), mqLow = matchMedia('(max-height:520px) and (orientation:landscape)');
  const tiles = $$('main > .tile, .journey .tile');
  const byId = id => document.getElementById(id);

  /* ---------- geometria da área útil (mesmos insets do view-timeline) ---------- */
  const probe = document.createElement('div');
  probe.setAttribute('aria-hidden','true');
  probe.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;padding-top:var(--in-top);padding-bottom:var(--in-bot)';
  document.body.appendChild(probe);
  const geo = () => {const cs=getComputedStyle(probe), top0=parseFloat(cs.paddingTop)||0, bot=parseFloat(cs.paddingBottom)||0; return {top0, A:innerHeight-top0-bot}};
  NP.geo = geo;
  /* posição de rolagem em que o âncora do ladrilho fica "em repouso" (a mesma conta do navegador: scroll-padding + scroll-margin) */
  NP.restY = id => {
    const t = byId(id), r = t.getBoundingClientRect(), pad = parseFloat(getComputedStyle(root).scrollPaddingTop)||0, mar = parseFloat(getComputedStyle(t).scrollMarginTop)||0;
    return Math.max(0, Math.min(r.top + scrollY - pad - mar, root.scrollHeight - innerHeight));
  };
  const staticLike = () => !mo || mqLow.matches;

  /* ---------- ladrilhos vivos: só os que estão perto da tela têm figura e animações ---------- */
  const live = new Set();
  if(mo){
    const io = new IntersectionObserver(es=>{
      es.forEach(e=>{e.target.classList.toggle('live',e.isIntersecting); e.isIntersecting?live.add(e.target):live.delete(e.target)});
      if(jsd) schedule();
    },{rootMargin:'60% 0px'});
    tiles.forEach(t=>io.observe(t));
    requestAnimationFrame(()=>requestAnimationFrame(()=>root.classList.add('rdy')));
  }

  /* ---------- fallback JS da câmera (jsd): a mesma matemática do view-timeline ---------- */
  let raf = 0;
  function schedule(){ if(!raf) raf = requestAnimationFrame(drive) }
  function drive(){
    raf = 0; if(!jsd || mqLow.matches) return;
    const {top0, A} = geo(), seg = p => clamp((p-.25)/.5);
    live.forEach(t=>{
      const sc = t.querySelector(':scope > .scene'); if(!sc) return;
      const r = t.getBoundingClientRect(), first = t.classList.contains('first'), last = t.classList.contains('last');
      const en = clamp((top0+A-r.top)/A), ex = clamp((top0+A-r.bottom)/A), c = clamp((top0+A-r.top)/(A+r.height));
      let x = en<1 ? (1-seg(en))*100 : -seg(ex)*100, o = en<1 ? clamp((en-.8)/.12) : 1-clamp((ex-.08)/.12);
      if(first){x = -seg(ex)*100; o = 1-clamp((ex-.08)/.12)}
      if(last && en>=1){x = 0; o = 1}
      sc.style.transform = `translate3d(calc(${x}% - ${x/100}px),0,0)`;   // 1px de sobreposição, como nos keyframes
      const f = sc.querySelector('.art.far'), n = sc.querySelector('.art.near'), tg = sc.querySelector('.tags');
      if(f) f.style.transform = `translate3d(${4-8*c}%,0,0)`;
      if(n) n.style.transform = `translate3d(${-9+18*c}%,0,0)`;
      if(tg) tg.style.opacity = o;
    });
  }
  if(mo && jsd){ addEventListener('scroll',schedule,{passive:true}); addEventListener('resize',schedule); schedule(); }

  /* ---------- cartão mais alto que a tela: gruda mais acima para o pé ("Feito") ficar alcançável ---------- */
  function fit(){
    const bar = parseFloat(getComputedStyle(root).getPropertyValue('--bar'))||56;
    $$('.tile .card').forEach(c=>{c.style.setProperty('--ctop', Math.max(8, Math.min(bar+32, innerHeight-c.offsetHeight-16))+'px')});
  }
  if(mo){ fit(); addEventListener('resize',fit); NP.onRender.push(fit); document.fonts && document.fonts.ready.then(fit); }

  /* ---------- etapa em foco: trilho, doca, posição na barra, última etapa ---------- */
  const seq = [...tiles, byId('epilogo')].filter(Boolean);
  const meta = {}; C.journey.forEach(j=>meta[j.id]=j);
  const N = C.journey.filter(j=>j.kind==='step').length;
  const pos = byId('pos'), dlbl = byId('dlbl'), prev = byId('prev'), nextd = byId('nextd');
  const esc = x => String(x).replace(/&/g,'&amp;').replace(/\u003c/g,'&lt;');
  let cur = '';
  function labelFor(id){
    const t = byId(id), m = meta[id];
    if(id==='epilogo') return [T.epilogue, T.epiSub, T.epilogue];
    if(id==='abertura') return [T.start0, T.start, ''];
    if(m.kind==='step') return [`${m.n}/${N} · ${m.title}`, m.day, fill(T.pos,{day:m.day.split(' · ')[0], n:String(m.n).padStart(2,'0'), N})];
    if(m.kind==='cold') return [m.title, m.day, m.day];
    return [m.title, T.prologue, T.prologue];
  }
  function setCur(id){
    if(id===cur) return; cur = id;
    const i = seq.findIndex(s=>s.id===id), [a,b,p] = labelFor(id);
    $$('.rail a,.idx-list a').forEach(x=> x.dataset.for===id ? x.setAttribute('aria-current','step') : x.removeAttribute('aria-current'));
    if(pos) pos.textContent = p;
    if(dlbl) dlbl.innerHTML = `${esc(a)}<small>${esc(b)}</small>`;
    if(prev) prev.href = '#'+seq[Math.max(0,i-1)].id;
    if(nextd) nextd.href = '#'+seq[Math.min(seq.length-1,i+1)].id;
  }
  /* linha de foco: no desktop a 45 % da altura; no mobile, dentro da janela de leitura (abaixo do palco) */
  let fio = null;
  function watchFocus(){
    if(!('IntersectionObserver' in window)) return;
    if(fio) fio.disconnect();
    let line = .45*innerHeight;
    if(mqMobile.matches && mo){const g = geo(); line = g.top0 + .15*g.A}
    const top = Math.round(line), bot = Math.max(0, Math.round(innerHeight - line) - 2);
    fio = new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting) setCur(e.target.id)}),{rootMargin:`-${top}px 0px -${bot}px 0px`});
    seq.forEach(s=>fio.observe(s));
  }
  watchFocus(); addEventListener('resize',watchFocus);
  setCur('abertura');

  /* ---------- abertura: receita, quantidade, começar, retomar ---------- */
  const qty = byId('qty'), sum = byId('sum');
  const segs = $$('#ask .seg button');
  const go = id => { const t = byId(id); if(t) t.scrollIntoView({behavior: mo?'smooth':'auto', block:'start'}) };
  function setQty(v){
    v = Math.round(+v); if(!isFinite(v) || v<=0) return;
    NP.set(NP.P().mode==='pizza' ? {pizzas:Math.min(20,Math.max(1,v))} : {flour:Math.min(6000,Math.max(200,v))});
  }
  segs.forEach(b=>b.addEventListener('click',()=>{
    const m = b.dataset.mode, R = NP.calc(), P = NP.P(); if(m===P.mode) return;
    NP.set(m==='pizza' ? {mode:'pizza', pizzas:R.n} : {mode:'flour', flour:Math.round(R.flour/10)*10});
  }));
  const less = byId('less'), more = byId('more');
  if(less) less.addEventListener('click',()=>{const P=NP.P(); setQty(P.mode==='pizza'?P.pizzas-1:P.flour-50)});
  if(more) more.addEventListener('click',()=>{const P=NP.P(); setQty(P.mode==='pizza'?P.pizzas+1:P.flour+50)});
  if(qty) qty.addEventListener('input',e=>setQty(e.target.value));
  const firstStep = C.journey.find(j=>j.kind==='step');
  const ask = byId('ask');
  if(ask) ask.addEventListener('submit',e=>{e.preventDefault(); if(firstStep) go(firstStep.id)});
  /* retomar = primeira etapa não marcada como Feito; só aparece depois de algum Feito (rolar não conta) */
  const steps = C.journey.filter(j=>j.kind==='step'), goB = byId('go'), goTxt = goB && goB.textContent;
  function resume(){
    const a = byId('resume'); if(!a || !goB) return;
    const done = NP.store.get(NP.LS+':done') || {}, m = steps.some(j=>done[j.id]) && steps.find(j=>!done[j.id]);
    a.hidden = !m; a.classList.toggle('primary', !!m); a.classList.toggle('ghost', !m);
    goB.classList.toggle('ghost', !!m); goB.textContent = m ? goB.dataset.restart : goTxt;
    if(m){ a.href = '#'+m.id; a.innerHTML = `${esc(fill(T.resume,{n:String(m.n).padStart(2,'0')}))}<small>${esc(m.title)}</small>`; }
  }
  resume(); document.addEventListener('change', e=>{ if(e.target.matches('input[data-step]')) resume() });
  const rst = byId('resetChecks'); if(rst) rst.addEventListener('click', resume);

  /* ---------- trocar de receita leva o número de pizzas (nunca os gramas) ---------- */
  document.addEventListener('click',e=>{
    const a = e.target.closest('a[data-recipe]'); if(!a) return;
    if(a.dataset.recipe===C.id){ e.preventDefault(); return; }
    const n = NP.calc().n, k = a.dataset.ls+':p';
    NP.store.set(k, Object.assign({}, NP.store.get(k)||{}, {mode:'pizza', pizzas:n}));
  });

  /* ---------- diálogos: ajustes e índice ---------- */
  const adj = byId('adj'), idx = byId('idx');
  const mot = byId('aMo'), motNote = byId('aMoNote');
  const sysReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function openAdj(section){
    if(!adj) return;
    if(mot){ mot.checked = mo; mot.disabled = sysReduced; if(motNote) motNote.hidden = !sysReduced; }
    if(section){const d = byId('adj-'+section); if(d) d.open = true;}
    if(!adj.open) adj.showModal();
    if(section){const d = byId('adj-'+section); if(d) d.scrollIntoView({block:'nearest'});}
  }
  const bo = byId('openAdj'); if(bo) bo.addEventListener('click',()=>openAdj());
  [adj, idx].forEach(d=>{ if(d) d.addEventListener('click',e=>{ if(e.target===d) d.close() }) });
  document.addEventListener('click',e=>{
    const a = e.target.closest('a[href="#adj-agenda"]'); if(a){ e.preventDefault(); openAdj('agenda'); return; }
    if(e.target.closest('[data-close-adj]') && adj) adj.close();
    if(e.target.closest('.idx-list a') && idx) idx.close();
  });
  if(dlbl && idx) dlbl.addEventListener('click',()=>{ idx.showModal() });
  if(mot) mot.addEventListener('change',()=>{ NP.store.set('np-ui',{motion:mot.checked}); location.reload(); });

  /* ---------- desenhos dinâmicos: panetti e potes, conforme o cálculo ---------- */
  const NS = 'http://www.w3.org/2000/svg';
  function drawBalls(box){
    const n = NP.calc().n, big = +(box.dataset.s||1);
    box.textContent = '';
    const show = Math.min(n,12), rows = show>6?2:1, perRow = Math.ceil(show/rows);
    const sp = Math.min(96*big, 400/perRow), r = Math.min(44*big, sp*.47);
    for(let i=0;i<show;i++){
      const row = rows===2&&i<show-perRow?0:1, idx = row===0?i:i-(rows===2?show-perRow:0), cnt = row===0?show-perRow:perRow;
      const s = rows===2&&row===0?.86:1, cx = 930+(idx-(cnt-1)/2)*sp, cy = (row===0&&rows===2?582:600)-r*s*.72;
      const G = document.createElementNS(NS,'g'); G.setAttribute('class','ball'); G.style.setProperty('--i',i);
      G.innerHTML = `<ellipse cx="${cx}" cy="${cy+r*s*.7}" rx="${r*s}" ry="${r*s*.22}" fill="url(#gCon)"/><ellipse cx="${cx}" cy="${cy}" rx="${r*s}" ry="${r*s*.76}" fill="url(#gDough)"/><path d="M${cx+r*s*.2} ${cy-r*s*.5}q${r*s*.38} ${r*s*.08} ${r*s*.48} ${r*s*.4}" stroke="#fff" stroke-opacity=".7" stroke-width="${r*.1}" stroke-linecap="round" fill="none"/>`;
      box.appendChild(G);
    }
    if(n>12){const t = document.createElementNS(NS,'text'); t.setAttribute('x',1150); t.setAttribute('y',540); t.setAttribute('class','tn'); t.textContent = '+'+(n-12); box.appendChild(t);}
  }
  function drawPots(box){
    const n = Math.min(NP.calc().n, 8), cols = n>4?4:n, rows = Math.ceil(n/cols), sp = Math.min(130, 520/cols);
    box.textContent = '';
    for(let i=0;i<n;i++){
      const rw = Math.floor(i/cols), cn = rw===rows-1 ? n-rw*cols : cols, ix = i-rw*cols;
      const cx = 930+(ix-(cn-1)/2)*sp, y = rw===0&&rows>1 ? 520 : 592, s = rw===0&&rows>1 ? .84 : 1;
      const G = document.createElementNS(NS,'g'); G.setAttribute('class','ball'); G.style.setProperty('--i',i);
      G.innerHTML = `<use href="#pot" transform="translate(${cx} ${y}) scale(${s})"/>`;
      box.appendChild(G);
    }
  }
  const redraw = () => { $$('[data-draw="balls"]').forEach(drawBalls); $$('[data-draw="pots"]').forEach(drawPots); };
  NP.onRender.push(redraw);
  /* abrir com âncora: refaz o alinhamento depois que fontes e --ctop assentam (o layout muda e a âncora nativa fica torta) */
  const hh = decodeURIComponent(location.hash.slice(1)), ht = hh && byId(hh);
  if(ht && tiles.includes(ht) && document.fonts) document.fonts.ready.then(()=>requestAnimationFrame(()=>window.scrollTo({top:NP.restY(hh),behavior:'instant'})));
  NP.onRender.forEach(f=>f());
  document.dispatchEvent(new Event('np:ready'));
})();
