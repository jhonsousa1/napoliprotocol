const R = {};
export default async function (ctx) { try { await body(ctx); } finally { console.log(JSON.stringify(R, null, 1)); } }
async function body({ page, sleep, HTTP }) {
  const P = page;
  const click = async (sel) => { const b = await P.eval(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});e.scrollIntoView({block:'center',behavior:'instant'});const r=e.getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2]})()`); await sleep(200); for (const type of ['mousePressed', 'mouseReleased']) await P.send('Input.dispatchMouseEvent', { type, x: b[0], y: b[1], button: 'left', clickCount: 1 }); await sleep(400); };
  await P.go({ w: 1440, h: 900 });
  await click('#ask .seg button[data-mode=pizza]');
  for (let i = 0; i < 2; i++) await click('#more');
  R.p7 = await P.eval(`({qty:document.getElementById('qty').value,flour:document.querySelector('#mise [data-k=flour]').textContent,balls:[...document.querySelectorAll('[data-draw=balls]')].map(b=>b.querySelectorAll('.ball').length),s8tag:document.querySelector('#s8 .tag .v').textContent,bar:document.getElementById('barSum').textContent})`);
  // diagnóstico
  await click('#chips .chip'); await click('#applyDiag');
  R.diag = await P.eval(`({chip:document.querySelector('#chips .chip').textContent,tags:[...document.querySelectorAll('#s11 .tag .v')].map(v=>v.textContent),pb:document.getElementById('p-bottom').value,pt:document.getElementById('p-top').value,btn:document.getElementById('applyDiag').textContent})`);
  // feito persiste após recarregar
  await click('#s2 .done');
  const nav = P.waitEvent('Page.loadEventFired'); await P.send('Page.reload'); await nav; await sleep(500);
  R.feito = await P.eval(`({checked:document.querySelector('input[data-step=s2]').checked,rail:document.querySelector('.rail a[data-for=s2]').classList.contains('done'),cnt:document.getElementById('cnt').textContent,tile:document.getElementById('s2').classList.contains('is-done')})`);
  // Começar
  await P.scrollTo(0); await click('#go'); await sleep(1500);
  R.comecar = await P.eval(`({top:Math.round(document.getElementById('s1').getBoundingClientRect().top),rest:Math.round(NP.restY('s1')),y:Math.round(scrollY)})`);
  // tema e idioma
  await click('#themeBtn');
  R.theme = await P.eval(`(()=>{const o=JSON.parse(localStorage.getItem('np-theme'));return {theme:o.theme,attr:document.documentElement.dataset.theme,untilH:Math.round((o.until-Date.now())/36e5*10)/10}})()`);
  await P.eval(`document.querySelector('.lang').open=true`);
  await P.eval(`document.querySelector('.lang a[data-setlang=en]').addEventListener('click',e=>e.preventDefault(),{once:true})`); await click('.lang a[data-setlang=en]');
  R.lang = await P.eval(`localStorage.getItem('np-lang')`);
  // troca de receita: cartão da abertura (navegação real)
  await P.scrollTo(0);
  await P.eval(`NP.set({mode:'pizza',pizzas:6})`);
  let nav2 = P.waitEvent('Page.loadEventFired'); await click('a.rec[data-recipe=new-york]'); await nav2; await sleep(500);
  R.switchCard = await P.eval(`({path:location.pathname,p:JSON.parse(localStorage.getItem('newyork-v1:p')||'{}'),qty:document.getElementById('qty').value,bar:document.getElementById('barSum').textContent})`);
  // rodapé: NY -> napolitana
  await P.eval(`NP.set({mode:'pizza',pizzas:4})`);
  await P.eval(`localStorage.removeItem('napolitana-v1:p')`);
  nav2 = P.waitEvent('Page.loadEventFired'); await click('.site-foot nav a[href="/pt/"]:not([data-setlang])'); await nav2; await sleep(500);
  R.switchFoot = await P.eval(`({path:location.pathname,p:localStorage.getItem('napolitana-v1:p'),bar:document.getElementById('barSum').textContent})`);
  // 404 e redirecionamentos
  R.http = {};
  for (const u of ['/nao-existe/', '/es/', '/es/new-york/', '/it/new-york/', '/zh/new-york/', '/pt', '/sitemap.xml']) { const r = await fetch(`http://127.0.0.1:${HTTP}${u}`, { redirect: 'manual' }); R.http[u] = r.status + ' ' + (r.headers.get('location') || ''); }
  for (const u of ['/es/new-york/', '/it/', '/zh/new-york/']) { await P.go({ w: 800, h: 600, path: u, hash: '#s5' }); await sleep(800); R.http['nav ' + u] = await P.eval('location.pathname+location.hash'); }
  // critério 9 medido
  R.c9 = [];
  for (const [w, h] of [[375, 812], [768, 1024]]) for (const [path, ids] of [['/pt/', ['s2', 's12']], ['/pt/new-york/', ['s1', 's9']]]) {
    await P.go({ w, h, path });
    for (const id of ids) for (const off of [0, 200, 400]) {
      await P.scrollTo((await P.eval(`NP.restY('${id}')`)) + off);
      const r = await P.eval(`(()=>{const t=document.getElementById('${id}');const sc=t.querySelector(':scope > .scene');sc.style.pointerEvents='auto';const r=sc.getBoundingClientRect();const e=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);sc.style.pointerEvents='';const c=t.querySelector('.card');return {full:r.top>=0&&r.bottom<=innerHeight&&r.left>=-1&&r.right<=innerWidth+1,onFig:!!(e&&e.closest('figure.scene')===sc),internal:c.scrollHeight>c.clientHeight+1}})()`);
      if (!r.full || !r.onFig || r.internal) R.c9.push({ w, path, id, off, ...r });
    }
    for (const id of ids) {
      const ok = await P.eval(`(()=>{const t=document.getElementById('${id}');const d=t.querySelector('.done');d.scrollIntoView({block:'center',behavior:'instant'});return new Promise(res=>requestAnimationFrame(()=>{const b=d.getBoundingClientRect();const e=document.elementFromPoint(b.left+b.width/2,b.top+b.height/2);res(!!(e&&e.closest('.done')))}))})()`);
      if (!ok) R.c9.push({ w, path, id, feito: 'inalcançável' });
    }
  }
  R.c9n = 'casos com problema: ' + R.c9.length;
  if (P.logs.length) R.console = P.logs;
}
