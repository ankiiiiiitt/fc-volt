/* A single canvas supplies both the preview and the lossless PNG download. */
(() => {
 'use strict';
 const $=id=>document.getElementById(id),canvas=$('poster'),g=canvas.getContext('2d');
 const cards=Array.from({length:10},()=>({image:null,url:null,cost:''}));
 const scenes=[['Champions Night','champions-night','#071833'],['Derby Red','champions-night','#56101d'],['Golden Arena','golden-arena','#221707'],['Neon Tunnel','neon-tunnel','#190d30'],['Cosmic Stadium','cosmic-stadium','#130b30'],['Midnight','cosmic-stadium','#030911']];
 let background=null,activeScene=0,custom=null,pending=0,selected=null,dragged=null;
 const pool=[];let nextId=1;const shardIcon=new Image();shardIcon.onload=draw;shardIcon.src='shard_icon_hq.png';
 function status(text,error=false){$('status').textContent=text;$('status').classList.toggle('error',error);}
 function rounded(x,y,w,h,r,fill,stroke){g.beginPath();g.roundRect(x,y,w,h,r);g.fillStyle=fill;g.fill();if(stroke){g.strokeStyle=stroke;g.lineWidth=2;g.stroke();}}
 function fit(image,x,y,w,h,cover=false){const scale=(cover?Math.max:Math.min)(w/image.width,h/image.height);g.drawImage(image,x+(w-image.width*scale)/2,y+(h-image.height*scale)/2,image.width*scale,image.height*scale);}
 function text(value,x,y,max,size,color='#fff',weight=800){g.font=`${weight} ${size}px Arial, sans-serif`;while(g.measureText(value).width>max&&size>10){size--;g.font=`${weight} ${size}px Arial, sans-serif`;}g.fillStyle=color;g.textAlign='center';g.textBaseline='middle';g.fillText(value,x,y);}
 function draw(){
  g.clearRect(0,0,1920,1080);g.fillStyle='#08111f';g.fillRect(0,0,1920,1080);
  if(background)fit(background,0,0,1920,1080,true);
  g.fillStyle=custom?'#03071170':scenes[activeScene][2]+'66';g.fillRect(0,0,1920,1080);
  const shade=g.createLinearGradient(0,0,0,1080);shade.addColorStop(0,'#03060ee6');shade.addColorStop(.22,'#03060e30');shade.addColorStop(1,'#03060eb0');g.fillStyle=shade;g.fillRect(0,0,1920,1080);
  rounded(787,28,346,40,20,'#ed3450');text('FC VOLT  /  RANKED PICKS',960,49,320,18,'#fff');
  text($('posterTitle').value.trim()||'TOP 10 • DO NOT CLAIM',960,118,1730,68);
  g.fillStyle='#ff485f';g.fillRect(860,167,200,4);
  cards.forEach((card,i)=>{
   const x=76+(i%5)*358,y=204+Math.floor(i/5)*414;
   rounded(x,y,336,390,20,'#050b17b8','#ffffff20');
   if(card.image)fit(card.image,x+42,y+23,252,292);
   else{rounded(x+58,y+31,220,272,18,'#12203390','#ffffff18');text('CARD '+(i+1),x+168,y+160,185,26,'#a4b5cb');}
   rounded(x+13,y+13,62,46,12,'#f1c768');text('#'+(i+1),x+44,y+37,53,26,'#1d1707');
   g.beginPath();g.arc(x+301,y+35,25,0,Math.PI*2);g.fillStyle='#e52d4b';g.fill();g.strokeStyle='#ffb4bf';g.lineWidth=2;g.stroke();g.strokeStyle='#fff';g.lineWidth=5;g.lineCap='round';g.beginPath();g.moveTo(x+293,y+27);g.lineTo(x+309,y+43);g.moveTo(x+309,y+27);g.lineTo(x+293,y+43);g.stroke();
   rounded(x+40,y+326,256,45,23,'#030b16','#00d6f3');if(shardIcon.complete&&shardIcon.naturalWidth)g.drawImage(shardIcon,x+48,y+331,35,35);text(card.cost.trim()||'—',x+184,y+349,192,30,'#ffffff');
  });
  text('FC VOLT  •  FC MOBILE',960,1058,1600,18,'#c2ccdc');
 }
 async function loadImage(file){
  if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>15*1024*1024)throw Error('Choose a PNG, JPG or WebP image up to 15 MB.');
  const image=await createImageBitmap(file);
  if(image.width*image.height>16000000){image.close();throw Error('Choose an image smaller than 16 megapixels.');}return image;
 }
 function setPending(delta){pending+=delta;$('download').disabled=pending>0;$('removeBackground').disabled=!selectedExists()||pending>0;$('restoreCard').disabled=!selected?.cleaned||pending>0;}
 async function makeCard(file){const image=await loadImage(file),url=URL.createObjectURL(file);return {id:nextId++,image,url,originalURL:url,cost:'',name:file.name,cleaned:false};}
 function selectedExists(){return selected&&(pool.includes(selected)||cards.includes(selected));}
 function select(card){selected=card;render();}
 function returnToBench(index){if(cards[index].image){pool.push(cards[index]);cards[index]={image:null,url:null,cost:''};}render();}
 function place(card,index){
  if(!card?.image||pending)return;
  const from=cards.indexOf(card),bench=pool.indexOf(card);
  if(from===index){select(card);return;}
  if(from>=0){[cards[from],cards[index]]=[cards[index],cards[from]];}
  else if(bench>=0){pool.splice(bench,1);if(cards[index].image)pool.push(cards[index]);cards[index]=card;}
  else return;
  selected=card;render();status('Placed at rank '+(index+1)+'. Set its shard cost.');
 }
 function dropTarget(el,placeCard){
  el.ondragover=e=>{if(dragged){e.preventDefault();e.dataTransfer.dropEffect='move';el.classList.add('drag-over');}};
  el.ondragleave=()=>el.classList.remove('drag-over');
  el.ondrop=e=>{e.preventDefault();el.classList.remove('drag-over');if(dragged)placeCard(dragged);dragged=null;};
 }
 function draggable(el,card){el.draggable=true;el.ondragstart=e=>{dragged=card;e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',String(card.id));};el.ondragend=()=>{dragged=null;document.querySelectorAll('.drag-over').forEach(n=>n.classList.remove('drag-over'));};}
 async function putCard(index,file){setPending(1);try{const card=await makeCard(file);if(cards[index].image)pool.push(cards[index]);cards[index]=card;selected=card;render();status('Card added to rank '+(index+1)+'.');}catch(e){status(e.message,true);}finally{setPending(-1);render();}}
 function render(){
  if(!selectedExists())selected=null;
  $('selectionHint').textContent=selected?(pool.includes(selected)?'Card selected. Click a rank to place it, or remove its background.':'Ranked card selected. Drag to reorder, or remove its background.'):'Select a card to rank it or remove its background.';
  $('removeBackground').disabled=!selected||pending>0;$('restoreCard').disabled=!selected?.cleaned||pending>0;
  const bench=$('bench');bench.replaceChildren();
  pool.forEach((card,i)=>{const b=document.createElement('button');b.type='button';b.className='bench-card';b.setAttribute('aria-label','Select bench card '+(i+1));b.setAttribute('aria-pressed',String(selected===card));const img=document.createElement('img');img.src=card.url;img.alt=card.name;const caption=document.createElement('span');caption.textContent='Card '+(i+1);b.append(img,caption);b.onclick=()=>select(card);draggable(b,card);bench.append(b);});
  $('benchCount').textContent=pool.length+' cards';
  const list=$('rankEditor');list.replaceChildren();
  cards.forEach((card,i)=>{
   const row=document.createElement('div');row.className='rank-row'+(card===selected?' selected':'');row.setAttribute('aria-label','Rank '+(i+1));
   row.innerHTML=`<span class="rank-num">${i+1}</span><div class="rank-media"><button class="rank-place" type="button" aria-label="Place selected card at rank ${i+1}">＋</button><label class="file-button rank-upload-small">Upload<input type="file" accept="image/png,image/jpeg,image/webp" aria-label="Upload card rank ${i+1}"></label></div><div class="rank-fields"><label for="cost${i}">Shard cost · Rank ${i+1}</label><input id="cost${i}" inputmode="numeric" placeholder="e.g. 1,500" maxlength="18"></div><div class="rank-actions"><button type="button" aria-label="Move rank ${i+1} up">↑</button><button type="button" aria-label="Move rank ${i+1} down">↓</button><button type="button" aria-label="Return rank ${i+1} to bench" title="Return to bench">↩</button></div>`;
   const upload=row.querySelector('input[type=file]');upload.onchange=()=>{if(upload.files[0])putCard(i,upload.files[0]);};
   const placeButton=row.querySelector('.rank-place');placeButton.onclick=()=>{if(selected&&pool.includes(selected))place(selected,i);else if(card.image)select(card);else if(selected)place(selected,i);else status('Select a card from the bench first.');};
   if(card.url){const image=document.createElement('img');image.src=card.url;image.alt='Card rank '+(i+1);placeButton.replaceChildren(image);draggable(placeButton,card);}
   dropTarget(row,c=>place(c,i));
   const input=row.querySelector('.rank-fields input');input.value=card.cost;input.oninput=()=>{card.cost=input.value;draw();};
   const buttons=row.querySelectorAll('.rank-actions button');buttons[0].disabled=i===0;buttons[1].disabled=i===9;buttons[2].disabled=!card.image;
   buttons[0].onclick=()=>swap(i,i-1);buttons[1].onclick=()=>swap(i,i+1);buttons[2].onclick=()=>returnToBench(i);list.append(row);
  });$('cardCount').textContent=cards.filter(c=>c.image).length+' / 10 ranked';draw();
 }
 function swap(a,b){[cards[a],cards[b]]=[cards[b],cards[a]];render();}
 dropTarget($('bench'),card=>{const i=cards.indexOf(card);if(i>=0)returnToBench(i);});
 $('bulkCards').onchange=async e=>{
  const files=[...e.target.files];setPending(1);let added=0;try{
   for(const file of files){if(pool.length+cards.filter(c=>c.image).length>=50){status('Bench limit is 50 cards. Rank or reuse the cards already uploaded.',true);break;}pool.push(await makeCard(file));added++;}
   status(added+' cards added to the bench. Select a card, then click a rank.');
  }catch(err){status(err.message,true);}finally{setPending(-1);e.target.value='';render();}
 };
 $('removeTolerance').oninput=e=>$('toleranceValue').textContent=e.target.value+'%';
 $('removeBackground').onclick=async()=>{
  if(!selectedExists()||pending)return;const card=selected;setPending(1);render();status('Removing card background…');
  try{
   // Always reprocess the original, so repeated adjustments do not damage the card.
   const url=await processImageBackgroundRemoval(card.originalURL,{mode:$('removeMode').value,tolerance:+$('removeTolerance').value/100,choke:1,crop:true});
   const image=await createImageBitmap(await(await fetch(url)).blob());
   card.image.close();card.image=image;card.url=url;card.cleaned=true;status('Background removed. Use Restore original to undo.');
  }catch(e){status('Could not remove this background. Try a different mode or tolerance.',true);}finally{setPending(-1);render();}
 };
 $('restoreCard').onclick=async()=>{if(!selectedExists()||pending)return;const card=selected;setPending(1);try{const image=await createImageBitmap(await(await fetch(card.originalURL)).blob());card.image.close();card.image=image;card.url=card.originalURL;card.cleaned=false;status('Original card restored.');}catch(e){status('Could not restore this card. Please upload it again.',true);}finally{setPending(-1);render();}};
 let sceneRequest=0;
 async function chooseScene(index){const request=++sceneRequest;setPending(1);try{
  const image=new Image();image.src='assets/comparison-backgrounds/'+scenes[index][1]+'.jpg';await image.decode();if(request!==sceneRequest)return;
  custom?.close();custom=null;background=image;activeScene=index;$('backgroundName').textContent=scenes[index][0];document.querySelectorAll('[data-scene]').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.scene===index)));draw();
 }catch(e){status('Background could not load. Try another preset or upload your own.',true);}finally{setPending(-1);}}
 scenes.forEach(([name,file],i)=>{const button=document.createElement('button');button.type='button';button.dataset.scene=i;button.setAttribute('aria-pressed',String(i===0));button.innerHTML=`<img src="assets/comparison-backgrounds/${file}.jpg" alt=""><span>${name}</span>`;button.onclick=()=>chooseScene(i);$('backgrounds').append(button);});
 $('customBackground').onchange=async e=>{const file=e.target.files[0];if(!file)return;const request=++sceneRequest;setPending(1);try{const image=await loadImage(file);if(request!==sceneRequest){image.close();return;}custom?.close();custom=image;background=image;$('backgroundName').textContent='Your background';document.querySelectorAll('[data-scene]').forEach(b=>b.setAttribute('aria-pressed','false'));draw();status('Your background is applied.');}catch(err){status(err.message,true);}finally{setPending(-1);e.target.value='';}};
 $('posterTitle').oninput=draw;
 canvas.onclick=e=>{const r=canvas.getBoundingClientRect(),x=(e.clientX-r.left)*1920/r.width,y=(e.clientY-r.top)*1080/r.height;for(let i=0;i<10;i++){const sx=76+i%5*358,sy=204+Math.floor(i/5)*414;if(x>=sx&&x<=sx+336&&y>=sy&&y<=sy+390){if(selected&&pool.includes(selected))place(selected,i);else if(cards[i].image)select(cards[i]);else if(selected)place(selected,i);break;}}};
 dropTarget(canvas,card=>{ /* Rank rows provide precise drag targets; canvas drop uses pointer position below. */ });
 canvas.ondrop=e=>{e.preventDefault();canvas.classList.remove('drag-over');const card=dragged;dragged=null;if(!card)return;const r=canvas.getBoundingClientRect(),x=(e.clientX-r.left)*1920/r.width,y=(e.clientY-r.top)*1080/r.height;for(let i=0;i<10;i++){const sx=76+i%5*358,sy=204+Math.floor(i/5)*414;if(x>=sx&&x<=sx+336&&y>=sy&&y<=sy+390){place(card,i);break;}}};
 $('download').onclick=async()=>{
  if(!cards.some(c=>c.image)){status('Add at least one player card before downloading.',true);return;}
  setPending(1);try{draw();const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw Error('PNG export failed. Please try again.');const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='FC-VOLT-do-not-claim-top10.png';link.click();setTimeout(()=>URL.revokeObjectURL(url),60000);status('Downloaded 1920 × 1080 PNG.');}catch(e){status(e.message,true);}finally{setPending(-1);}
 };
 render();chooseScene(0);
})();
