/* Original locally hosted backgrounds. See assets/comparison-backgrounds/README.md. */
(() => {
  const root='assets/comparison-backgrounds/';
  const presets=[
    ['blue-final','Champions Night','champions-night','#05265c',0.08],
    ['ice-arena','Ice Arena','champions-night','#378da1',0.24],
    ['red-derby','Derby Night','champions-night','#771721',0.32],
    ['neon-tunnel','Neon Tunnel','neon-tunnel','#28105d',0.08],
    ['electric-teal','Electric Teal','neon-tunnel','#005846',0.3],
    ['pink-rush','Pink Rush','neon-tunnel','#8d1554',0.3],
    ['golden-final','Golden Final','golden-arena','#4a2d05',0.05],
    ['ember-arena','Ember Arena','golden-arena','#841d09',0.28],
    ['bronze-legacy','Bronze Legacy','golden-arena','#5d3324',0.2],
    ['cosmic-night','Cosmic Stadium','cosmic-stadium','#180747',0.06],
    ['aurora-cup','Aurora Cup','cosmic-stadium','#006454',0.27],
    ['midnight-elite','Midnight Elite','cosmic-stadium','#040a1b',0.45]
  ].map(([id,name,file,tint,opacity])=>({id,name,src:root+file+'.jpg',tint,opacity}));
  const aliases={sunset:'ember-arena',gold:'golden-final',cyber:'neon-tunnel',stealth:'midnight-elite'};
  const find=id=>presets.find(p=>p.id===(aliases[id]||id));
  const loaded=new Map();
  function ready(id){const p=find(id);if(!p)return Promise.resolve();if(!loaded.has(p.src))loaded.set(p.src,new Promise((resolve,reject)=>{const image=new Image();image.onload=resolve;image.onerror=()=>{loaded.delete(p.src);reject(Error('Background could not load. Try another background or retry.'));};image.src=p.src;}));return loaded.get(p.src);}
  function apply(id){
    const graphic=document.getElementById('comparisonGraphic'),layer=graphic.querySelector('.stadium-backdrop-img'),p=find(id);
    if(p){graphic.dataset.scene=p.id;layer.style.backgroundImage=`linear-gradient(${p.tint}${Math.round(p.opacity*255).toString(16).padStart(2,'0')},${p.tint}${Math.round(p.opacity*255).toString(16).padStart(2,'0')}),linear-gradient(180deg,rgba(0,0,0,.10),rgba(0,0,0,.26)),url("${p.src}")`;}
    else{delete graphic.dataset.scene;layer.style.backgroundImage='';}
    document.querySelectorAll('[data-background]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.background===p?.id)));
    const label=document.getElementById('selectedBackground');if(label)label.textContent=p?.name||'Classic stadium';
    const size=document.getElementById('exportSize');if(size){const scale=+size.value||1;document.getElementById('exportDimensions').textContent=`PNG · ${graphic.offsetWidth*scale} × ${graphic.offsetHeight*scale}`;}
  }
  function init(){
    const dialog=document.getElementById('backgroundDialog'),grid=document.getElementById('backgroundGallery');
    presets.forEach(p=>{const b=document.createElement('button');b.type='button';b.className='background-tile';b.dataset.background=p.id;b.setAttribute('aria-pressed','false');b.innerHTML=`<span class="background-thumb" style="background-image:linear-gradient(${p.tint}44,${p.tint}44),url('${p.src}')"></span><span>${p.name}</span>`;b.onclick=()=>{window.setTheme(p.id);dialog.close();};grid.append(b);});
    document.getElementById('openBackgrounds').onclick=()=>dialog.showModal();document.getElementById('closeBackgrounds').onclick=()=>dialog.close();
    dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
    document.getElementById('shuffleBackground').onclick=()=>{const current=document.getElementById('comparisonGraphic').dataset.scene;const available=presets.filter(p=>p.id!==current);window.setTheme(available[Math.floor(Math.random()*available.length)].id);};
    document.getElementById('exportSize').onchange=()=>apply(document.getElementById('comparisonGraphic').dataset.theme);
    apply(document.getElementById('comparisonGraphic').dataset.theme);
  }
  window.ComparisonBackgrounds={presets,apply,ready,init};
})();
