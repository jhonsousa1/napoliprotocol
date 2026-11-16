import { join } from 'node:path';
const R = {};
export default async function ({ page, out, sleep }) {
  try { await body({ page, out, sleep }); } finally { console.log(JSON.stringify(R, null, 1)); }
}
async function body({ page, out, sleep }) {
  const P = page;
  const key = async (k, code, vk, mods = 0) => { await P.send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code, windowsVirtualKeyCode: vk, modifiers: mods }); await P.send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: vk, modifiers: mods }); await sleep(120); };
  const click = async (sel) => { const b = await P.eval(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});e.scrollIntoView({block:'center',behavior:'instant'});const r=e.getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2]})()`); await sleep(150);
    for (const type of ['mousePressed', 'mouseReleased']) await P.send('Input.dispatchMouseEvent', { type, x: b[0], y: b[1], button: 'left', clickCount: 1 }); await sleep(250); };
  // A. retomar: estilos
  await P.go({ w: 1440, h: 900, init: `localStorage.setItem('napolitana-v1:last',JSON.stringify({id:'s8',t:1}))` });
  R.resume = await P.eval(`(()=>{const a=document.getElementById('resume'),b=document.getElementById('go');const s=e=>{const c=getComputedStyle(e);return {txt:e.textContent,bg:c.backgroundColor,color:c.color,border:c.borderColor,cls:e.className,hidden:e.hidden}};return {resume:s(a),go:s(b)}})()`);
  await P.scrollTo(0); await P.shot(join(out, 'resume-1440.png'));
  await P.go({ w: 375, h: 812, init: `localStorage.setItem('napolitana-v1:last',JSON.stringify({id:'s8',t:1}))` });
  await P.shot(join(out, 'resume-375.png'));
  R.resume375 = await P.eval(`(()=>{const a=document.getElementById('resume').getBoundingClientRect(),b=document.getElementById('go').getBoundingClientRect(),d=document.querySelector('.dock').getBoundingClientRect();return {resumeBottom:a.bottom,goBottom:b.bottom,dockTop:d.top}})()`);
  await click('#resume'); await sleep(1500);
  R.resumeClick = await P.eval(`(()=>{const t=document.getElementById('s8').getBoundingClientRect();return {top:t.top,hash:location.hash,dlbl:document.getElementById('dlbl').textContent}})()`);
  await P.shot(join(out, 'resume-375-after.png'));
  // B. 812x375 âncoras
  await P.go({ w: 812, h: 375, path: '/pt/', hash: '#s8' }); await sleep(800);
  R.land812 = await P.eval(`(()=>{const t=document.getElementById('s8'),c=t.querySelector('.card').getBoundingClientRect(),s=t.querySelector('.scene').getBoundingClientRect();return {tileTop:t.getBoundingClientRect().top,cardTop:c.top,sceneTop:s.top,sceneH:s.height,sp:getComputedStyle(document.documentElement).scrollPaddingTop,bar:getComputedStyle(document.querySelector('.bar')).position}})()`);
  await P.shot(join(out, 'land-812x375-s8.png'));
  await click('#s2 .foot .next'); await sleep(1500);
  R.next812 = await P.eval(`(()=>{const t=document.getElementById('s4');return {hash:location.hash,tileTop:t.getBoundingClientRect().top,feito:(()=>{const b=t.querySelector('.done').getBoundingClientRect();return b.top})()}})()`);
  await P.shot(join(out, 'next-812x375-s4.png'));
  // hash landing desktop and mobile
  for (const [w, h] of [[1440, 900], [375, 812]]) for (const id of ['s8', 'frio1']) {
    await P.go({ w, h, hash: '#' + id }); await sleep(900);
    R['land' + w + id] = await P.eval(`(()=>{const t=document.getElementById('${id}'),c=t.querySelector('.card').getBoundingClientRect(),s=t.querySelector(':scope>.scene');const st=getComputedStyle(s);return {cardTop:Math.round(c.top),tf:st.transform,disp:st.display,tags:t.querySelector('.tags')?getComputedStyle(t.querySelector('.tags')).opacity:null,pos:document.getElementById('pos').textContent,dl:document.getElementById('dlbl').textContent}})()`);
    await P.shot(join(out, `land-${w}-${id}.png`));
  }
  // F. en: modo pizza unidade
  await P.go({ w: 1440, h: 900, path: '/en/' });
  await click('#ask .seg button[data-mode=pizza]');
  R.enUnit = await P.eval(`({u:document.getElementById('qUnit').textContent,lbl:document.getElementById('qLbl').textContent,sum:document.getElementById('sum').textContent})`);
  // D. diálogo
  await P.go({ w: 1440, h: 900 });
  await click('#openAdj');
  R.dlgOpen = await P.eval(`({open:document.getElementById('adj').open,active:document.activeElement.outerHTML.slice(0,80),opened:[...document.querySelectorAll('#adj details')].filter(d=>d.open).map(d=>d.id)})`);
  await P.shot(join(out, 'dlg-1440.png'));
  const seenD = [];
  for (let i = 0; i < 30; i++) { await key('Tab', 'Tab', 9); seenD.push(await P.eval(`(()=>{const e=document.activeElement;return (e.closest('dialog')?'D:':'OUT:')+(e.id||e.tagName)})()`)); }
  R.dlgTab = seenD.join(' ');
  // Enter em campo numérico
  await P.eval(`document.getElementById('p-flour').focus()`); await key('Enter', 'Enter', 13);
  R.dlgEnter = await P.eval(`({open:document.getElementById('adj').open})`);
  if (!R.dlgEnter.open) await click('#openAdj');
  await key('Escape', 'Escape', 27);
  R.dlgEsc = await P.eval(`({open:document.getElementById('adj').open,active:document.activeElement.id})`);
  await click('#openAdj');
  await P.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: 100, y: 400, button: 'left', clickCount: 1 }); await P.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 100, y: 400, button: 'left', clickCount: 1 }); await sleep(300);
  R.dlgBackdrop = await P.eval(`({open:document.getElementById('adj').open,active:document.activeElement.id})`);
  // edição de hidratação ao vivo
  await click('#openAdj'); await P.eval(`(()=>{const d=document.getElementById('adj-formula');d.open=true})()`);
  await P.eval(`(()=>{const i=document.getElementById('p-hyd');i.value='70';i.dispatchEvent(new Event('input',{bubbles:true}))})()`);
  R.hyd70 = await P.eval(`({water:document.querySelector('#mise [data-k=water]').textContent,warn:document.getElementById('warnBox').hidden,bar:document.getElementById('barSum').textContent})`);
  await P.eval(`document.getElementById('resetParams').click()`);
  R.reset = await P.eval(`({water:document.querySelector('#mise [data-k=water]').textContent})`);
  // Agenda: data no passado e > 36h
  await P.eval(`(()=>{const d=document.getElementById('adj-agenda');d.open=true;const i=document.getElementById('p-bake');i.value='2026-11-16T20:00';i.dispatchEvent(new Event('input',{bubbles:true}))})()`);
  R.agenda = await P.eval(`({warn:document.getElementById('schedWarn').textContent,hidden:document.getElementById('schedWarn').hidden,tl:document.querySelectorAll('#timeline li').length,when:[...document.querySelectorAll('[data-when]')].slice(0,4).map(e=>e.textContent),now:[...document.querySelectorAll('span.now')].filter(e=>!e.hidden).map(e=>e.closest('.tile')?.id),railNow:[...document.querySelectorAll('.rail a.now')].map(a=>a.dataset.for)})`);
  await P.shot(join(out, 'dlg-agenda-1440.png'));
  await key('Escape', 'Escape', 27);
  // H. interruptor de movimento
  await click('#openAdj'); await P.eval(`document.getElementById('adj-prefs').open=true`);
  R.motionToggle = await P.eval(`({checked:document.getElementById('aMo').checked,disabled:document.getElementById('aMo').disabled})`);
  const nav = P.waitEvent('Page.loadEventFired', 20000);
  await P.eval(`document.getElementById('aMo').click()`); await nav; await sleep(800);
  R.afterToggle = await P.eval(`({cls:document.documentElement.className,ui:localStorage.getItem('np-ui'),fixed:[...document.querySelectorAll('.scene')].filter(s=>getComputedStyle(s).position==='fixed').length,anims:document.getAnimations().length})`);
  await P.scrollTo(await P.eval(`document.getElementById('s8').getBoundingClientRect().top+scrollY-60`)); await P.shot(join(out, 'static-toggle-s8-1440.png'));
  // reduced 375
  await P.go({ w: 375, h: 812, reduced: true });
  R.reduced375 = await P.eval(`({cls:document.documentElement.className,anims:document.getAnimations().length,fixed:[...document.querySelectorAll('.scene')].filter(s=>getComputedStyle(s).position==='fixed').length,mot:(()=>{document.getElementById('openAdj').click();const m=document.getElementById('aMo');return {c:m.checked,d:m.disabled,note:!document.getElementById('aMoNote').hidden}})()})`);
  await key('Escape', 'Escape', 27);
  await P.scrollTo(await P.eval(`document.getElementById('s8').getBoundingClientRect().top+scrollY-60`)); await P.shot(join(out, 'reduced-375-s8.png'));
  // G. sem JS
  for (const [w, h] of [[1440, 900], [375, 812]]) {
    await P.go({ w, h, noJs: true }); await sleep(500);
    await P.shot(join(out, `nojs-${w}-top.png`));
    for (const id of ['s8', 's14']) { await P.scrollTo(await P.eval(`document.getElementById('${id}').getBoundingClientRect().top+scrollY-60`)); await sleep(200); await P.shot(join(out, `nojs-${w}-${id}.png`)); }
    R['nojs' + w] = await P.eval(`({cls:document.documentElement.className,dlbl:document.getElementById('dlbl').textContent,bar:document.getElementById('barSum').textContent,qLbl:document.getElementById('qLbl').textContent,qty:document.getElementById('qty').value,sum:document.getElementById('sum').textContent,dock:getComputedStyle(document.querySelector('.dock')).display,rail:getComputedStyle(document.querySelector('.rail')).display,tStart:document.getElementById('tStart').textContent,chips:document.getElementById('chips').children.length})`);
  }
  // J. NY funcional
  await P.go({ w: 1440, h: 900, path: '/pt/new-york/' });
  R.ny = await P.eval(`({sugar:!!document.getElementById('p-sugar'),pf:!!document.getElementById('p-pf'),pfh:!!document.getElementById('p-pfh'),pots:document.querySelectorAll('[data-draw=pots] .ball').length,timerZones:[...document.querySelectorAll('#s11 .track .z')].map(z=>z.className+':'+z.style.left+'/'+z.style.width),scale:document.querySelector('#s11 .scale').textContent,clock:document.getElementById('clock').textContent,tags:[...document.querySelectorAll('#s1 .tag')].map(t=>t.textContent),bar:document.getElementById('barSum').textContent})`);
  await P.eval(`document.getElementById('tStart').click()`); await sleep(1500); await P.eval(`document.getElementById('tStart').click()`);
  R.nyTimer = await P.eval(`({clock:document.getElementById('clock').textContent,st:document.getElementById('tStatus').textContent,ring:document.querySelector('.ring-fill').getAttribute('stroke-dasharray')})`);
  // mini-timer: rodar e rolar para longe
  await P.eval(`document.getElementById('tStart').click()`); await P.scrollTo(0); await sleep(1200);
  R.mini = await P.eval(`({hidden:document.getElementById('mini').hidden,txt:document.getElementById('mini').textContent})`);
  await P.shot(join(out, 'mini-timer-1440.png'), { x: 0, y: 0, width: 1440, height: 60 });
  // background: aba oculta (simulado com espera) — relógio baseado em performance.now
  await P.go({ w: 1440, h: 900, path: '/pt/', query: '?np-t=85' });
  await P.scrollTo(await P.eval(`NP.restY('s14')`)); await sleep(300); await P.shot(join(out, 's14-t85-1440.png'));
  await P.go({ w: 375, h: 812, path: '/pt/', query: '?np-t=85', theme: 'dark' });
  await P.scrollTo(await P.eval(`NP.restY('s14')`)); await sleep(300); await P.shot(join(out, 's14-t85-375-dark.png'));
  console.log(JSON.stringify(R, null, 1));
  if (P.logs.length) console.log('console', P.logs);
}
