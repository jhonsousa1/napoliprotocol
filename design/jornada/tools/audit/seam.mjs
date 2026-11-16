export default async function ({ page }) {
  const P = page; const out = {};
  for (const path of ['/pt/', '/pt/new-york/']) for (const [w, h] of [[768, 1024],[1440,900]]) for (const q of ['', '?np-driver=js']) {
    await P.go({ w, h, path, query: q });
    const geo = await P.eval(`(()=>{const g=NP.geo();return {g,t:[...document.querySelectorAll('main > .tile, .journey .tile')].map(t=>{const r=t.getBoundingClientRect();return {id:t.id,bottom:r.bottom+scrollY}})}})()`);
    const g = [];
    for (let i = 0; i + 1 < geo.t.length; i++) {
      for (const f of [0.3, 0.5, 0.7]) {
        await P.scrollTo(geo.t[i].bottom - geo.g.top0 - f * geo.g.A);
        const r = await P.eval(`(()=>{const a=document.getElementById('${geo.t[i].id}').querySelector(':scope>.scene').getBoundingClientRect(),b=document.getElementById('${geo.t[i+1].id}').querySelector(':scope>.scene').getBoundingClientRect();return [+(a.right-b.left).toFixed(2),+(a.top-b.top).toFixed(2),+b.left.toFixed(1)]})()`);
        g.push(r);
      }
    }
    out[`${path} ${w}x${h} ${q || "css"}`] = { bad: g.map((x,k)=>[geo.t[Math.floor(k/3)].id,[.3,.5,.7][k%3],x[0]]).filter(x=>Math.abs(x[2]-1)>1.01), overlapMin: Math.min(...g.map(x => x[0])), overlapMax: Math.max(...g.map(x => x[0])), dyMax: Math.max(...g.map(x => Math.abs(x[1]))), bL: g.filter((_, k) => k % 3 === 1).map(x => x[2]).slice(0, 5) };
  }
  console.log(JSON.stringify(out, null, 1));
}
