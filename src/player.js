/* Player animado do passo a passo.
   Cenas em SVG + GSAP desenhadas pelo Codex (GPT) no protótipo "Player da Receita";
   integradas ao site usando o mesmo cálculo de quantidades (window.NP) e os textos da receita. */
(function(){
const NP=window.NP, box=document.getElementById('assistir');
if(!NP||!window.gsap||!box){ if(box) box.hidden=true; return; }
const T=NP.T, C=NP.C, PL=T.player, L=PL.lbl;
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const NS='http://www.w3.org/2000/svg';
const nf0=new Intl.NumberFormat(T.locale,{maximumFractionDigits:0}), nf1=new Intl.NumberFormat(T.locale,{minimumFractionDigits:1,maximumFractionDigits:1});
const gfmt=v=>v<10?nf1.format(v):nf0.format(Math.round(v));
const rk=C.id==='napolitana'?'napo':'ny';
let Q={}, R={};
function refreshQ(){R=NP.calc();Q=Object.assign({},R,{bass:R.bassWater,sauce:R.sauceTotal,cheese:R.cheeseTotal,size:C.targetSize})}
const fq=k=>{const v=Q[k];return typeof v!=='number'?v:Number.isInteger(v)?nf0.format(v):gfmt(v)};
refreshQ();

/* ---------- motor de cenas (Codex) ---------- */
const scn=document.getElementById('scn');
const E=(tag,a={},p=scn)=>{const e=document.createElementNS(NS,tag);for(const k in a)e.setAttribute(k,a[k]);p.appendChild(e);return e};
const G=(a={},p=scn)=>E('g',a,p);
const V=n=>`var(--${n})`;
// Deterministic procedural detail makes replay and final frames consistent.
let seed=17;
function rand(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296}
function tag(x,y,txt,col='ink'){
  const w=Math.min(740,txt.length*10.2+32);x=Math.max(w/2+18,Math.min(782-w/2,x));
  const g=G({class:'quantity',transform:`translate(${x},${y})`});
  E('rect',{x:-w/2,y:-19,width:w,height:38,rx:12,fill:V('card'),stroke:V('line'),'stroke-width':1,filter:'url(#sh)'},g);
  E('rect',{x:-w/2+9,y:-7,width:3,height:14,rx:2,fill:V('gold')},g);
  E('text',{x:4,y:6,'text-anchor':'middle','font-family':'JetBrains Mono, monospace','font-size':17,fill:V(col)},g).textContent=txt;return g;
}
function bowl(x,y,s=1){const g=G({transform:`translate(${x},${y}) scale(${s})`});
  E('ellipse',{cy:31,rx:120,ry:19,fill:'url(#contact)'},g);
  E('path',{d:'M-120,-60 C-117,16 -70,40 0,40 C70,40 117,16 120,-60Z',fill:'url(#ceramic)',filter:'url(#sh)'},g);
  E('path',{d:'M-104,-44 C-94,-1 -74,18 -40,25',fill:'none',stroke:'#dcf3df','stroke-width':5,opacity:.28,'stroke-linecap':'round'},g);
  E('ellipse',{cy:-60,rx:121,ry:30,fill:'url(#inside)',stroke:'#a2b8ad','stroke-width':5},g);
  const inner=G({},g);return {g,inner};
}
function blob(x,y,rx,ry,p=scn){const g=G({transform:`translate(${x},${y})`},p);
  const b=E('ellipse',{rx,ry,fill:'url(#doughLit)',filter:'url(#sh)'},g);
  const gl=E('ellipse',{cx:-rx*.3,cy:-ry*.35,rx:rx*.34,ry:ry*.2,fill:'#fff7df',opacity:.32},g);
  return {g,b,gl};
}
function grains(n,x,y,col,r=3,spread=40){const g=G();const arr=[];for(let i=0;i<n;i++)arr.push(E('circle',{cx:x+(rand()-.5)*spread,cy:y-rand()*70,r:r*(.35+rand()*.7),fill:col,opacity:.8},g));return {g,arr};}
function stream(x1,y1,x2,y2,col,w=8){const l=E('path',{d:`M${x1},${y1} Q${x2-24},${y1+25} ${x2},${y2}`,fill:'none',stroke:col,'stroke-width':w,'stroke-linecap':'round',opacity:.85});const len=l.getTotalLength();l.style.strokeDasharray=len;l.style.strokeDashoffset=len;return {l,len};}
function clock(x,y,label){const g=G({transform:`translate(${x},${y})`,opacity:0});
  E('circle',{r:34,fill:V('card'),stroke:V('ink'),'stroke-width':3,filter:'url(#sh)'},g);
  const h=E('line',{x1:0,y1:0,x2:0,y2:-22,stroke:V('tomato'),'stroke-width':4,'stroke-linecap':'round'},g);
  E('circle',{r:4,fill:V('ink')},g); const t=E('text',{y:62,'text-anchor':'middle','font-family':'JetBrains Mono, monospace','font-size':16,fill:V('ink')},g); t.textContent=label; return {g,h};}
function fridge(x,y){const g=G({transform:`translate(${x},${y})`});
  E('rect',{x:-70,y:-230,width:140,height:240,rx:16,fill:V('card'),stroke:V('cold'),'stroke-width':3,filter:'url(#sh)'},g);
  E('line',{x1:-70,y1:-150,x2:70,y2:-150,stroke:V('cold'),'stroke-width':3},g);
  E('rect',{x:46,y:-210,width:8,height:40,rx:4,fill:V('cold')},g);E('rect',{x:46,y:-130,width:8,height:60,rx:4,fill:V('cold')},g);
  for(let i=0;i<3;i++)E('text',{x:-50+i*30,y:-170,'font-size':18,fill:V('cold'),'font-family':'JetBrains Mono'},g).textContent='❄';
  return g;}
function oven(x,y){const g=G({transform:`translate(${x},${y})`});
  E('ellipse',{cy:24,rx:216,ry:26,fill:'url(#contact)'},g);
  E('path',{d:'M-190,-180 L-164,-211 H171 L193,-181 V20 H-190Z',fill:'url(#metal)',filter:'url(#sh)'},g);
  E('rect',{x:-179,y:-187,width:358,height:198,rx:24,fill:'#263338',stroke:'#adb5ad','stroke-width':2},g);
  E('rect',{x:-160,y:-170,width:320,height:160,rx:40,fill:'#191512',stroke:'#111b20','stroke-width':8},g);
  E('path',{d:'M-149,-56L149,-56L159,-17H-159Z',fill:'#bfa88c'},g);
  for(let i=0;i<9;i++)E('line',{x1:-132+i*33,y1:-52,x2:-147+i*37,y2:-21,stroke:'#5f4d3a','stroke-width':1,opacity:.35},g);
  const top=E('rect',{x:-130,y:-152,width:260,height:8,rx:4,fill:'#5a2a1a'},g);
  const bot=E('rect',{x:-140,y:-29,width:280,height:8,rx:4,fill:'#6b4a2e'},g);
  const glow=E('ellipse',{cy:-90,rx:154,ry:78,fill:'url(#glow)',opacity:0},g);
  E('path',{d:'M-155,-181H100',stroke:'#eef3e6','stroke-width':2,opacity:.5},g);
  for(const x of [-152,152])E('circle',{cx:x,cy:1,r:7,fill:'url(#metal)',stroke:'#121d21','stroke-width':2},g);
  return {g,top,bot,glow};
}
function pizza(x,y,r,p=scn,ny=false){const g=G({transform:`translate(${x},${y})`},p);
  const base=E('circle',{r,fill:ny?'url(#crustLit)':'url(#doughLit)',stroke:V('dough2'),'stroke-width':ny?4:8,filter:'url(#sh)'},g);
  const sauce=E('circle',{r:r*(ny?.9:.8),fill:'url(#tomatoLit)',opacity:0},g);
  return {g,base,sauce};
}
function num(el,from,to,suffix,dur,tl,at){const o={v:from};tl.to(o,{v:to,duration:dur,ease:'power1.out',onUpdate:()=>el.textContent=Math.round(o.v)+suffix},at);}

const SCENES={
 pref(tl){ // pote, farinha, fermento, água, mexer, bolhas, geladeira
  const jar=G({transform:'translate(330,320)'});
  E('rect',{x:-70,y:-170,width:140,height:170,rx:22,fill:'url(#glass)',stroke:V('steel'),'stroke-width':3,opacity:.95,filter:'url(#sh)'},jar);
  const fillR=E('rect',{x:-64,y:-6,width:128,height:0,rx:16,fill:'url(#doughLit)'},jar);
  const fl=grains(40,330,40,V('salt'),4,50), ye=grains(10,330,40,V('gold'),3,30);
  const t1=tag(500,150,`${fq('pfFlour')} g ${L.flour}`), t2=tag(500,200,`${fq('yeast')} g ${L.yeast}`), t3=tag(500,250,`${fq('pfWater')} g ${L.water}`);
  [t1,t2,t3].forEach(t=>t.setAttribute('opacity',0));
  const w=stream(420,60,345,260,V('water'),10);
  tl.to(t1,{opacity:1,duration:.3}).to(fl.arr,{attr:{cy:300},duration:.7,stagger:.012,ease:'power2.in'},'<')
    .to(fl.arr,{opacity:0,duration:.2},'>-.1').to(fillR,{attr:{y:-50,height:44},duration:.4},'<')
    .to(t2,{opacity:1,duration:.3}).to(ye.arr,{attr:{cy:280},duration:.5,stagger:.03,ease:'power2.in'},'<').to(ye.arr,{opacity:0,duration:.2})
    .to(t3,{opacity:1,duration:.3}).to(w.l.style,{strokeDashoffset:0,duration:.5}).to(fillR,{attr:{y:-100,height:94},duration:.7},'<')
    .to(w.l,{opacity:0,duration:.2});
  const spoon=E('line',{x1:330,y1:120,x2:330,y2:260,stroke:V('steel'),'stroke-width':8,'stroke-linecap':'round',opacity:0});
  tl.to(spoon,{opacity:1,duration:.2}).to(spoon,{attr:{x1:300,x2:360},duration:.18,repeat:5,yoyo:true}).to(spoon,{opacity:0,duration:.2});
  const bub=[];for(let i=0;i<12;i++)bub.push(E('circle',{cx:280+rand()*100,cy:230+rand()*50,r:2+rand()*5,fill:'#fff',opacity:0},jar.parentNode));
  tl.to(bub,{opacity:.85,duration:.25,stagger:.05});
  const fr=fridge(650,320); fr.setAttribute('opacity',0); scn.appendChild(jar); bub.forEach(b=>scn.appendChild(b)); const ck=clock(150,160,`${fq('pfh')} h`);
  tl.to(fr,{opacity:1,duration:.3}).to([jar,...bub],{x:'+=320',scale:.55,transformOrigin:'50% 100%',duration:.8,ease:'power2.inOut'})
    .to(ck.g,{opacity:1,duration:.3},'<').to(ck.h,{rotation:720,transformOrigin:'0 0',svgOrigin:'0 0',duration:1.2,ease:'none'});
 },
 mix(tl){
  const b=bowl(330,330); const pf=blob(330,282,rk==='napo'?60:4,rk==='napo'?16:2,b.g.parentNode);
  const glass=G({transform:'translate(600,320)'});E('path',{d:'M-38,-120 L38,-120 L30,0 L-30,0Z',fill:'url(#glass)',stroke:V('steel'),'stroke-width':3,filter:'url(#sh)'},glass);
  const wl=E('path',{d:'M-34,-80 L34,-80 L30,-4 L-30,-4Z',fill:V('water'),opacity:.7},glass);
  const cr=grains(14,600,90,V('salt'),4,40); cr.arr.forEach(c=>c.setAttribute('stroke',V('steel')));
  const ts=tag(600,140,`${fq('salt')} g ${L.salt}`), tw=tag(600,380+0,`${fq(rk==='napo'?'initWater':'water')} g ${L.water}`);
  const tf=tag(150,120,`${fq(rk==='napo'?'finFlour':'flour')} g ${L.flour}`); [ts,tw,tf].forEach(t=>t.setAttribute('opacity',0));
  tl.to(ts,{opacity:1,duration:.3}).to(cr.arr,{attr:{cy:260},duration:.5,stagger:.02,ease:'power2.in'},'<').to(cr.arr,{opacity:0,duration:.6,stagger:.02})
    .to(tw,{opacity:1,duration:.3},'<');
  const fl=grains(46,330,30,V('salt'),4,70);
  tl.to(tf,{opacity:1,duration:.3}).to(fl.arr,{attr:{cy:270},duration:.7,stagger:.01,ease:'power2.in'},'<').to(fl.arr,{opacity:0,duration:.2});
  if(rk==='ny'){const sg=grains(8,330,30,V('oil'),3,30);tl.to(sg.arr,{attr:{cy:270},duration:.4,stagger:.02}).to(sg.arr,{opacity:0,duration:.2});}
  tl.to(glass,{rotation:-70,x:'-=180',y:'-=90',svgOrigin:'600 320',duration:.6,ease:'power2.inOut'}).to(wl,{opacity:0,duration:.5});
  tl.to(pf.b,{attr:{rx:92,ry:30},duration:.6},'<').to(pf.g,{y:'-=12',duration:.6},'<');
  const sp=E('line',{x1:330,y1:170,x2:330,y2:290,stroke:V('steel'),'stroke-width':9,'stroke-linecap':'round',opacity:0});
  tl.to(glass,{opacity:0,duration:.3}).to(sp,{opacity:1,duration:.2}).to(sp,{attr:{x1:290,x2:370},duration:.16,repeat:7,yoyo:true})
    .to(pf.b,{attr:{rx:96,ry:34},duration:.8},'<').to(sp,{opacity:0,duration:.2});
  if(rk==='ny'){const ck=clock(690,250,'20 min');tl.to(ck.g,{opacity:1,duration:.3}).to(ck.h,{rotation:360,svgOrigin:'0 0',duration:.9,ease:'none'});}
 },
 bass(tl){
  bowl(330,330); const d=blob(330,272,96,34);
  const per=Q.bass/3; for(let i=0;i<3;i++){const drop=E('path',{d:'M0,-14 C8,-2 10,4 0,12 C-10,4 -8,-2 0,-14Z',fill:V('water'),transform:'translate(330,60)',opacity:0});
    const t=tag(520,120+i*48,`+ ${gfmt(per)} g ${L.water}`);t.setAttribute('opacity',0);
    tl.to(t,{opacity:1,duration:.25}).to(drop,{opacity:1,duration:.1},'<').to(drop,{y:200,duration:.45,ease:'power2.in'},'<')
      .to(drop,{opacity:0,scale:2,transformOrigin:'50% 50%',duration:.2}).to(d.b,{attr:{rx:96+i*3,ry:30},duration:.15,yoyo:true,repeat:1})
      .to(d.gl,{opacity:.25,duration:.2},'<').to({},{duration:.25});}
 },
 fold(tl){
  bowl(330,330);const d=blob(330,274,94,34);
  const flap=E('path',{d:'M250 273 C260 244 280 240 300 239 C315 237 345 237 360 239 C380 240 400 244 410 273 C392 307 268 307 250 273Z',fill:'url(#doughLit)',filter:'url(#sh)'});
  const seam=E('path',{d:'M270 274 Q330 293 391 274',fill:'none',stroke:V('dough2'),'stroke-width':2,opacity:0});
  const label=tag(520,105,rk==='napo'?L.foldN:L.foldNY);
  tIntro(tl,label);
  for(let i=0;i<3;i++){
    tl.to(flap,{attr:{d:'M250 273 C275 251 294 172 308 151 C321 129 348 131 359 155 C376 194 390 251 410 273 C392 307 268 307 250 273Z'},duration:.55,ease:'power2.inOut'})
      .to(flap,{attr:{d:'M250 273 C265 242 285 252 305 264 C320 273 345 286 360 277 C380 267 398 253 410 273 C392 307 268 307 250 273Z'},duration:.5,ease:'power3.inOut'})
      .to(seam,{opacity:.7,duration:.15},'<.3')
      .to(flap,{attr:{d:'M250 273 C260 244 280 240 300 239 C315 237 345 237 360 239 C380 240 400 244 410 273 C392 307 268 307 250 273Z'},duration:.35,ease:'sine.out'})
      .to(seam,{opacity:0,duration:.2},'<');
  }
  const win=G({transform:'translate(600,260)',opacity:0});
  E('path',{d:'M-53 -37Q0 -17 53 -37Q31 0 53 37Q0 20 -53 37Q-30 0 -53 -37Z',fill:'url(#glass)',stroke:V('dough2'),'stroke-width':3},win);
  for(let i=0;i<5;i++)E('path',{d:`M${-30+i*15} -28Q${-20+i*10} 0 ${-30+i*15} 28`,stroke:V('dough2'),'stroke-width':.7,opacity:.45,fill:'none'},win);
  E('text',{y:75,'text-anchor':'middle','font-family':'JetBrains Mono','font-size':16,fill:V('ink')},win).textContent=L.window;
  tl.to(win,{opacity:1,duration:.6});
 },
 oil(tl){
  bowl(330,330); const d=blob(330,268,90,40);
  const bottle=G({transform:'translate(560,170)'});E('rect',{x:-22,y:-70,width:44,height:110,rx:12,fill:'url(#oilLit)',opacity:.9},bottle);E('rect',{x:-8,y:-96,width:16,height:30,rx:4,fill:'url(#leafLit)'},bottle);
  const t=tag(560,330,`${fq('oil')} g ${L.oil}`);t.setAttribute('opacity',0);
  const st=stream(470,140,350,240,V('oil'),6);
  tl.to(t,{opacity:1,duration:.3}).to(bottle,{rotation:-110,x:'-=60',y:'-=20',svgOrigin:'560 170',duration:.6}).to(st.l.style,{strokeDashoffset:0,duration:.5})
    .to(d.gl,{opacity:.7,duration:.8}).to(st.l,{opacity:0,duration:.3}).to(bottle,{rotation:0,x:'+=60',y:'+=20',svgOrigin:'560 170',duration:.5},'<')
    .to(d.b,{attr:{fill:'url(#oilLit)'},duration:.4,yoyo:true,repeat:1},'<').to(d.b,{attr:{rx:94,ry:36},duration:.3,yoyo:true,repeat:3});
 },
 lam(tl){
  const d=G();const r=E('rect',{x:330,y:260,width:120,height:70,rx:35,fill:'url(#doughLit)',stroke:V('dough2'),'stroke-width':2},d);
  tl.to(r,{attr:{x:190,y:250,width:420,height:80,rx:16},duration:.8,ease:'power2.out'})
    .to(r,{attr:{x:330,width:140},duration:.5,ease:'power2.inOut'}).to(r,{attr:{height:120,y:220},duration:.4},'<')
    .to(r,{attr:{x:340,width:120,height:90,y:240,rx:45},duration:.5});
  const t=tag(560,140,L.lam);t.setAttribute('opacity',0);const ck=clock(140,160,'1 h');
  tl.to(t,{opacity:1,duration:.3},0).to(ck.g,{opacity:1,duration:.3}).to(ck.h,{rotation:360,svgOrigin:'0 0',duration:.9,ease:'none'});
 },
 balls(tl){
  const big=blob(400,280,130,48); const n=Q.n, sp=Math.min(90,620/n), x0=400-sp*(n-1)/2;
  const balls=[];for(let i=0;i<n;i++){const b=blob(400,280,10,8);b.g.setAttribute('opacity',0);balls.push(b)}
  const scale=G({transform:'translate(400,395)'});E('rect',{x:-70,y:-14,width:140,height:28,rx:8,fill:'url(#metal)'},scale);
  const disp=E('text',{y:6,'text-anchor':'middle','font-family':'JetBrains Mono','font-size':16,fill:'#fff'},scale);disp.textContent='0 g';
  tl.to(big.b,{attr:{rx:150,ry:40},duration:.3}).to(big.g,{opacity:0,duration:.3});
  balls.forEach((b,i)=>{tl.to(b.g,{opacity:1,x:x0+i*sp,duration:.35,ease:'back.out(2)'},'>-.22').to(b.b,{attr:{rx:Math.min(38,sp*.42),ry:Math.min(30,sp*.34)},duration:.35},'<')});
  num(disp,0,Q.per,' g',.6,tl,'>');tl.add(()=>disp.textContent=gfmt(Q.per)+' g');
  const t=tag(400,150,`${Q.n} × ${gfmt(Q.per)} g`);t.setAttribute('opacity',0);tl.to(t,{opacity:1,duration:.3});
  balls.forEach(b=>tl.to(b.gl,{opacity:.3,duration:.2},'<'));
  const ck=clock(700,120,`${fq('panh')} h`);tl.to(ck.g,{opacity:1,duration:.3}).to(ck.h,{rotation:720,svgOrigin:'0 0',duration:1,ease:'none'});
 },
 temper(tl){
  const box=G({transform:'translate(400,320)'});E('rect',{x:-200,y:-110,width:400,height:110,rx:18,fill:V('card'),stroke:V('steel'),'stroke-width':3,opacity:.9,filter:'url(#sh)'},box);
  const n=Q.n, bs=[];for(let i=0;i<n;i++){const b=blob(400-160+i*(320/(n-1||1)),270,Math.min(30,145/n),Math.min(22,110/n));bs.push(b)}
  if(n===1)bs[0].g.setAttribute('transform','translate(400,270)');
  const th=G({transform:'translate(680,300)'});E('rect',{x:-8,y:-120,width:16,height:120,rx:8,fill:V('card'),stroke:V('steel'),'stroke-width':2},th);
  const merc=E('rect',{x:-4,y:-10,width:8,height:10,rx:4,fill:V('tomato')},th);
  const tt=E('text',{x:0,y:24,'text-anchor':'middle','font-family':'JetBrains Mono','font-size':15,fill:V('ink')},th);tt.textContent='7 °C';
  tl.to(merc,{attr:{y:-90,height:90},duration:1});num(tt,7,26,' °C',1,tl,'<');
  tl.to(bs.map(b=>b.b),{attr:{rx:Math.min(40,170/n),ry:Math.min(30,130/n)},duration:1.1,ease:'sine.inOut'},'<');
  bs.forEach(b=>{for(let k=0;k<4;k++){const c=E('circle',{cx:(rand()-.5)*40,cy:(rand()-.5)*20,r:2+rand()*3,fill:'#fff',opacity:0},b.g);tl.to(c,{opacity:.85,duration:.2},'>-.15')}});
  const ck=clock(130,150,`${fq('outh')} h`);tl.to(ck.g,{opacity:1,duration:.3},0).to(ck.h,{rotation:360,svgOrigin:'0 0',duration:1.2,ease:'none'},.3);
 },
 sauce(tl){
  const can=G({transform:'translate(240,320)'});E('rect',{x:-60,y:-150,width:120,height:150,rx:10,fill:'url(#metal)',filter:'url(#sh)'},can);
  E('rect',{x:-60,y:-110,width:120,height:60,fill:'url(#tomatoLit)'},can);
  const toms=[];for(let i=0;i<6;i++)toms.push(E('circle',{cx:200+rand()*80,cy:180,r:16,fill:'url(#tomatoLit)',opacity:0}));
  const bw=bowl(470,330,.8);
  tl.to(can,{rotation:-100,x:'+=120',y:'-=80',svgOrigin:'240 320',duration:.6}).to(toms,{opacity:1,duration:.1})
    .to(toms,{attr:{cx:470,cy:270},duration:.5,stagger:.05,ease:'power2.in'}).to(toms,{attr:{r:30},opacity:.9,duration:.3})
    .to(toms,{attr:{r:12},duration:.15,yoyo:true,repeat:3}).to(can,{opacity:0,duration:.3},'<');
  const t=tag(470,110,`${fq('cans')} ${L.cans}`);t.setAttribute('opacity',0);tl.to(t,{opacity:1,duration:.3},0);
  const ch=[];for(let i=0;i<8;i++)ch.push(E('rect',{x:640+(i%4)*22,y:250+Math.floor(i/4)*24,width:18,height:16,rx:4,fill:'url(#cheeseLit)',stroke:V('dough2'),opacity:0}));
  const t2=tag(690,200,`${fq('cheese')} g ${rk==='napo'?L.cheeseN:L.cheeseNY}`);t2.setAttribute('opacity',0);
  tl.to(t2,{opacity:1,duration:.3}).to(ch,{opacity:1,duration:.3,stagger:.05},'<');
  const drips=[];for(let i=0;i<4;i++)drips.push(E('circle',{cx:650+i*22,cy:300,r:3,fill:V('water'),opacity:0}));
  tl.to(drips,{opacity:.8,attr:{cy:330},duration:.5,stagger:.1,repeat:1});
 },
 oven(tl){
  const o=oven(400,320);
  const tTop=tag(400,90,`${L.top} 0 °C`), tBot=tag(400,370,`${L.bottom} 0 °C`);
  const a=tTop.querySelector('text'), b=tBot.querySelector('text');
  const oa={v:20},ob={v:20};tl.to(oa,{v:Q.top,duration:1.6,onUpdate:()=>a.textContent=`${L.top} ${Math.round(oa.v)} °C`},0).to(ob,{v:Q.bottom,duration:1.6,onUpdate:()=>b.textContent=`${L.bottom} ${Math.round(ob.v)} °C`},0);
  tl.to(o.top,{attr:{fill:'#FF7A2C'},duration:1.4},0).to(o.bot,{attr:{fill:'#E9622A'},duration:1.4},0).to(o.glow,{opacity:1,duration:1.4},0);
  const ck=clock(690,120,'30–40 min');tl.to(ck.g,{opacity:1,duration:.3},0).to(ck.h,{rotation:540,svgOrigin:'0 0',duration:1.6,ease:'none'},0);
 },
 open(tl){
  const p=pizza(400,280,30);const t=tag(620,120,rk==='napo'?L.rimN:L.rimNY);t.setAttribute('opacity',0);
  tl.to(p.base,{attr:{r:70},duration:.5});
  const dots=[];for(let i=0;i<14;i++){const a=i/14*Math.PI*2;dots.push(E('circle',{cx:400+Math.cos(a)*30,cy:280+Math.sin(a)*30,r:6,fill:V('dough2'),opacity:0}))}
  tl.to(dots,{opacity:1,duration:.15,stagger:.03}).to(dots,{attr:{cx:(i)=>400+Math.cos(i/14*Math.PI*2)*95,cy:(i)=>280+Math.sin(i/14*Math.PI*2)*95},duration:.7},'<.2')
    .to(p.base,{attr:{r:120},duration:.7},'<').to(dots,{opacity:0,duration:.2}).to(t,{opacity:1,duration:.3},'<');
  const rim=E('circle',{cx:400,cy:280,r:120,fill:'none',stroke:V('dough2'),'stroke-width':rk==='napo'?16:8,opacity:0});
  const dim=G({opacity:0});E('line',{x1:280,y1:420,x2:520,y2:420,stroke:V('ink'),'stroke-width':2},dim);E('text',{x:400,y:414,'text-anchor':'middle','font-family':'JetBrains Mono','font-size':15,fill:V('ink')},dim).textContent=Q.size;
  tl.to(rim,{opacity:1,duration:.4}).to(dim,{opacity:1,duration:.4},'<');
 },
 build(tl){
  const ny=rk==='ny'; const p=pizza(400,270,130,scn,ny);
  const sp=E('path',{d:spiral(400,270,ny?112:100),fill:'none',stroke:V('sauce'),'stroke-width':22,'stroke-linecap':'round'});const L=sp.getTotalLength();sp.style.strokeDasharray=L;sp.style.strokeDashoffset=L;
  tl.to(sp.style,{strokeDashoffset:0,duration:1,ease:'none'}).to(p.sauce,{opacity:1,duration:.2});
  const pcs=[];const k=ny?26:7;for(let i=0;i<k;i++){const a=rand()*Math.PI*2,r=Math.sqrt(rand())*(ny?100:80);
    pcs.push(ny?E('rect',{x:400+Math.cos(a)*r-5,y:270+Math.sin(a)*r-14,width:10,height:28,rx:4,fill:'url(#cheeseLit)',opacity:0,transform:`rotate(${rand()*180} ${400+Math.cos(a)*r} ${270+Math.sin(a)*r})`})
      :E('circle',{cx:400+Math.cos(a)*r,cy:270+Math.sin(a)*r,r:14,fill:'url(#cheeseLit)',opacity:0}))}
  tl.to(pcs,{opacity:1,duration:.12,stagger:ny?.02:.07});
  const t=tag(640,110,`${gfmt(Q.sauce/Q.n)} g ${L.sauce} · ${gfmt(Q.cheese/Q.n)} g ${L.cheese}`);t.setAttribute('opacity',0);tl.to(t,{opacity:1,duration:.3},0);
  const lv=[];if(!ny){for(let i=0;i<3;i++)lv.push(E('ellipse',{cx:370+i*30,cy:250+(i%2)*30,rx:12,ry:6,fill:'url(#leafLit)',opacity:0}));tl.to(lv,{opacity:1,duration:.2,stagger:.1});}
  const peel=E('rect',{x:220,y:400,width:360,height:24,rx:12,fill:V('bench'),stroke:V('dough2'),'stroke-width':2,opacity:0});
  const all=G();[sp,...pcs,...lv].forEach(e=>all.appendChild(e));tl.to(peel,{opacity:1,duration:.3}).to([p.g,all],{x:'-=14',duration:.12,yoyo:true,repeat:3});
 },
 bake(tl){
  const o=oven(400,330);o.top.setAttribute('fill','#FF7A2C');o.bot.setAttribute('fill','#E9622A');o.glow.setAttribute('opacity',1);
  const ny=rk==='ny'; const hero=G(); const p=pizza(400,262,80,hero,ny); p.sauce.setAttribute('opacity',1); p.g.setAttribute('opacity',0);
  const timer=tag(400,60,'0 s'); const tt=timer.querySelector('text');
  tl.fromTo(p.g,{opacity:1,x:720},{x:400,duration:.6,ease:'power2.out'});
  const T=ny?390:95;const o2={v:0};tl.addLabel('cnt').to(o2,{v:T,duration:2.6,ease:'none',onUpdate:()=>{const s=Math.round(o2.v);tt.textContent=ny?`${Math.floor(s/60)}:${String(s%60).padStart(2,'0')} min`:`${s} s`}},'cnt');
  const turns=ny?[60,120,180,240,300]:[28];turns.forEach(s=>tl.to(p.g,{rotation:'+=180',svgOrigin:'400 262',duration:.25},`cnt+=${(s/T)*2.6}`));
  const spots=[];for(let i=0;i<22;i++){const a=rand()*Math.PI*2;spots.push(E('circle',{cx:Math.cos(a)*(ny?78:76),cy:Math.sin(a)*(ny?78:76),r:2+rand()*3,fill:V('char'),opacity:0},p.g))}
  tl.to(spots,{opacity:.85,duration:.6,stagger:.02},'cnt+=1.4').to(p.base,{attr:{fill:'url(#crustLit)'},duration:.8},'<');
  if(ny){const brown=[];for(let i=0;i<10;i++)brown.push(E('circle',{cx:(rand()-.5)*110,cy:(rand()-.5)*110,r:6,fill:'#C98B30',opacity:0},p.g));tl.to(brown,{opacity:.7,duration:.6},'<');}
  tl.to(o.g,{opacity:.25,duration:.7},'cnt+=2.8').to(hero,{scale:1.65,svgOrigin:'400 262',y:18,duration:1,ease:'power3.out'},'cnt+=2.8');
 },
 slice(tl){
  const p=pizza(330,260,130,scn,true);p.sauce.setAttribute('opacity',1);E('circle',{cx:330,cy:260,r:118,fill:'url(#cheeseLit)',opacity:.9});
  const cuts=[];for(let i=0;i<4;i++){const a=i*Math.PI/4;cuts.push(E('line',{x1:330-Math.cos(a)*130,y1:260-Math.sin(a)*130,x2:330+Math.cos(a)*130,y2:260+Math.sin(a)*130,stroke:V('char'),'stroke-width':3,opacity:0}))}
  tl.to(cuts,{opacity:.7,duration:.3,stagger:.2});
  const sl=G({transform:'translate(600,280)',opacity:0});E('path',{d:'M0,-90 L50,60 Q0,80 -50,60Z',fill:'url(#cheeseLit)',stroke:V('crust'),'stroke-width':8,'stroke-linejoin':'round'},sl);
  tl.to(sl,{opacity:1,duration:.3}).to(sl,{scaleX:.45,transformOrigin:'50% 50%',duration:.5,ease:'power2.inOut'});
  const t=tag(600,410,L.foldSlice);t.setAttribute('opacity',0);tl.to(t,{opacity:1,duration:.3});
 }
};
function tIntro(t,e){t.from(e,{opacity:0,y:'-=8',duration:.4,ease:'power2.out'},0)}
function finishScene(key,t){
  // Tiny flour flecks and long contact shadows anchor the action to the bench.
  const dust=G({'aria-hidden':'true'});scn.insertBefore(dust,scn.firstChild);
  for(let i=0;i<52;i++)E('ellipse',{cx:190+rand()*420,cy:318+rand()*66,rx:.6+rand()*2.2,ry:.5+rand()*.7,fill:'#fff1d5',opacity:.18+rand()*.22},dust);
  if(['pref','mix','oil'].includes(key)){
    scn.querySelectorAll('rect').forEach(e=>{if(e.getAttribute('fill')==='url(#glass)'){
      const p=e.parentNode;E('path',{d:'M-52,-145V-24',stroke:'#fff','stroke-width':5,opacity:.42,'stroke-linecap':'round'},p);
      E('ellipse',{cy:-169,rx:62,ry:9,fill:'none',stroke:'#d7e5dd','stroke-width':4},p);
    }});
  }
  if(key==='bass'||key==='mix'||key==='oil'){
    const splash=G();for(let i=0;i<12;i++){
      const a=i/12*Math.PI*2,c=E('circle',{cx:330,cy:260,r:1.5+rand()*2,fill:key==='oil'?'url(#oilLit)':V('water'),opacity:0},splash);
      const at=key==='bass'?.8+i%3*1.3:2.5;
      t.fromTo(c,{opacity:.8},{attr:{cx:330+Math.cos(a)*65,cy:260+Math.sin(a)*20},opacity:0,duration:.65,ease:'power2.out'},at);
    }
  }
  if(key==='lam'){
    const r=scn.querySelector('rect');r.setAttribute('filter','url(#sh)');
    const seam=E('path',{d:'M350 270Q392 257 440 270 M350 285Q395 273 440 285',fill:'none',stroke:V('dough2'),'stroke-width':2,opacity:0});
    t.to(seam,{opacity:.6,duration:.5},2.2);
  }
  if(key==='fold'){
    const membrane=scn.querySelector('circle');if(membrane)membrane.setAttribute('fill','url(#glass)');
  }
  if(key==='build'||key==='bake'||key==='slice'){
    const base=scn.querySelector('circle[filter]');
    if(base&&key!=='bake'){
      const parent=base.parentNode,R=+base.getAttribute('r');
      for(let i=0;i<38;i++){
        const a=i*2.399,r=R*(.92+rand()*.04);
        E('ellipse',{cx:Math.cos(a)*r,cy:Math.sin(a)*r,rx:1+rand()*3,ry:1+rand()*2,fill:key==='slice'?V('char'):V('dough2'),opacity:.4},parent);
      }
    }
    const surface=key==='bake'?base?.parentNode:null;
    if(surface){
      for(let i=0;i<11;i++){
        const a=i*2.4,r=14+rand()*43,c=E('ellipse',{cx:Math.cos(a)*r,cy:Math.sin(a)*r,rx:rk==='ny'?16:10,ry:rk==='ny'?13:7,fill:'url(#cheeseLit)',opacity:0},surface);
        t.to(c,{opacity:1,duration:.4},.6+i*.05).to(c,{attr:{rx:rk==='ny'?19:12,ry:rk==='ny'?15:9},duration:.35,repeat:3,yoyo:true,ease:'sine.inOut'},1.3+i*.03);
      }
    }
    if(key!=='build'){
      for(let i=0;i<5;i++){
        const x=(key==='slice'?330:400)-65+i*32;
        const steam=E('path',{d:`M${x},200q-20,-25 0,-45t0,-42`,stroke:'#fff8e1','stroke-width':3,fill:'none',opacity:0,'stroke-linecap':'round'});
        t.fromTo(steam,{y:22,opacity:0},{y:-14,opacity:.35,duration:1.3,ease:'sine.out'},Math.max(2,t.duration()-.9)+i*.08);
      }
    }
  }
  // Slow anticipation and a composed finish; each chapter lasts 5–8 seconds.
  const length=t.duration();if(length<5.6)t.to({},{duration:5.6-length});
  t.duration(Math.max(5.6,Math.min(8,t.duration())));
}

function spiral(cx,cy,R){let d='',a=0,r=R;for(let i=0;i<=260;i++){a=i/260*Math.PI*2*4.5;r=R*(1-i/260);d+=(i?'L':'M')+(cx+Math.cos(a)*r).toFixed(1)+','+(cy+Math.sin(a)*r).toFixed(1)}return d}

/* ---------- player ---------- */
const $=id=>document.getElementById(id);
const STEPS=[];
T.steps.forEach((d,di)=>d.items.forEach(s=>STEPS.push({day:di,d:`${d.day} · ${d.when}`,t:s.t,li:s.li,tip:(s.tip||'').replace(/^warn\|/,''),wait:s.time,sc:C.scenes[s.id]})));
const ph=(s,html)=>s.replace(/\{(\w+)\}/g,(m,k)=>{const v=k in R?NP.fmt(k,R[k]):m;return html?`<span class="q">${v}</span>`:v});
let idx=0, tl=null, playing=false, mode='film', advance=null, stageVisible=true;
const visible=()=>!document.hidden&&stageVisible;
$('plChap').innerHTML=STEPS.map((s,i)=>`<button type="button" class="d${s.day}" aria-label="${PL.step} ${i+1}: ${s.t}"><i></i></button>`).join('');
[...$('plChap').children].forEach((b,i)=>b.onclick=()=>go(i,true));
function setPP(p){playing=p;$('plPP').setAttribute('aria-label',p?PL.pause:PL.play);$('plPPIco').innerHTML=p?'<path d="M7 5h4v14H7zM13 5h4v14h-4z" fill="currentColor"/>':'<path d="M8 5l11 7-11 7z" fill="currentColor"/>'}
function go(i,autoplay){
  idx=Math.max(0,Math.min(STEPS.length-1,i)); const s=STEPS[idx];
  if(advance){advance.kill();advance=null} setPP(false); if(tl){tl.kill()} scn.innerHTML='';
  $('plBadge').textContent=`${PL.step} ${String(idx+1).padStart(2,'0')} / ${STEPS.length}`;
  $('plDay').textContent=s.d; $('plTt').textContent=s.t; $('plLi').innerHTML=s.li.map(x=>`<li>${ph(x,true)}</li>`).join('');
  $('plTip').hidden=!s.tip; if(s.tip) $('plTip').textContent=ph(s.tip,false);
  $('plWait').textContent='⏱ '+ph(s.wait,false);
  [...$('plChap').children].forEach((b,k)=>{b.classList.toggle('done',k<idx);b.querySelector('i').style.width=k<idx?'100%':'0'});
  tl=gsap.timeline({paused:true,onUpdate:()=>{const b=$('plChap').children[idx];if(b)b.querySelector('i').style.width=(tl.progress()*100)+'%'},
    onComplete:()=>{ if(mode==='film' && playing && idx<STEPS.length-1) advance=gsap.delayedCall(.9,()=>{ if(playing&&mode==='film') go(idx+1,true); else setPP(false) }); else setPP(false); }});
  seed=17+idx*97; if(SCENES[s.sc]){SCENES[s.sc](tl); finishScene(s.sc,tl);}
  if(reduced){tl.progress(1);setPP(false);return}
  if(autoplay){setPP(true);if(visible())tl.play()} else {setPP(false);tl.progress(1)}   // parado: quadro final da etapa
}
$('plPP').onclick=()=>{ if(!tl) return; if(reduced){tl.progress(1);setPP(false);return} if(playing){tl.pause();if(advance){advance.kill();advance=null}setPP(false)} else { if(tl.progress()>=1) tl.restart(); else tl.play(); setPP(true)} };
$('plNext').onclick=()=>go(idx+1,true); $('plPrev').onclick=()=>go(idx-1,true); $('plRep').onclick=()=>go(idx,true);
$('plFilm').onclick=()=>{mode='film';$('plFilm').setAttribute('aria-pressed',true);$('plBench').setAttribute('aria-pressed',false)};
$('plBench').onclick=()=>{mode='bench';$('plBench').setAttribute('aria-pressed',true);$('plFilm').setAttribute('aria-pressed',false)};
function syncVisibility(){if(!tl)return;if(!visible()){tl.pause();if(advance)advance.pause()}else if(playing){if(advance)advance.resume();else tl.play()}}
addEventListener('visibilitychange',syncVisibility);
if('IntersectionObserver' in window)new IntersectionObserver(e=>{stageVisible=e[0].isIntersecting;syncVisibility()},{threshold:0}).observe($('stg'));
NP.onRender.push(()=>{refreshQ(); if(!playing) go(idx,false)});   // parâmetros mudaram: redesenha com os novos números
go(0,false);
})();
