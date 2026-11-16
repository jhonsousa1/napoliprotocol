const LIB = `window.__C=(()=>{const lum=c=>{const [r,g,b]=c.slice(0,3).map(v=>{v/=255;return v<=.03928?v/12.92:((v+.055)/1.055)**2.4});return .2126*r+.7152*g+.0722*b};
const parse=s=>{if(!s||s==='transparent')return [0,0,0,0];const m=s.match(/[\\d.]+/g).map(Number);if(/^color\\(/.test(s)){const a=s.split('/')[1];return [m[0]*255,m[1]*255,m[2]*255,a?parseFloat(a):1]}if(/^oklab|^oklch|^lab/.test(s))return null;return m.length>3?m:[...m,1]};
const over=(t,b)=>{const a=t[3]??1;return [0,1,2].map(i=>t[i]*a+b[i]*(1-a)).concat(1)};
const bgOf=el=>{const L=[];for(let e=el;e;e=e.parentElement){const c=parse(getComputedStyle(e).backgroundColor);if(!c)return {unk:true};if(c[3]>0){L.push(c);if(c[3]>=1)return {c:L.reverse().reduce((b,t)=>over(t,b),[255,255,255,1]),opaque:true}}}return {c:L.reverse().reduce((b,t)=>over(t,b),parse(getComputedStyle(document.body).backgroundColor)),opaque:false}};
const ratio=(f,b)=>{const l1=lum(f),l2=lum(b);return (Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05)};
const big=el=>{const cs=getComputedStyle(el),s=parseFloat(cs.fontSize),w=+cs.fontWeight;return s>=24||(s>=18.66&&w>=700)};
const path=el=>{const p=[];for(let e=el;e&&p.length<3;e=e.parentElement)p.unshift(e.tagName.toLowerCase()+(e.id?'#'+e.id:'')+(e.classList.length?'.'+[...e.classList].slice(0,2).join('.'):''));return p.join('>')};
function scan(roots){const out=[];const seen=new Set();roots.forEach(R=>{if(!R)return;const w=document.createTreeWalker(R,NodeFilter.SHOW_TEXT);let n;while(n=w.nextNode()){if(!n.textContent.trim())continue;const el=n.parentElement;if(seen.has(el))continue;seen.add(el);const cs=getComputedStyle(el);if(cs.visibility==='hidden'||cs.display==='none'||+cs.opacity===0)continue;const r=el.getBoundingClientRect();if(r.width<1||r.bottom<0||r.top>innerHeight||el.closest('[aria-hidden=true]:not(.tags)')||el.closest('.sr'))continue;
 let o=1;for(let e=el;e;e=e.parentElement)o*=+getComputedStyle(e).opacity;if(o<.5)continue;
 const f=parse(cs.color);const b=bgOf(el);if(!f||b.unk)continue;const F=over(f,b.c);out.push({p:path(el),t:n.textContent.trim().slice(0,22),r:+ratio(F,b.c).toFixed(2),min:big(el)?3:4.5,opaque:b.opaque})}});return out}
return {scan,ratio,parse,lum}})();1`;
export default async function ({ page, sleep, out }) {
  const P = page; const fails = []; let n = 0; const minBy = {};
  const rec = (ctx, rows) => rows.forEach(x => { n++; const k = x.p.split('>').pop() + (x.opaque ? '' : '(semiop)'); if (!minBy[k] || x.r < minBy[k].r) minBy[k] = { r: x.r, t: x.t, ctx }; if (x.r < x.min && x.opaque) fails.push({ ctx, ...x }); });
  for (const path of ['/pt/', '/en/', '/pt/new-york/', '/en/new-york/']) for (const theme of ['light', 'dark']) for (const [w, h] of [[1440, 900], [375, 812]]) {
    await P.go({ w, h, theme, path });
    await P.eval(LIB);
    await P.eval(`(()=>{const s=document.querySelector('#s2 input[data-step]')||document.querySelector('input[data-step]');s.click()})()`); // um "feito" para medir estado marcado
    const ids = await P.eval(`[...document.querySelectorAll('main > .tile, .journey .tile')].map(t=>t.id)`);
    for (const id of ids) {
      await P.scrollTo(await P.eval(`NP.restY('${id}')`));
      rec(`${path} ${theme} ${w} ${id}`, await P.eval(`__C.scan([document.getElementById('${id}').querySelector('.card'),document.getElementById('${id}').querySelector('.tags'),document.querySelector('.bar'),document.querySelector('.dock'),document.querySelector('.rail')])`));
    }
    await P.scrollTo(await P.eval(`document.getElementById('epilogo').getBoundingClientRect().top+scrollY`));
    for (let k = 0; k < 6; k++) { rec(`${path} ${theme} ${w} epi${k}`, await P.eval(`__C.scan([document.getElementById('epilogo'),document.querySelector('.site-foot')])`)); await P.scrollTo(await P.eval(`scrollY+${h}`)); }
    await P.eval(`document.getElementById('openAdj').click();document.querySelectorAll('#adj details').forEach(d=>d.open=true)`);
    for (let k = 0; k < 4; k++) { rec(`${path} ${theme} ${w} adj${k}`, await P.eval(`__C.scan([document.getElementById('adj')])`)); await P.eval(`document.querySelector('#adj').scrollBy(0,${h - 100});document.querySelector('#adj form').parentElement.scrollTop+=${h - 100}`); }
  }
  // amostragem de pixels: texto da barra e do trilho sobre a cena (desktop)
  const px = [];
  for (const path of ['/pt/', '/pt/new-york/']) for (const theme of ['light', 'dark']) {
    await P.go({ w: 1440, h: 900, theme, path }); await P.eval(LIB);
    const ids = await P.eval(`[...document.querySelectorAll('main > .tile, .journey .tile')].map(t=>t.id)`);
    for (const id of ids) {
      await P.scrollTo(await P.eval(`NP.restY('${id}')`)); await sleep(80);
      for (const sel of ['#pos', '.rail .cnt']) {
        const info = await P.eval(`(()=>{const e=document.querySelector('${sel}');if(!e||!e.textContent.trim()||getComputedStyle(e).display==='none'||getComputedStyle(e.parentElement).display==='none')return null;const r=e.getBoundingClientRect();const col=getComputedStyle(e).color;e.style.color='transparent';return {x:r.left,y:r.top,w:r.width,h:r.height,col}})()`);
        if (!info || info.w < 1) continue;
        const r = await P.send('Page.captureScreenshot', { format: 'png', clip: { x: info.x, y: info.y, width: info.w, height: info.h, scale: 1 } });
        await P.eval(`document.querySelector('${sel}').style.color=''`);
        const worst = await P.eval(`new Promise(res=>{const i=new Image();i.onload=()=>{const c=document.createElement('canvas');c.width=i.width;c.height=i.height;const x=c.getContext('2d');x.drawImage(i,0,0);const d=x.getImageData(0,0,c.width,c.height).data;const f=__C.parse('${info.col}');let m=99;for(let k=0;k<d.length;k+=4){const v=__C.ratio(f,[d[k],d[k+1],d[k+2]]);if(v<m)m=v}res(+m.toFixed(2))};i.src='data:image/png;base64,${r.data}'})`.replace('__C.parse', '__C.parse')).catch(e => 'err ' + e.message);
        px.push({ path, theme, id, sel, worst });
      }
    }
  }
  console.log(JSON.stringify({ n, fails: fails.slice(0, 60), nfail: fails.length, minBy, px: px.filter(x => typeof x.worst !== 'number' || x.worst < 4.5), pxMin: Math.min(...px.map(x => x.worst).filter(x => typeof x === 'number')) }, null, 1));
}
