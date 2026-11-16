/* NapoliProtocol · estado, cálculo e ferramentas (parâmetros, cronograma, "feito", timer, diagnóstico, tema, JSON-LD).
   Roda também sob ?prerender. A câmera, a abertura e a navegação ficam em journey.js. */
(function(){
  'use strict';
  const T = window.__T; delete window.__T;
  const C = T.cfg, DEF = C.def, LS = C.ls;
  const root = document.documentElement;
  const store = {get(k){try{return JSON.parse(localStorage.getItem(k))}catch(e){return null}}, set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
  const el = id => document.getElementById(id);
  const on = (id, ev, fn) => { const e = el(id); if(e) e.addEventListener(ev, fn); return e; };
  let P = Object.assign({}, DEF, store.get(LS+':p')||{});
  let done = store.get(LS+':done') || {};
  const fill = (s,o) => s.replace(/\{(\w+)\}/g,(m,k)=> k in o ? o[k] : m);

  const nf0 = new Intl.NumberFormat(T.locale,{maximumFractionDigits:0});
  const nf1 = new Intl.NumberFormat(T.locale,{minimumFractionDigits:1,maximumFractionDigits:1});
  const nf2 = new Intl.NumberFormat(T.locale,{maximumFractionDigits:2});
  const g = v => v < 10 ? nf1.format(v) : nf0.format(Math.round(v));
  const pct = v => nf2.format(v);

  function nextDefaultBake(){
    const d = new Date(); const t = new Date(d);
    t.setHours(19,30,0,0); t.setDate(t.getDate()+1);
    while(t.getDay()!==6 || (t-d) < 60*3600e3) t.setDate(t.getDate()+1);
    return toLocalInput(t);
  }
  function toLocalInput(t){const z=n=>String(n).padStart(2,'0');return `${t.getFullYear()}-${z(t.getMonth()+1)}-${z(t.getDate())}T${z(t.getHours())}:${z(t.getMinutes())}`}
  if(!P.bake) P.bake = nextDefaultBake();

  function calc(){
    const ratio = 1 + P.hyd/100 + P.salt/100 + P.oil/100 + P.yeast/100 + P.sugar/100;
    const flour = P.mode==='pizza' ? (P.pizzas*P.w)/ratio : P.flour;
    const water = flour*P.hyd/100, salt = Math.round(flour*P.salt/100), oil = Math.round(flour*P.oil/100), yeast = flour*P.yeast/100, sugar = flour*P.sugar/100;
    const total = flour+water+salt+oil+yeast+sugar;
    const pfFlour = C.features.preferment ? flour*P.pf/100 : 0, pfWater = pfFlour;
    const finFlour = flour-pfFlour, finWater = Math.max(0, water-pfWater);
    const saltWater = Math.min(Math.round(salt*1.1), finWater);
    const bassWater = Math.max(0, Math.round(finWater) - Math.round(finWater*0.62) - saltWater);
    const initWater = Math.round(finWater) - bassWater;   // inclui a água em que o sal é dissolvido
    const n = Math.max(1, Math.round(total/P.w)), per = total/n;
    const nF = Math.floor(total/P.w), rem = total - nF*P.w;
    const alt = (nF>=1 && nF!==n && rem>30 && rem<P.w*0.6) ?   // bolinha de teste só quando sobra pouca massa
       `${nF} × ${P.w} g + ${T.test} ${g(rem)} g` : (n>1 && Math.abs(per-P.w)>8 ? `${n+ (per>P.w?1:-1)} × ${g(total/(n+(per>P.w?1:-1)))} g` : '—');
    const sauceTotal = n*P.sauce, cheeseTotal = n*P.cheese, cans = Math.max(1, Math.ceil(sauceTotal/400));
    return {flour, water, salt, oil, yeast, sugar, total, pfFlour, pfWater, pfTotal:pfFlour+pfWater+yeast, finFlour, finWater, saltWater, initWater, bassWater, n, per, alt, sauceTotal, cheeseTotal, cans,
      canSalt: cans*4+'–'+cans*5, top:P.top, bottom:P.bottom, fridge:P.fridge, pfh:P.pfh, panh:P.panh, outh:P.outh, sauce:P.sauce, cheese:P.cheese,
      hydPct:pct(P.hyd), saltPct:pct(P.salt), oilPct:pct(P.oil), yeastPct:pct(P.yeast), sugarPct:pct(P.sugar), w:P.w, pizzaFlour:P.mode==='pizza'};
  }

  const fmt = (k,v) => {
    if(typeof v === 'string') return v;
    if(['top','bottom','n','cans','pfh','panh','sauce','cheese','w'].includes(k)) return nf0.format(v);
    if(['fridge','outh'].includes(k)) return nf2.format(v);
    return g(v);
  };

  // ---------- Cronograma ----------
  const dfmt = new Intl.DateTimeFormat(T.locale,{weekday:'short',day:'2-digit',month:'2-digit'});
  const tfmt = new Intl.DateTimeFormat(T.locale,{hour:'2-digit',minute:'2-digit'});
  const wfmt = new Intl.DateTimeFormat(T.locale,{weekday:'short'});
  const relTxt = ms => {const m=Math.max(0,Math.round(ms/60e3)), dd=Math.floor(m/1440), hh=Math.floor(m%1440/60), mm=m%60;
    return fill(dd ? T.rel.d : hh ? T.rel.h : T.rel.m, {d:dd, h:hh, m: hh ? String(mm).padStart(2,'0') : mm});};
  let evs = null;
  function renderSchedule(){
    const B = new Date(P.bake); const box = el('timeline'), warn = el('schedWarn'), nx = el('nextEv');
    if(nx) nx.hidden = true;
    const whens = document.querySelectorAll('[data-when]'), lefts = document.querySelectorAll('[data-left]');
    if(isNaN(B)){ evs = null; if(box) box.innerHTML=`<li><span></span><div class="what">${T.sched.empty}</div></li>`; whens.forEach(w=>w.textContent=''); lefts.forEach(w=>w.textContent=''); return }
    const H = 3600e3;
    const v = {pfh:nf2.format(P.pfh), fridge:nf2.format(P.fridge), panh:nf0.format(P.panh), top:nf0.format(P.top), bottom:nf0.format(P.bottom), outh:nf2.format(P.outh)};
    const ev = C.sched.map((e,i)=>[new Date(B - e.off.reduce((a,x)=>a+(typeof x==='number'?x:P[x]),0)*H), e.cls, T.sched.ev[i][0], fill(T.sched.ev[i][1],v)]);
    evs = ev.map(e=>e[0]);
    const now = new Date(), up = ev.find(([d])=>d > now);
    if(box){
      box.innerHTML = ev.map(([d,c,t,p])=>`<li><div class="when"><b>${tfmt.format(d)}</b>${dfmt.format(d)}</div><div class="what"><b>${t}</b><p>${p}</p></div></li>`).join('');
      if(up) box.children[ev.indexOf(up)].classList.add('next-ev');
    }
    if(up && nx){nx.innerHTML = `${T.sched.next}: <b>${up[2]}</b><span class="em">${dfmt.format(up[0])}, ${tfmt.format(up[0])} · ${fill(T.sched.in,{rel:relTxt(up[0]-now)})}</span>`; nx.hidden = false;}
    const msgs=[];
    if(ev[0][0] < now) msgs.push(T.sched.past);
    if(P.panh>C.warn.panhMax) msgs.push(T.sched.over36);
    if(warn){warn.innerHTML = msgs.join('<br>'); warn.hidden = !msgs.length;}
    // horário e selo "agora" em cada cartão; "faltam …" nos interlúdios
    let cur = -1; evs.forEach((d,i)=>{ if(d<=now) cur=i });
    if(cur===evs.length-1 && now-evs[cur] > 3*H) cur = -1;
    whens.forEach(w=>{const i=+w.dataset.when, d=evs[i]; if(!d) return; w.textContent = `${wfmt.format(d).replace('.','')} ${tfmt.format(d)}`;
      const nw = w.parentElement.querySelector('.now'); if(nw) nw.hidden = i!==cur});
    lefts.forEach(w=>{const d=evs[+w.dataset.left+1]; w.textContent = d && d>now ? fill(T.left,{rel:relTxt(d-now)}) : ''});
    document.querySelectorAll('.rail a').forEach(a=>{const t=el(a.dataset.for); a.classList.toggle('now', !!t && +t.dataset.ev===cur)});
  }

  // ---------- Render ----------
  let ready = false;
  const flashOK = () => ready && root.classList.contains('mo');
  function render(){
    const R = calc();
    document.querySelectorAll('[data-k]').forEach(e=>{const k=e.dataset.k; if(k in R){const t=fmt(k,R[k]); if(e.textContent!==t){const had=e.textContent!==''; e.textContent=t; if(had&&flashOK()&&e.animate) e.animate([{backgroundColor:'rgb(242 166 74 / .45)'},{backgroundColor:'transparent'}],{duration:600,easing:'ease-out'});}}});
    const alt = el('altRow'); if(alt) alt.hidden = R.alt==='—';
    const w=[];
    if(P.hyd!==C.warn.hyd) w.push(T.warn.hyd);
    if(R.per<C.warn.perMin||R.per>C.warn.perMax) w.push(fill(T.warn.per,{per:g(R.per)}));
    if(P.bottom>C.warn.bottomMax) w.push(T.warn.bottom);
    const wb=el('warnBox'); if(wb){wb.innerHTML = w.map(x=>'<span>'+x+'</span>').join('<br>'); wb.hidden=!w.length;}
    const bs = el('barSum'); if(bs) bs.textContent = fill(T.barSum,{flour:nf0.format(Math.round(R.flour)), n:R.n});
    renderSchedule(); updateProgress();
    NP.onRender.forEach(f=>f());
  }

  // ---------- Campos de ajuste ----------
  const map = {flour:'p-flour',pizzas:'p-pizzas',w:'p-w',hyd:'p-hyd',salt:'p-salt',oil:'p-oil',yeast:'p-yeast',sugar:'p-sugar',pf:'p-pf',fridge:'p-fridge',top:'p-top',bottom:'p-bottom',sauce:'p-sauce',cheese:'p-cheese',pfh:'p-pfh',panh:'p-panh',outh:'p-outh',bake:'p-bake'};
  for(const k in map) if(!el(map[k])) delete map[k];   // campos que a receita não usa
  function syncInputs(){ for(const k in map){const i=el(map[k]); if(document.activeElement!==i) i.value = P[k]} setMode(P.mode,false) }
  for(const k in map){
    on(map[k],'input', e=>{
      if(k==='bake'){P.bake=e.target.value}else{const v=parseFloat(e.target.value); if(isNaN(v)||v<=0) return; P[k]=v}
      store.set(LS+':p',P); render();
    });
  }
  function setMode(m, save=true){
    P.mode=m;
    const f=el('modeFlour'), p=el('modePizza'), rf=el('rowFlour'), rp=el('rowPizzas');
    if(f) f.setAttribute('aria-pressed', m==='flour'); if(p) p.setAttribute('aria-pressed', m==='pizza');
    if(rf) rf.hidden = m!=='flour'; if(rp) rp.hidden = m!=='pizza';
    if(save){store.set(LS+':p',P); render()}
  }
  on('modeFlour','click',()=>{ if(P.mode==='pizza'){P.flour=Math.round(calc().flour/10)*10; el('p-flour').value=P.flour} setMode('flour') });
  on('modePizza','click',()=>{ if(P.mode==='flour'){P.pizzas=calc().n; el('p-pizzas').value=P.pizzas} setMode('pizza') });
  on('resetParams','click',()=>{const b=P.bake; P=Object.assign({},DEF,{bake:b}); store.set(LS+':p',P); syncInputs(); render()});
  on('resetChecks','click',()=>{done={}; store.set(LS+':done',done); applyChecks()});

  // ---------- "Feito" e progresso ----------
  function applyChecks(){
    document.querySelectorAll('input[data-step]').forEach(i=>{const on=!!done[i.dataset.step]; i.checked=on; const t=i.closest('.tile'); if(t) t.classList.toggle('is-done',on)});
    updateProgress();
  }
  function updateProgress(){
    const boxes=[...document.querySelectorAll('input[data-step]')], tot=boxes.length, n=boxes.filter(b=>done[b.dataset.step]).length;
    const cnt=el('cnt'); if(cnt) cnt.textContent=`${n}/${tot}`;
    const pg=el('prog'); if(pg) pg.style.width=(tot?n/tot*100:0)+'%';
    document.querySelectorAll('.rail a,.idx-list a').forEach(a=>a.classList.toggle('done',!!done[a.dataset.for]));
  }
  document.addEventListener('change',e=>{const i=e.target.closest&&e.target.closest('input[data-step]'); if(!i) return; done[i.dataset.step]=i.checked; store.set(LS+':done',done); applyChecks()});

  // ---------- Timer (baseado em relógio: continua certo com a aba em segundo plano) ----------
  const TM=C.timer, mmss=TM.max>=300;
  const clock=el('clock'), head=el('head'), st=el('tStatus'), bS=el('tStart'), mini=el('mini');
  const ring=document.querySelector('.ring-fill'), rtt=document.querySelector('.rt .tt'), pie=document.querySelector('.pie'), spots=document.querySelector('.spots');
  let acc=0, t0=0, run=false, raf=0, lock=null, zone=-1, cardSeen=true;
  const motion = () => root.classList.contains('mo');
  const elapsed=()=>acc+(run?(performance.now()-t0)/1000:0);
  const mm = s => `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;
  const clockTxt=s=>mmss?`${mm(s)}<small> min</small>`:`${Math.floor(s)}<small> s</small>`;
  function syncMini(){ if(!mini) return; const show=run&&!cardSeen; mini.hidden=!show; if(show) mini.textContent='⏱ '+mm(elapsed()); }
  function paintTimer(){
    if(!clock) return;
    let s=elapsed(); const k=TM.marks, M=T.timer.msg;
    clock.innerHTML=clockTxt(s);
    head.style.left=Math.min(100,s/TM.max*100)+'%';
    const sv = motion() ? s : Math.floor(s);                       // movimento reduzido: o anel avança em passos de 1 s
    if(ring) ring.setAttribute('stroke-dasharray',`${Math.min(sv,TM.max)} ${TM.max}`);
    if(rtt) rtt.textContent=mm(s);
    if(pie && motion()){pie.style.transform=`scaleY(${1+.35*Math.min(1,s/k[2])})`}
    if(spots) spots.setAttribute('opacity',Math.max(0,Math.min(1,(s-k[2]*.8)/(k[2]*.5))));
    syncMini();
    const z = s===0&&!run ? -1 : s<k[0]?0 : s<=k[1]?1 : s<k[2]?2 : s<=k[3]?3 : 4;
    if(z!==zone){zone=z; st.textContent = z<0 ? T.timer.idle : M[z]; st.dataset.z=z}
    if(run) raf=requestAnimationFrame(paintTimer);
  }
  async function getLock(){try{lock=await navigator.wakeLock?.request('screen')}catch(e){}}
  if(bS){
    st.textContent=T.timer.idle; bS.textContent=T.timer.start;
    bS.onclick=()=>{
      if(!run){t0=performance.now(); run=true; bS.textContent=T.timer.pause; getLock(); paintTimer()}
      else{acc=elapsed(); run=false; cancelAnimationFrame(raf); bS.textContent=T.timer.resume; try{lock&&lock.release()}catch(e){} paintTimer()}
    };
    on('tReset','click',()=>{run=false;cancelAnimationFrame(raf);acc=0;zone=-2;bS.textContent=T.timer.start;try{lock&&lock.release()}catch(e){} paintTimer(); syncMini()});
    document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='visible'&&run){getLock();paintTimer()} });
    if('IntersectionObserver' in window){new IntersectionObserver(es=>{cardSeen=es[0].isIntersecting;syncMini()}).observe(bS.closest('.card'))}
    paintTimer();
  }

  // ---------- Diagnóstico ----------
  const DIAG = T.diag.map(([s,fix,key,d])=>({s,fix,key,d}));
  const chips=el('chips'), out=el('diagOut');
  if(chips){
    chips.innerHTML=DIAG.map((d,i)=>`<button type="button" class="chip" data-i="${i}" aria-pressed="false">${d.s}</button>`).join('');
    chips.addEventListener('click',e=>{
      const c=e.target.closest('.chip'); if(!c) return; const d=DIAG[c.dataset.i];
      chips.querySelectorAll('.chip').forEach(x=>x.setAttribute('aria-pressed',x===c));
      let h=`<b>${d.fix}</b>`;
      if(d.key){const cur=P[d.key], nv=cur+d.d, lbl=d.key==='bottom'?T.lower:T.upper;
        h+=`<span>${fill(T.diagCur,{lbl, cur:nf0.format(cur), nv:`<span class="mono">${nf0.format(nv)} °C</span>`})}</span><div><button type="button" class="btn small primary" id="applyDiag">${fill(T.apply,{v:nf0.format(nv)})}</button></div>`;}
      out.innerHTML=h;
      const a=el('applyDiag'); if(a) a.onclick=()=>{P[d.key]+=d.d; store.set(LS+':p',P); syncInputs(); render(); a.textContent=T.applied; a.disabled=true};
    });
  }

  // ---------- Tema e idioma ----------
  const themeBtn=el('themeBtn');
  const syncTheme=()=>{const dk=root.getAttribute('data-theme')==='dark'; if(themeBtn) themeBtn.setAttribute('aria-pressed',dk)};
  on('themeBtn','click',()=>{const t=root.getAttribute('data-theme')==='dark'?'light':'dark';
    root.setAttribute('data-theme',t);
    const n=new Date(), u=new Date(n); u.setMinutes(0,0,0); const h=n.getHours();
    if(h<7) u.setHours(7); else if(h<19) u.setHours(19); else {u.setDate(u.getDate()+1); u.setHours(7);}
    try{localStorage.setItem('np-theme',JSON.stringify({theme:t,until:u.getTime()}))}catch(_){}
    syncTheme()});
  syncTheme();
  document.addEventListener('click',e=>{const a=e.target.closest('[data-setlang]'); if(a) try{localStorage.setItem('np-lang',a.dataset.setlang)}catch(_){}});
  setInterval(()=>{renderSchedule()}, 60e3);

  // ---------- Dados estruturados (gerados no build; não roda se já existir) ----------
  function buildLD(){
    if(el('ld-recipe')) return;
    const R = calc(), L = T.ld, txt = e => e.textContent.replace(/\s+/g,' ').trim();
    const ing = [...document.querySelectorAll('#mise tbody tr:not(.total):not([hidden])')].map(tr=>`${txt(tr.cells[2])} ${txt(tr.cells[0])}`)
      .concat(L.toppings.map(x=>fill(x,{sauce:nf0.format(R.sauceTotal), cheese:nf0.format(R.cheeseTotal)})));
    const steps = [...document.querySelectorAll('.journey article.step')].map(a=>({'@type':'HowToStep', name:txt(a.querySelector('h3')), text:[...a.querySelectorAll('ul.ins > li')].map(txt).join(' '), url:L.url+'#'+a.id}));
    const data = {'@context':'https://schema.org','@type':'Recipe', name:L.name, description:L.description, inLanguage:L.inLanguage, url:L.url,
      image:L.images, author:{'@type':'Person', name:'Jhonathan Sousa', url:'https://www.instagram.com/jhonsousa1/', sameAs:['https://www.instagram.com/jhonsousa1/']},
      datePublished:C.ld.datePublished, prepTime:C.ld.prepTime, cookTime:C.ld.cookTime, totalTime:C.ld.totalTime, recipeYield:[String(R.n), fill(L.yield,{n:R.n})],
      recipeCategory:L.category, recipeCuisine:L.cuisine, keywords:L.keywords, recipeIngredient:ing, recipeInstructions:steps};
    const s = document.createElement('script'); s.type='application/ld+json'; s.id='ld-recipe'; s.textContent = JSON.stringify(data);
    document.head.appendChild(s);
  }

  // ---------- Abertura: quantidade e resumo (também no pré-render, para o HTML sem JS já ter valor e nome) ----------
  function updAsk(){
    const qty = el('qty'), sum = el('sum'); if(!qty) return;
    const R = calc(), pz = P.mode==='pizza';
    document.querySelectorAll('#ask .seg button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===P.mode)));
    const v = pz ? P.pizzas : P.flour;
    if(document.activeElement!==qty){qty.value = v; qty.setAttribute('value',v)}
    const u = el('qUnit'), l = el('qLbl'); if(u) u.textContent = pz ? T.unitPizza : 'g'; if(l) l.textContent = pz ? T.qtyPizza : T.qtyFlour;
    if(sum) sum.textContent = pz ? fill(T.askSumPizza,{flour:nf0.format(Math.round(R.flour)), total:g(R.total)})
                                  : fill(T.askSumFlour,{n:R.n, per:g(R.per), total:g(R.total)});
  }

  // ---------- API para journey.js ----------
  window.NP = {T, C, calc, fmt, fill, nf0, g, store, LS, onRender:[],
    P:()=>P, set(patch){Object.assign(P,patch); store.set(LS+':p',P); syncInputs(); render()},
    schedule:()=>evs, motion, done:()=>done};
  NP.onRender.push(updAsk);
  syncInputs(); applyChecks(); render();
  buildLD();
  ready = true;
  const qt = /[?&]np-t=(\d+(?:\.\d+)?)/.exec(location.search);   // gancho de QA: pinta o timer parado em N segundos
  if(qt && !/prerender/.test(location.search)){acc=+qt[1]; paintTimer()}
})();
