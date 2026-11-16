/* Subcomandos de QA além de shots/checks básicos: seam, tags, mobile, contrast, func, kb, perf, wheel. */
const J = (x) => JSON.stringify(x);
const CONTRAST = `(()=>{const lum=c=>{const [r,g,b]=c.map(v=>{v/=255;return v<=.03928?v/12.92:((v+.055)/1.055)**2.4});return .2126*r+.7152*g+.0722*b};
const parse=s=>{const m=s.match(/[\\d.]+/g).map(Number);if(/^color\\(/.test(s)){const a=s.split('/')[1];return [m[0]*255,m[1]*255,m[2]*255,a?parseFloat(a):1]}return m};
const over=(top,bot)=>{const a=top[3]??1;return [0,1,2].map(i=>top[i]*a+bot[i]*(1-a))};
const bg=(el)=>{let layers=[];for(let e=el;e;e=e.parentElement){const c=parse(getComputedStyle(e).backgroundColor);if((c[3]??1)>0){layers.push(c);if((c[3]??1)>=1)break}}let base=[255,255,255];for(const c of layers.reverse())base=over(c,base);return base};
const ratio=(el)=>{const f=parse(getComputedStyle(el).color),b=bg(el);const F=over(f,b);const l1=lum(F),l2=lum(b);return (Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05)};
return {ratio}})()`;
export const cmds = {
  async seam(pg, { opt, list, ROOT, join }) {
    const out = []; const bad = [];
    for (const vp of [{ w: 1440, h: 900 }, { w: 375, h: 812 }, { w: 1024, h: 768 }]) {
      const res = {};
      for (const drv of ['css', 'js']) {
        await pg.scenario({ ...vp, path: opt('path', '/pt/'), query: drv === 'js' ? '?np-driver=js' : '' });
        const geo = await pg.eval(`(()=>{const g=NP.geo();const t=[...document.querySelectorAll('main > .tile, .journey .tile')].map(t=>{const r=t.getBoundingClientRect();return {id:t.id,top:r.top+scrollY,bottom:r.bottom+scrollY}});return {g,t}})()`);
        const rows = [];
        for (let i = 0; i + 1 < geo.t.length; i++) {
          const y = geo.t[i].bottom - geo.g.top0 - 0.5 * geo.g.A;
          await pg.scrollTo(y); await pg.sleep?.(0);
          const r = await pg.eval(`(()=>{const a=document.getElementById('${geo.t[i].id}').querySelector(':scope > .scene'),b=document.getElementById('${geo.t[i + 1].id}').querySelector(':scope > .scene');const ra=a.getBoundingClientRect(),rb=b.getBoundingClientRect();return {aR:ra.right,bL:rb.left,aTop:ra.top,bTop:rb.top,vis:[getComputedStyle(a).display,getComputedStyle(b).display]}})()`);
          rows.push({ pair: `${geo.t[i].id}>${geo.t[i + 1].id}`, ...r, gap: +(r.aR - r.bL).toFixed(2) });
        }
        res[drv] = rows;
      }
      for (let i = 0; i < res.css.length; i++) {
        const c = res.css[i], j = res.js[i];
        const okSeam = Math.abs(c.gap - 1) <= 1.01 && c.aTop === c.bTop;
        const okEng = Math.abs(c.bL - j.bL) <= 1.01;
        if (!okSeam || !okEng) bad.push({ vp: `${vp.w}x${vp.h}`, pair: c.pair, cssGap: c.gap, jsGap: j.gap, bLcss: c.bL, bLjs: j.bL, top: [c.aTop, c.bTop] });
      }
      out.push(`${vp.w}x${vp.h}: ${res.css.length} passagens`);
    }
    console.log(JSON.stringify({ out, failed: bad.length, bad: bad.slice(0, 12) }, null, 1));
    return bad.length ? 1 : 0;
  },
  async tags(pg, { opt, list, vps, motions }) {
    const bad = []; let n = 0;
    for (const vp of [{ w: 1440, h: 900 }, { w: 375, h: 812 }, { w: 1024, h: 768 }]) for (const theme of ['light']) {
      await pg.scenario({ ...vp, theme, path: opt('path', '/pt/') });
      const geo = await pg.eval(`(()=>{const g=NP.geo();const t=[...document.querySelectorAll('main > .tile, .journey .tile')].map(t=>{const r=t.getBoundingClientRect();return {id:t.id,top:r.top+scrollY,bottom:r.bottom+scrollY,has:!!t.querySelector('.tag')}});return {g,t}})()`);
      for (let i = 0; i < geo.t.length; i++) {
        const t = geo.t[i]; if (!t.has) continue;
        await pg.scrollTo(await pg.eval(`NP.restY('${t.id}')`));
        const r = await pg.eval(`(()=>{const t=document.getElementById('${t.id}');const sc=t.querySelector(':scope > .scene').getBoundingClientRect();const card=t.querySelector('.card').getBoundingClientRect();const out=[];t.querySelectorAll('.tag').forEach(g=>{if(getComputedStyle(g).display==='none')return;const r=g.getBoundingClientRect();const inside=r.left>=sc.left-0.5&&r.right<=sc.right+0.5&&r.top>=sc.top-0.5&&r.bottom<=sc.bottom+0.5;const hitCard=innerWidth>820&&!(r.right<card.left||r.left>card.right||r.bottom<card.top||r.top>card.bottom);out.push({txt:g.textContent,inside,hitCard,op:getComputedStyle(g.parentElement).opacity})});return out})()`);
        for (const x of r) { n++; if (!x.inside || x.hitCard || +x.op < 0.95) bad.push({ vp: `${vp.w}x${vp.h}`, tile: t.id, ...x }); }
        if (i + 1 < geo.t.length) {
          await pg.scrollTo(t.bottom - geo.g.top0 - 0.5 * geo.g.A);
          const o = await pg.eval(`[...document.querySelectorAll('.tags')].filter(x=>getComputedStyle(x.parentElement).display!=='none').map(x=>+getComputedStyle(x).opacity).filter(v=>v>0.05).length`);
          if (o > 0) bad.push({ vp: `${vp.w}x${vp.h}`, pass: `${t.id}>next`, tagsVisible: o });
        }
      }
    }
    console.log(JSON.stringify({ tagsChecked: n, failed: bad.length, bad: bad.slice(0, 20) }, null, 1));
    return bad.length ? 1 : 0;
  },
  async mobile(pg, { opt }) {
    const bad = []; const path = opt('path', '/pt/'); const ids = String(opt('ids', 's2,s12')).split(',');
    for (const vp of [{ w: 375, h: 812 }, { w: 768, h: 1024 }]) {
      await pg.scenario({ ...vp, path });
      for (const id of ids) {
        for (const off of [0, 240]) {
          await pg.scrollTo((await pg.eval(`NP.restY('${id}')`)) + off);
          const r = await pg.eval(`(()=>{const t=document.getElementById('${id}');const sc=t.querySelector(':scope > .scene');sc.style.pointerEvents='auto';const r=sc.getBoundingClientRect();const e=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);const c=t.querySelector('.card');return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,vh:innerHeight,onFig:!!(e&&e.closest('figure.scene')===sc),internal:c.scrollHeight>c.clientHeight+1}})()`);
          if (!(r.left >= 0 && r.right <= vp.w + 1 && r.top >= 0 && r.bottom <= vp.h) || !r.onFig || r.internal) bad.push({ vp: `${vp.w}`, id, off, ...r });
        }
        // Feito alcançável: rolar até o fim do ladrilho
        const reach = await pg.eval(`(()=>{const t=document.getElementById('${id}');t.querySelector('.done').scrollIntoView({block:'center',behavior:'instant'});return new Promise(r=>requestAnimationFrame(()=>{const b=t.querySelector('.done').getBoundingClientRect();const e=document.elementFromPoint(b.left+b.width/2,b.top+b.height/2);r(!!(e&&e.closest('.done')))}))})()`);
        if (!reach) bad.push({ vp: `${vp.w}`, id, feito: 'inalcançável' });
      }
      // abertura: Começar inteiro sem rolar
      await pg.scrollTo(0);
      const go = await pg.eval(`(()=>{const b=document.getElementById('go').getBoundingClientRect();const d=document.querySelector('.dock').getBoundingClientRect();return {bottom:b.bottom,dockTop:d.top,top:b.top}})()`);
      if (vp.w === 375 && go.bottom > go.dockTop) bad.push({ abertura: go });
    }
    console.log(JSON.stringify({ failed: bad.length, bad }, null, 1)); return bad.length ? 1 : 0;
  },
  async contrast(pg, { opt }) {
    const bad = []; const rows = [];
    for (const vp of [{ w: 1440, h: 900 }, { w: 375, h: 812 }]) for (const theme of ['light', 'dark']) {
      await pg.scenario({ ...vp, theme, path: opt('path', '/pt/') });
      for (const id of ['s1', 's8', 's14', 'frio1']) {
        await pg.scrollTo(await pg.eval(`NP.restY('${id}')`));
        const r = await pg.eval(`(()=>{const C=${CONTRAST};const t=document.getElementById('${id}');const res=[];const add=(sel,min,root=t)=>root.querySelectorAll(sel).forEach(e=>{if(!e.offsetParent&&getComputedStyle(e).position!=='fixed')return;if(!e.textContent.trim())return;res.push({sel,txt:e.textContent.trim().slice(0,24),r:+C.ratio(e).toFixed(2),min})});
          add('.tag',7);add('.tag .v',7);add('.card p',4.5);add('.card li',4.5);add('.card h3',3);add('.eyebrow',4.5);add('.chip',4.5);add('.next',4.5);add('.tip',4.5);add('.done',4.5);add('.big',3);
          add('.pos',4.5,document);add('.pill',4.5,document);add('.dock .lbl',4.5,document);add('.rail .cnt',4.5,document);return res})()`);
        for (const x of r) { rows.push(x.r); if (x.r < x.min) bad.push({ vp: vp.w, theme, id, ...x }); }
      }
    }
    // barra sobre a cena (pior caso): amostra de pixels não disponível sem canvas; usa o fundo paper a 90 % sobre a cena ember escura
    console.log(JSON.stringify({ medidas: rows.length, min: Math.min(...rows), failed: bad.length, bad: bad.slice(0, 15) }, null, 1)); return bad.length ? 1 : 0;
  },
  async func(pg, { opt, sleep }) {
    const bad = []; const ok = (c, m, i) => { if (!c) bad.push({ m, i }); };
    for (const [path, exp] of [['/pt/', { pf: '400', bass: '18', n: '5', salt: '23', init: '94', per: '270', total: '1.348' }]]) {
      await pg.scenario({ w: 1440, h: 900, path, init: "try{localStorage.clear()}catch(e){}" });
      const v = await pg.eval(`(k=>{const g=x=>document.querySelector('#s1 [data-k="'+x+'"]')?.textContent;return {pf:g('pfFlour'),y:g('yeast'),bass:document.querySelector('#s4 [data-k="bassWater"]').textContent,salt:document.querySelector('#s2 [data-k="salt"]').textContent,init:document.querySelector('#s2 [data-k="initWater"]').textContent,per:document.querySelector('#s8 [data-k="per"]').textContent,total:document.querySelector('#s8 [data-k="total"]').textContent,n:document.querySelector('#s8 [data-k="n"]').textContent,tagpf:document.querySelector('#s1 .tag .v').textContent}})()`);
      ok(v.pf === exp.pf && v.y === '0,8' && v.bass === exp.bass && v.salt === exp.salt && v.init === exp.init && v.per === exp.per && v.total === exp.total && v.n === exp.n && v.tagpf === '400', '11: padrões', v);
      await pg.eval(`NP.set({mode:'pizza',pizzas:7})`);
      const f = await pg.eval(`({flour:document.querySelector('#mise [data-k="flour"]').textContent,n:document.querySelectorAll('[data-draw=balls] .ball').length,tag:document.querySelector('#s8 .tag .v').textContent,qty:document.getElementById('qty').value,bar:document.getElementById('barSum').textContent})`);
      ok(f.flour === '1.122' && f.n === 21 && f.tag === '7' && f.qty === '7', '11: 7 pizzas', f);
      await pg.eval(`NP.set({mode:'flour',flour:800})`);
      // ajustes
      const adj = await pg.eval(`['p-flour','p-pizzas','p-w','p-hyd','p-salt','p-oil','p-yeast','p-pf','p-fridge','p-top','p-bottom','p-sauce','p-cheese','p-bake','p-pfh','p-panh','p-outh','modeFlour','modePizza','resetParams','resetChecks','timeline','schedWarn','nextEv'].filter(i=>!document.getElementById(i))`);
      ok(adj.length === 0, '12: campos dos ajustes', adj);
      // feito + persistência
      await pg.eval(`(()=>{const i=document.querySelector('input[data-step=s2]');i.click()})()`);
      const ls = await pg.eval(`localStorage.getItem('napolitana-v1:done')`);
      ok(ls && JSON.parse(ls).s2 === true, '12: feito persiste', ls);
      // timer
      await pg.eval(`document.getElementById('tStart').click()`); await sleep(1300);
      let t = await pg.eval(`({clk:document.getElementById('clock').textContent,ring:document.querySelector('.ring-fill').getAttribute('stroke-dasharray'),btn:document.getElementById('tStart').textContent})`);
      ok(/^[12]( s|:)/.test(t.clk) && parseFloat(t.ring) > 0.9, '12: timer roda', t);
      await pg.eval(`document.getElementById('tStart').click()`); const a = await pg.eval(`document.getElementById('clock').textContent`); await sleep(600); const b = await pg.eval(`document.getElementById('clock').textContent`);
      ok(a === b, '12: timer pausa', [a, b]);
      await pg.eval(`document.getElementById('tReset').click()`);
      t = await pg.eval(`document.getElementById('clock').textContent`); ok(/^0( s|:00)/.test(t), '12: timer zera', t);
      // diagnóstico aplica
      await pg.eval(`document.querySelector('#chips .chip').click()`); await pg.eval(`document.getElementById('applyDiag').click()`);
      const tb = await pg.eval(`({b:document.querySelector('#s11 .tag .v').textContent,bot:document.querySelectorAll('#s11 .tag .v')[1].textContent})`);
      ok(tb.bot === '370', '12: diagnóstico altera inferior', tb);
      // retomar
      await pg.eval(`localStorage.setItem('napolitana-v1:last',JSON.stringify({id:'s8',t:1}))`);
      await pg.scenario({ w: 1440, h: 900, path });
      const rs = await pg.eval(`({hid:document.getElementById('resume').hidden,txt:document.getElementById('resume').textContent})`);
      ok(!rs.hid && /\b0?7\b/.test(rs.txt) , '12: retomar', rs);
      // troca de receita leva nº de pizzas
      await pg.eval(`NP.set({mode:'pizza',pizzas:6}); document.querySelector('a[data-recipe=new-york]').addEventListener('click',e=>e.preventDefault(),{once:true}); document.querySelector('a[data-recipe=new-york]').click()`);
      const ny = await pg.eval(`JSON.parse(localStorage.getItem('newyork-v1:p')||'{}')`);
      ok(ny.pizzas === 6 && ny.mode === 'pizza', '12: troca de receita', ny);
    }
    // 13: movimento reduzido
    await pg.scenario({ w: 1440, h: 900, reduced: true, path: '/pt/' });
    const rm = await pg.eval(`({fixed:[...document.querySelectorAll('.scene')].filter(s=>getComputedStyle(s).position==='fixed').length,anim:document.getAnimations().length,cls:document.documentElement.className})`);
    ok(rm.fixed === 0 && rm.anim === 0, '13: reduzido', rm);
    if (pg.logs.length) bad.push({ m: 'console', i: pg.logs });
    console.log(JSON.stringify({ failed: bad.length, bad }, null, 1)); return bad.length ? 1 : 0;
  },
  async kb(pg, { opt, sleep }) {
    const bad = [];
    for (const vp of [{ w: 1440, h: 900 }, { w: 375, h: 812 }]) {
      await pg.scenario({ ...vp, path: opt('path', '/pt/') });
      const seen = new Set(); let stuck = 0, last = '';
      for (let i = 0; i < 140; i++) {
        await pg.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
        await pg.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
        { let a = -1; for (let k = 0; k < 40; k++) { const y = await pg.eval('scrollY'); if (y === a) break; a = y; await sleep(60); } }
        const r = await pg.eval(`(()=>{const e=document.activeElement;if(!e||e===document.body)return {none:true};const b=e.getBoundingClientRect();const cs=getComputedStyle(e);const bar=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--bar'))||56;const x=b.left+b.width/2,y=b.top+Math.min(b.height/2,10);const top=document.elementFromPoint(x,y);const covered=!(top&&(e===top||e.contains(top)||top.contains(e)||top.closest('label')===e.closest('label')));return {id:(e.id||e.tagName+':'+(e.getAttribute('href')||e.textContent.trim().slice(0,12))),vis:b.width>0&&b.height>0,covered,ol:cs.outlineStyle!=='none'||cs.boxShadow!=='none',y:b.top,h:b.height}})()`);
        if (r.none) continue;
        if (r.id === last) { if (++stuck > 3) { bad.push({ vp: vp.w, trap: r.id }); break; } } else stuck = 0; last = r.id;
        seen.add(r.id);
        if (r.vis && r.covered && !/^dialog/.test(r.id)) bad.push({ vp: vp.w, covered: r.id, y: r.y });
      }
      console.log(vp.w, 'focados distintos:', seen.size);
    }
    console.log(JSON.stringify({ failed: bad.length, bad: bad.slice(0, 15) }, null, 1)); return bad.length ? 1 : 0;
  },
  async wheel(pg, { opt, sleep }) {
    await pg.scenario({ w: 1440, h: 900, path: '/pt/' });
    for (let i = 0; i < 10; i++) { await pg.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: 700, y: 400, deltaX: 0, deltaY: 100 }); await sleep(60); }
    await sleep(800); const y = await pg.eval('scrollY');
    console.log(JSON.stringify({ scrollY: y, expected: 1000 })); return Math.abs(y - 1000) <= 1 ? 0 : 1;
  },
  async perf(pg, { opt, sleep }) {
    const out = []; let bad = 0;
    for (const vp of [{ w: 375, h: 812 }, { w: 1440, h: 900 }]) {
      await pg.scenario({ ...vp, path: opt('path', '/pt/'), cpu: 4, net: { offline: false, latency: 150, downloadThroughput: 400 * 1024 / 8 * 8 / 8, uploadThroughput: 100 * 1024 / 8 },
        init: `window.__p={lcp:0,cls:0,lt:[]};new PerformanceObserver(l=>{for(const e of l.getEntries())__p.lcp=e.startTime}).observe({type:'largest-contentful-paint',buffered:true});new PerformanceObserver(l=>{for(const e of l.getEntries())if(!e.hadRecentInput)__p.cls+=e.value}).observe({type:'layout-shift',buffered:true});new PerformanceObserver(l=>{for(const e of l.getEntries())__p.lt.push(Math.round(e.duration))}).observe({type:'longtask',buffered:true});` });
      await sleep(800);
      const lcp = await pg.eval('__p.lcp'); __cls: {
        const total = await pg.eval('document.documentElement.scrollHeight'); const base = (await pg.eval('__p.lt.length'));
        for (let y = 0; y < total; y += vp.h * 0.5) { await pg.scrollTo(y); }
      }
      const p = await pg.eval('({lcp:Math.round(__p.lcp),cls:+__p.cls.toFixed(4),lt:__p.lt,live:document.querySelectorAll(".tile.live").length})');
      const maxLive = await pg.eval(`(()=>{let m=0;const t=[...document.querySelectorAll('.tile')];return t.filter(x=>getComputedStyle(x.querySelector(':scope > .scene')).display!=='none').length})()`);
      out.push({ vp: `${vp.w}x${vp.h}`, ...p, displayed: maxLive });
      if (p.lcp > 2500 || p.cls >= 0.1 || Math.max(0, ...p.lt) > 200 || maxLive > 3) bad++;
    }
    console.log(JSON.stringify({ out, failed: bad }, null, 1)); return bad ? 1 : 0;
  },
};
cmds.fix = async function (pg, { sleep }) {
  const r = {};
  // P1-5: celular deitado, âncora com cartão visível; grão fora
  for (const hash of ['s8', 's2', 's14']) {
    await pg.scenario({ w: 812, h: 375, path: '/pt/' + '#' + hash }); await sleep(900);
    r['land ' + hash] = await pg.eval(`(()=>{const t=document.getElementById('${hash}'),c=t.querySelector('.card').getBoundingClientRect();return {tile:Math.round(t.getBoundingClientRect().top),cardTop:Math.round(c.top),vh:innerHeight,pad:getComputedStyle(document.documentElement).scrollPaddingTop,grain:getComputedStyle(document.querySelector('.grain')).display}})()`);
  }
  await pg.scenario({ w: 812, h: 375, path: '/pt/' }); 
  await pg.eval(`document.querySelector('#s2 .next').click()`); await sleep(1200);
  r['land next'] = await pg.eval(`(()=>{const t=document.getElementById('s4'),c=t.querySelector('.card').getBoundingClientRect(),d=t.querySelector('.done').getBoundingClientRect();return {tile:Math.round(t.getBoundingClientRect().top),cardTop:Math.round(c.top),feitoBottom:Math.round(d.bottom),vh:innerHeight}})()`);
  // P2-4: âncora no mobile
  for (const hash of ['s8', 's12']) {
    await pg.scenario({ w: 375, h: 812, path: '/pt/' + '#' + hash }); await sleep(1200);
    r['anchor375 ' + hash] = await pg.eval(`(()=>{const t=document.getElementById('${hash}');return {tile:Math.round(t.getBoundingClientRect().top),expected:Math.round(NP.geo().top0)}})()`);
  }
  // P1-4 retomar primário
  await pg.scenario({ w: 1440, h: 900, path: '/pt/', init: "localStorage.setItem('napolitana-v1:last',JSON.stringify({id:'s8',t:1}))" });
  r.resume = await pg.eval(`(()=>{const a=document.getElementById('resume'),b=document.getElementById('go');const s=e=>getComputedStyle(e).backgroundColor;return {resumeBg:s(a),goBg:s(b),txt:a.textContent,hidden:a.hidden}})()`);
  // P2-3 sem JS
  await pg.scenario({ w: 375, h: 812, path: '/pt/', noJs: true });
  r.nojs = await pg.eval(`(()=>{const q=document.getElementById('qty');const vis=id=>{const e=document.getElementById(id);return e?getComputedStyle(e).display!=='none':false};return {qtyValue:q.getAttribute('value'),qLbl:document.getElementById('qLbl').textContent,sum:document.getElementById('sum').textContent,balls:document.querySelectorAll('[data-draw=balls] .ball').length,pots:document.querySelectorAll('[data-draw=pots] .ball').length,goVisible:vis('go'),openAdj:vis('openAdj'),dlbl:document.getElementById('dlbl').textContent,tStart:vis('tStart'),link:getComputedStyle(document.querySelector('.nojs-only')).display}})()`);
  await pg.scenario({ w: 375, h: 812, path: '/pt/new-york/', noJs: true });
  r.nojsNY = await pg.eval(`({pots:document.querySelectorAll('[data-draw=pots] .ball').length,balls:document.querySelectorAll('[data-draw=balls] .ball').length})`);
  // P2-8 unidade, P2-6 nomes, P2-7 rodapé/diálogo
  await pg.scenario({ w: 1440, h: 900, path: '/en/' });
  await pg.eval(`NP.set({mode:'pizza',pizzas:4})`);
  r.unit = await pg.eval(`document.getElementById('qUnit').textContent`);
  r.names = await pg.eval(`({adj:document.getElementById('openAdj').getAttribute('aria-label'),dl:document.getElementById('dlbl').getAttribute('aria-label'),adjTxt:document.getElementById('openAdj').textContent.trim()})`);
  r.footer = await pg.eval(`[...document.querySelectorAll('.site-foot a[data-recipe]')].length`);
  r.dialogRecipes = await pg.eval(`document.querySelectorAll('#adj .rec').length`);
  await pg.eval(`NP.set({mode:'pizza',pizzas:6}); const a=document.querySelector('.site-foot a[data-recipe=new-york]'); a.addEventListener('click',e=>e.preventDefault(),{once:true}); a.click()`);
  r.footerCarry = await pg.eval(`localStorage.getItem('newyork-v1:p')`);
  // P1-6 / P2-5 / P2-18 mobile
  await pg.scenario({ w: 375, h: 812, path: '/pt/' });
  r.clock = await pg.eval(`(()=>{const c=document.getElementById('clock').getBoundingClientRect();return {w:c.width,h:c.height}})()`);
  r.padBottom = await pg.eval(`getComputedStyle(document.documentElement).scrollPaddingBottom`);
  console.log(JSON.stringify(r, null, 1));
  return 0;
};
cmds.cls = async function (pg, { sleep, opt }) {
  await pg.scenario({ w: 1440, h: 900, path: opt('path', '/pt/'), cpu: 4, net: { offline: false, latency: 150, downloadThroughput: 190000, uploadThroughput: 90000 },
    init: `window.__s=[];new PerformanceObserver(l=>{for(const e of l.getEntries())if(!e.hadRecentInput)__s.push({v:+e.value.toFixed(4),t:Math.round(e.startTime),s:(e.sources||[]).map(s=>(s.node&&(s.node.id||s.node.className||s.node.nodeName))+' '+Math.round(s.previousRect.y)+'>'+Math.round(s.currentRect.y)+' h'+Math.round(s.previousRect.height)+'>'+Math.round(s.currentRect.height))})}).observe({type:'layout-shift',buffered:true})` });
  await sleep(2500);
  console.log(JSON.stringify(await pg.eval('__s'), null, 1)); return 0;
};
