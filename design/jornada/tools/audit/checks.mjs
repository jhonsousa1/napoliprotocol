// Console + hscroll + vãos em 4 páginas × modos × vps × temas; + sobreposição de etiquetas (entre si, rail, bar, card) e caixa segura x card
const PAGES = ['/pt/', '/en/', '/pt/new-york/', '/en/new-york/'];
const VPS = [[360,640],[375,812],[812,375],[768,1024],[1024,768],[1280,720],[1440,900],[1920,1080]];
export default async function ({ page, args }) {
  const bad = []; let n = 0;
  const only = args[0];
  if (!only || only === 'base') for (const path of PAGES) for (const [w, h] of VPS) for (const theme of ['light', 'dark']) for (const mode of ['sda', 'jsd', 'static']) {
    if (theme === 'dark' && mode === 'jsd') continue;
    await page.go({ w, h, theme, path, reduced: mode === 'static', query: mode === 'jsd' ? '?np-driver=js' : '' });
    // percorre a página para disparar código de rolagem
    const H = await page.eval('document.documentElement.scrollHeight');
    for (let y = 0; y < H; y += h * 1.2) await page.scrollTo(y);
    const r = await page.eval(`({sw:document.documentElement.scrollWidth,iw:innerWidth,cls:document.documentElement.className,gaps:(()=>{const t=[...document.querySelectorAll('main > .tile, .journey .tile')];const r=[];for(let i=1;i<t.length;i++){const d=t[i].getBoundingClientRect().top-t[i-1].getBoundingClientRect().bottom;if(Math.abs(d)>0.5)r.push([t[i].id,+d.toFixed(1)])}return r})()})`);
    n++;
    const tag = `${path} ${w}x${h} ${theme} ${mode}`;
    if (r.sw > r.iw) bad.push({ tag, hscroll: r });
    if (r.gaps.length) bad.push({ tag, gaps: r.gaps.slice(0, 4) });
    if (page.logs.length) bad.push({ tag, console: page.logs.slice(0, 4) }); console.error(tag, r.sw, r.iw, r.gaps.length, page.logs.length);
  }
  console.log(JSON.stringify({ base: n, bad }, null, 1));
  // etiquetas
  const tb = [];
  if (!only || only === 'tags') for (const path of PAGES) for (const [w, h] of [[1440,900],[1280,720],[1024,768],[1920,1080],[375,812],[768,1024]]) {
    await page.go({ w, h, path });
    const ids = await page.eval(`[...document.querySelectorAll('main > .tile, .journey .tile')].map(t=>t.id)`);
    for (const id of ids) {
      await page.scrollTo(await page.eval(`NP.restY('${id}')`));
      await page.sleep?.(0);
      const r = await page.eval(`(()=>{const t=document.getElementById('${id}');const sc=t.querySelector(':scope > .scene');const S=sc.getBoundingClientRect();const card=t.querySelector('.card').getBoundingClientRect();
        const R=(e)=>e.getBoundingClientRect();const vis=e=>{const c=getComputedStyle(e);return c.display!=='none'&&c.visibility!=='hidden'};
        const rail=document.querySelector('.rail');const RR=vis(rail)?R(rail):null;const bar=R(document.querySelector('.bar'));
        const ov=(a,b)=>a&&b&&!(a.right<=b.left||a.left>=b.right||a.bottom<=b.top||a.top>=b.bottom);
        const tags=[...t.querySelectorAll('.tag')].filter(vis).map(g=>({txt:g.textContent.trim(),r:R(g)}));
        const out=[];
        tags.forEach((a,i)=>{tags.slice(i+1).forEach(b=>{if(ov(a.r,b.r)){const ix=Math.min(a.r.right,b.r.right)-Math.max(a.r.left,b.r.left),iy=Math.min(a.r.bottom,b.r.bottom)-Math.max(a.r.top,b.r.top);out.push({k:'tag×tag',a:a.txt,b:b.txt,ix:Math.round(ix),iy:Math.round(iy)})}});
          if(innerWidth>820&&ov(a.r,card))out.push({k:'tag×card',a:a.txt});
          if(ov(a.r,RR))out.push({k:'tag×rail',a:a.txt});
          if(a.r.top<bar.bottom)out.push({k:'tag×bar',a:a.txt,top:Math.round(a.r.top)});
          if(a.r.left<S.left-.5||a.r.right>S.right+.5||a.r.top<S.top-.5||a.r.bottom>S.bottom+.5)out.push({k:'tag fora do palco',a:a.txt,r:[a.r.left,a.r.top,a.r.right,a.r.bottom].map(Math.round)})});
        // caixa segura 650-1210 x 190-630 em px
        const cs=getComputedStyle(sc);const u=parseFloat(cs.getPropertyValue('--u'));const art=sc.querySelector('.art.sub');const A=R(art);const k=A.width/1600;
        const box={left:A.left+650*k,right:A.left+1210*k,top:A.top+190*k,bottom:A.top+630*k};
        if(innerWidth>820&&ov(box,card))out.push({k:'caixa segura×card',dx:Math.round(card.right-box.left)});
        if(innerWidth<=820&&(box.left<S.left-1||box.right>S.right+1||box.top<S.top-1||box.bottom>S.bottom+1))out.push({k:'caixa segura fora do palco',box:[box.left,box.top,box.right,box.bottom].map(Math.round),S:[S.left,S.top,S.right,S.bottom].map(Math.round)});
        return {n:tags.length,out}})()`);
      for (const o of r.out) tb.push({ p: path, vp: `${w}x${h}`, id, ...o });
    }
  }
  console.log(JSON.stringify({ tagIssues: tb.length, tb }, null, 1));
}
