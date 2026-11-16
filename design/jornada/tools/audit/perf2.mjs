const NET = { offline: false, latency: 150, downloadThroughput: 1.6 * 1024 * 1024 / 8 * 0.9, uploadThroughput: 750 * 1024 / 8 * 0.9 };
const INIT = `window.__p={lcp:0,lcpEl:'',cls:0,shifts:[],lt:[],loaf:[],ev:[]};
new PerformanceObserver(l=>{for(const e of l.getEntries()){__p.lcp=e.startTime;__p.lcpEl=(e.element&&(e.element.id||e.element.tagName+'.'+e.element.className))||e.url}}).observe({type:'largest-contentful-paint',buffered:true});
new PerformanceObserver(l=>{for(const e of l.getEntries())if(!e.hadRecentInput){__p.cls+=e.value;__p.shifts.push({v:+e.value.toFixed(4),t:Math.round(e.startTime),src:(e.sources||[]).map(s=>{const n=s.node;return (n?(n.nodeType===1?(n.tagName+'#'+n.id+'.'+String(n.className).slice(0,30)):'#text:'+String(n.textContent).slice(0,20)+' in '+(n.parentElement&&(n.parentElement.id||n.parentElement.className))):'?')+' '+Math.round(s.previousRect.y)+'→'+Math.round(s.currentRect.y)+' h'+Math.round(s.previousRect.height)+'→'+Math.round(s.currentRect.height)})})}}).observe({type:'layout-shift',buffered:true});
new PerformanceObserver(l=>{for(const e of l.getEntries())__p.lt.push(Math.round(e.duration))}).observe({type:'longtask',buffered:true});
try{new PerformanceObserver(l=>{for(const e of l.getEntries())__p.loaf.push({d:Math.round(e.duration),y:Math.round(scrollY),r:Math.round(e.renderStart?e.startTime+e.duration-e.renderStart:0),s:(e.scripts||[]).map(x=>x.invoker+':'+Math.round(x.duration)).join(',')})}).observe({type:'long-animation-frame',buffered:true})}catch(e){}
new PerformanceObserver(l=>{for(const e of l.getEntries())if(e.interactionId)__p.ev.push({n:e.name,d:e.duration,t:(e.target&&(e.target.id||e.target.tagName))})}).observe({type:'event',durationThreshold:16,buffered:true});`;
export default async function ({ page, sleep, served }) {
  const P = page; const res = [];
  let bytes = 0; P.ev.push(d => { if (d.method === 'Network.loadingFinished') bytes += d.params.encodedDataLength; });
  for (const rep of [1,2,3]) for (const path of ['/pt/', '/en/new-york/']) for (const [w, h] of [[375, 812], [1440, 900]]) {
    bytes = 0;
    await P.go({ w, h, path, cpu: 4, net: NET, init: INIT });
    await sleep(2500);
    const load = await P.eval(`({lcp:Math.round(__p.lcp),el:__p.lcpEl,cls:+__p.cls.toFixed(4),shifts:__p.shifts.slice(0,8),lt:__p.lt.slice()})`);
    const bytesLoad = bytes;
    // rolagem real com roda até o fim do s4
    const target = await P.eval(`document.getElementById('s5').getBoundingClientRect().top+scrollY`);
    await P.eval(`window.__f=[];window.__run=true;(function f(t){if(!__run)return;__f.push(t);requestAnimationFrame(f)})(performance.now())`);
    await P.eval(`__p.lt.length=0;__p.loaf.length=0`);
    let y = 0, i = 0;
    while (y < target && i < 400) { await P.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: w / 2, y: h / 2, deltaX: 0, deltaY: 120 }); await sleep(30); i++; if (i % 10 === 0) y = await P.eval('scrollY'); }
    await sleep(600);
    const sc = await P.eval(`(()=>{__run=false;const d=[];for(let i=1;i<__f.length;i++)d.push(__f[i]-__f[i-1]);d.sort((a,b)=>a-b);const q=p=>Math.round(d[Math.floor(p*(d.length-1))]);return {frames:d.length,p50:q(.5),p95:q(.95),max:Math.round(d[d.length-1]),over50:d.filter(x=>x>50).length,lt:__p.lt.slice(),loaf:__p.loaf.filter(x=>x.d>100),ids:[...document.querySelectorAll('main>.tile,.journey .tile')].map(t=>t.id+':'+Math.round(t.getBoundingClientRect().top+scrollY)).slice(0,8).join(' '),cls:+__p.cls.toFixed(4),live:document.querySelectorAll('.tile.live').length,displayed:[...document.querySelectorAll('.tile>.scene')].filter(s=>getComputedStyle(s).display!=='none').length}})()`);
    // INP: interações reais
    const clickAt = async (sel) => { const b = await P.eval(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});e.scrollIntoView({block:'center',behavior:'instant'});const r=e.getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2]})()`); await sleep(400); for (const type of ['mousePressed', 'mouseReleased']) await P.send('Input.dispatchMouseEvent', { type, x: b[0], y: b[1], button: 'left', clickCount: 1 }); await sleep(500); };
    await clickAt('#s2 .done'); await clickAt('#more'); await clickAt('#ask .seg button[data-mode=pizza]'); await clickAt('#more'); await clickAt('#openAdj');
    await P.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }); await P.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }); await sleep(400);
    const inp = await P.eval(`(()=>{const m={};__p.ev.forEach(e=>{const k=e.t+':'+e.n;m[k]=Math.max(m[k]||0,e.d)});return m})()`);
    res.push({ rep, path, vp: `${w}x${h}`, ...load, shifts: undefined, nshift: load.shifts.length, transferKB: Math.round(bytesLoad / 1024), scroll: sc, inp });
    if (P.logs.length) res.push({ console: P.logs });
  }
  console.log(JSON.stringify({ net: NET, cpu: 4, res }, null, 1));
}
