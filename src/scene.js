/* Cenário: troca a tomada da câmera (data-take no .scene), carrega as fotos secundárias e liga a topbar transparente.
   Só IntersectionObserver: nenhum ouvinte de scroll. A câmera em si é CSS (ver <style id="scene-css">). */
(function(){
  if(location.search.indexOf('prerender')>=0) return;   // nada disto pode ir para o HTML gravado
  var sc=document.querySelector('.scene'); if(!sc||!('IntersectionObserver' in window)) return;
  var ORDER=['hero','tempo','gesto','fogo','fim'];
  var reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  var marks=[].slice.call(document.querySelectorAll('[data-take]')), on=new Set(), cur='hero';
  sc.dataset.take=cur;
  function set(t){
    if(t===cur) return;
    if(Math.abs(ORDER.indexOf(t)-ORDER.indexOf(cur))>1){   // salto por âncora: troca seca
      sc.classList.add('cut'); requestAnimationFrame(function(){requestAnimationFrame(function(){sc.classList.remove('cut')})});
    }
    cur=t; sc.dataset.take=t;
  }
  if(!reduced){
    /* "dentro" = topo do marcador acima de 90% do viewport.
       A margem superior enorme mantém "dentro" os marcadores que ficaram acima da tela: sobrevive a saltos por âncora. */
    var io=new IntersectionObserver(function(es){
      es.forEach(function(e){e.isIntersecting?on.add(e.target):on.delete(e.target)});
      var t='hero'; marks.forEach(function(m){if(on.has(m)) t=m.dataset.take});
      set(t);
    },{rootMargin:'100000px 0px -10% 0px'});
    marks.forEach(function(m){io.observe(m)});
  }else{
    /* Movimento reduzido: a tomada só troca com nenhuma janela à vista. Cada marcador está 'above', 'in' ou 'below';
       ao sair uma janela por cima passa-se à seguinte, ao sair por baixo volta-se à anterior (a folha opaca entre as duas cobre o cenário). */
    var st=marks.map(function(){return 'below'}), init=true;
    var rio=new IntersectionObserver(function(es){
      var ch=-1;
      es.forEach(function(e){ch=marks.indexOf(e.target)});
      marks.forEach(function(m,i){var r=m.getBoundingClientRect();   // estado real de todos (evita ler lotes parciais após saltos)
        st[i]=r.bottom<=0?'above':(r.top>=innerHeight?'below':'in')});
      var j=st.indexOf('in');
      if(j>=0) set(marks[j].dataset.take);
      else{
        var k=0; while(k<marks.length&&st[k]==='above') k++;          // primeiro marcador que ainda não passou
        if(k===0||k>=marks.length) set(marks[Math.min(k,marks.length-1)].dataset.take);
        else if(!init&&es.length===1&&ch===k-1) set(marks[k].dataset.take);   // acabou de sair por cima: a próxima
        else set(marks[k-1].dataset.take);                            // saiu por baixo, salto por âncora ou abertura direta: a anterior
      }
      init=false;
    },{rootMargin:'0px'});
    marks.forEach(function(m){rio.observe(m)});
  }

  /* Fotos secundárias: carregam quando o marcador que as usa chega a 1,5 viewport (margem superior enorme: também após salto por âncora) */
  var lazy=new IntersectionObserver(function(es){es.forEach(function(e){
    if(!e.isIntersecting) return; lazy.unobserve(e.target);
    var ph=sc.querySelector('.ph-'+e.target.dataset.photo); if(!ph) return;
    [].forEach.call(ph.querySelectorAll('[data-srcset]'),function(s){s.srcset=s.dataset.srcset; s.removeAttribute('data-srcset')});
    var img=ph.querySelector('img[data-src]'); if(img){img.src=img.dataset.src; img.removeAttribute('data-src')}
  })},{rootMargin:'100000px 0px 150% 0px'});
  [].forEach.call(document.querySelectorAll('[data-photo]'),function(m){lazy.observe(m)});

  /* Topbar transparente só enquanto o herói está sob ela. A faixa de KPIs sobe sobre a borda do herói,
     então o critério é o topo da primeira folha (KPIs incluídos) ainda abaixo da barra. */
  var bar=document.querySelector('.topbar'), edge=document.querySelector('.sheet-first .kpis')||document.querySelector('.sheet-first');
  if(bar&&edge){
    var bh=function(){return bar.getBoundingClientRect().bottom};
    var lim=function(){return Math.round(bh()+innerHeight*.25)};   // folga: a faixa final do herói (crédito da foto) não passa por baixo da barra transparente
    var upd=function(){bar.classList.toggle('on-hero',edge.getBoundingClientRect().top>lim())};
    new IntersectionObserver(upd,{rootMargin:'-'+lim()+'px 0px 0px 0px',threshold:[0,1]}).observe(edge);
    upd();
  }
})();
