export default async function ({ page, sleep }) {
  const P = page; const R = {};
  for (const path of ['/pt/', '/pt/new-york/']) {
    await P.go({ w: 1440, h: 900, path });
    await P.send('Accessibility.enable');
    const { nodes } = await P.send('Accessibility.getFullAXTree');
    const roles = new Set(['button', 'link', 'textbox', 'spinbutton', 'checkbox', 'combobox', 'menuitem', 'tab', 'switch']);
    const nameless = nodes.filter(n => !n.ignored && roles.has(n.role?.value) && !(n.name?.value || '').trim()).map(n => n.role.value + ':' + n.backendDOMNodeId);
    const heads = nodes.filter(n => !n.ignored && n.role?.value === 'heading').map(n => (n.properties || []).find(p => p.name === 'level')?.value.value + ' ' + (n.name?.value || '').slice(0, 40));
    R[path] = { nameless, headings: heads.slice(0, 60), nHead: heads.length };
    // nomes vs texto visível (2.5.3)
    R[path].labelInName = await P.eval(`[...document.querySelectorAll('button[aria-label],a[aria-label]')].filter(e=>e.textContent.trim()&&!e.getAttribute('aria-label').toLowerCase().includes(e.textContent.trim().toLowerCase().slice(0,6))).map(e=>(e.id||e.className)+' | label="'+e.getAttribute('aria-label')+'" | text="'+e.textContent.trim().slice(0,30)+'"')`);
    // alvos < 44
    R[path].small = await P.eval(`(()=>{const o=[];document.querySelectorAll('a[href],button,input,summary,select,label.done').forEach(e=>{const cs=getComputedStyle(e);if(cs.display==='none'||e.closest('[hidden]')||e.closest('dialog:not([open])'))return;if(e.closest('p,li,dd,figcaption')&&e.tagName==='A'&&cs.display==='inline')return;const r=e.getBoundingClientRect();if(r.width===0)return;if(r.height<44||r.width<44)o.push((e.id||e.className||e.tagName)+' '+Math.round(r.width)+'×'+Math.round(r.height)+' '+e.textContent.trim().slice(0,20))});return [...new Set(o)].slice(0,40)})()`);
    await P.eval(`document.getElementById('openAdj').click();document.querySelectorAll('#adj details').forEach(d=>d.open=true)`); await sleep(200);
    R[path].smallDlg = await P.eval(`(()=>{const o=[];document.querySelectorAll('#adj a,#adj button,#adj input,#adj summary').forEach(e=>{const r=e.getBoundingClientRect();if(r.width&&(r.height<44||r.width<44))o.push((e.id||e.className||e.tagName)+' '+Math.round(r.width)+'×'+Math.round(r.height))});return o})()`);
    R[path].dlgLabels = await P.eval(`[...document.querySelectorAll('#adj input')].filter(i=>!i.labels.length&&!i.getAttribute('aria-label')).map(i=>i.id)`);
    await P.eval(`document.getElementById('adj').close()`);
    // lang menu item heights
    R[path].lang = await P.eval(`(()=>{const d=document.querySelector('.lang');if(!d)return null;d.open=true;return [...d.querySelectorAll('a')].map(a=>Math.round(a.getBoundingClientRect().height))})()`);
  }
  // teclado: Tab ponta a ponta, foco visível e não coberto
  for (const [w, h] of [[1440, 900], [375, 812]]) for (const path of ['/pt/', '/pt/new-york/']) {
    await P.go({ w, h, path });
    const seq = []; const issues = []; let last = '', stuck = 0;
    for (let i = 0; i < 220; i++) {
      await P.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
      await P.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
      await sleep(40); let a = -1; for (let k = 0; k < 30; k++) { const y = await P.eval('scrollY'); if (y === a) break; a = y; await sleep(50); }
      const r = await P.eval(`(()=>{const e=document.activeElement;if(!e||e===document.body)return {none:1};const b=e.getBoundingClientRect();const cs=getComputedStyle(e);const pts=[[b.left+b.width/2,b.top+b.height/2],[b.left+4,b.top+4],[b.right-4,b.bottom-4]];let cov=0;for(const [x,y] of pts){const t=document.elementFromPoint(x,y);if(!t||!(e===t||e.contains(t)||t.contains(e)||(t.closest('label')&&t.closest('label')===e.closest('label'))))cov++}
        const vis=b.bottom>0&&b.top<innerHeight;return {id:e.id||e.tagName+':'+(e.getAttribute('href')||e.dataset.step||e.textContent.trim().slice(0,14)),cov,vis,ol:cs.outlineStyle!=='none'&&parseFloat(cs.outlineWidth)>=2,top:Math.round(b.top),by:(()=>{const t=document.elementFromPoint(b.left+b.width/2,b.top+b.height/2);return t?(t.closest('figure,.bar,.dock,.rail,.card')?.className||t.tagName):'none'})()}})()`);
      if (r.none) { seq.push('BODY'); continue; }
      if (r.id === last) { if (++stuck > 2) { issues.push('trap ' + r.id); break; } } else stuck = 0; last = r.id;
      seq.push(r.id);
      if (!r.vis) issues.push('fora da tela ' + r.id + ' top' + r.top);
      else if (r.cov >= 2) issues.push('coberto ' + r.id + ' por ' + r.by + ' top' + r.top);
      if (!r.ol) issues.push('sem outline ' + r.id);
      if (seq.length > 5 && r.id === seq[0]) break;
    }
    R[`kb ${w} ${path}`] = { n: seq.length, issues: [...new Set(issues)].slice(0, 25), seqHead: seq.slice(0, 30).join(' '), seqTail: seq.slice(-25).join(' ') };
  }
  console.log(JSON.stringify(R, null, 1));
  if (P.logs.length) console.log(P.logs);
}
