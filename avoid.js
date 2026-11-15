/* A single canvas supplies both the preview and the lossless PNG download. */
(() => {
 'use strict';
 const $=id=>document.getElementById(id),canvas=$('poster'),g=canvas.getContext('2d');
 const cards=Array.from({length:10},()=>({image:null,url:null,cost:''}));
 const W=1080,H=1240;
 function slot(i){const bottom=i>=6,col=bottom?i-6:i%3;return {x:bottom?65+col*240:130+col*280,y:bottom?950:(i<3?185:560),w:bottom?230:260,h:bottom?220:270};}
 const scenes=[['Sunset Flame',null,'#ff3c00'],['Cyber Violet',null,'#7c12bd'],['Champions Cyan',null,'#082d65'],['Pitch Green',null,'#075d35'],['Champions Night','champions-night','#071833'],['Derby Red','champions-night','#56101d'],['Golden Arena','golden-arena','#221707'],['Neon Tunnel','neon-tunnel','#190d30'],['Cosmic Stadium','cosmic-stadium','#130b30'],['Midnight','cosmic-stadium','#030911']];
 let background=null,activeScene=0,custom=null,pending=0,selected=null,dragged=null;
 const pool=[];let nextId=1;const shardIcon=new Image();shardIcon.onload=draw;shardIcon.src='shard_icon_hq.png';
 function status(text,error=false){$('status').textContent=text;$('status').classList.toggle('error',error);}
 function rounded(x,y,w,h,r,fill,stroke){g.beginPath();g.roundRect(x,y,w,h,r);g.fillStyle=fill;g.fill();if(stroke){g.strokeStyle=stroke;g.lineWidth=2;g.stroke();}}
 function fit(image,x,y,w,h,cover=false){const scale=(cover?Math.max:Math.min)(w/image.width,h/image.height);g.drawImage(image,x+(w-image.width*scale)/2,y+(h-image.height*scale)/2,image.width*scale,image.height*scale);}
 function text(value,x,y,max,size,color='#fff',weight=800){g.font=`${weight} ${size}px Arial, sans-serif`;while(g.measureText(value).width>max&&size>10){size--;g.font=`${weight} ${size}px Arial, sans-serif`;}g.fillStyle=color;g.textAlign='center';g.textBaseline='middle';g.fillText(value,x,y);}
 function impact(value,x,y,max,size,color='#fff',outline=5){
  value=value.toUpperCase();g.font=`${size}px Anton, Impact, sans-serif`;while(g.measureText(value).width>max&&size>12){size--;g.font=`${size}px Anton, Impact, sans-serif`;}
  g.textAlign='center';g.textBaseline='middle';g.lineJoin='round';g.strokeStyle='#050505';g.lineWidth=outline;g.shadowColor='#000b';g.shadowBlur=10;g.shadowOffsetY=4;g.strokeText(value,x,y);g.fillStyle=color;g.fillText(value,x,y);g.shadowBlur=0;g.shadowOffsetY=0;
 }
 function draw(){
  g.clearRect(0,0,W,H);
  if(background){fit(background,0,0,W,H,true);g.fillStyle=custom?'#02050b25':scenes[activeScene][2]+'55';g.fillRect(0,0,W,H);}
  else{
   const colors=activeScene===0?['#ff790d','#ff3200','#df1400']:activeScene===1?['#b531e7','#7212b7','#35046a']:activeScene===2?['#075d91','#05214d','#020a20']:['#09834c','#06482b','#021a12'];
   const gradient=g.createLinearGradient(0,0,0,H);colors.forEach((c,i)=>gradient.addColorStop(i/2,c));g.fillStyle=gradient;g.fillRect(0,0,W,H);
   const glow=g.createRadialGradient(W/2,0,0,W/2,0,820);glow.addColorStop(0,'#fff38355');glow.addColorStop(1,'#ffffff00');g.fillStyle=glow;g.fillRect(0,0,W,H);
  }
  g.fillStyle='#ffffff12';g.beginPath();g.moveTo(0,0);g.lineTo(110,0);g.lineTo(0,310);g.fill();g.beginPath();g.moveTo(W-80,0);g.lineTo(W,0);g.lineTo(W,300);g.fill();
  g.beginPath();g.arc(540,660,345,0,Math.PI*2);g.setLineDash([7,6]);g.strokeStyle='#ffffff24';g.lineWidth=2;g.stroke();g.setLineDash([]);
  impact($('posterTitle').value.trim()||'TOP 10 DO NOT CLAIM',540,56,990,61,'#fff',6);
  const subtitle=$('posterSubtitle').value.trim();if(subtitle){g.font='32px Anton, Impact, sans-serif';const sw=Math.min(900,g.measureText(subtitle.toUpperCase()).width+48);g.shadowColor='#000a';g.shadowBlur=13;g.shadowOffsetY=5;rounded((W-sw)/2,98,sw,46,24,'#030305','#ffffff');g.shadowBlur=0;g.shadowOffsetY=0;impact(subtitle,540,121,sw-36,31,'#fff',2);}
  cards.forEach((card,i)=>{
   const {x,y,w,h}=slot(i);
   impact('#'+(i+1),x+w/2,y-22,w,26,'#ffeb50',3);
   if(card.image){g.shadowColor='#000b';g.shadowBlur=18;g.shadowOffsetY=9;fit(card.image,x,y,w,h);g.shadowBlur=0;g.shadowOffsetY=0;}
   else{g.setLineDash([9,7]);rounded(x+15,y+10,w-30,h-20,12,'#00000020','#ffffff66');g.setLineDash([]);impact('ADD CARD',x+w/2,y+h/2,w-40,25,'#ffffffbb',2);}
   const cx=x+w-5,cy=y+7,r=i<6?23:20;
   g.shadowColor='#000a';g.shadowBlur=10;g.beginPath();g.arc(cx,cy,r,0,Math.PI*2);g.fillStyle='#e81738';g.fill();g.strokeStyle='#fff';g.lineWidth=2.5;g.stroke();g.shadowBlur=0;g.strokeStyle='#fff';g.lineWidth=5;g.lineCap='round';g.beginPath();g.moveTo(cx-7,cy-7);g.lineTo(cx+7,cy+7);g.moveTo(cx+7,cy-7);g.lineTo(cx-7,cy+7);g.stroke();
   const ph=i<6?42:36,py=y+h+10,cost=card.cost.trim()||'—';g.font=`${i<6?32:27}px Anton, Impact, sans-serif`;const pw=Math.max(120,Math.min(w-5,g.measureText(cost).width+62)),px=x+(w-pw)/2;
   g.shadowColor='#00dfff';g.shadowBlur=16;rounded(px,py,pw,ph,ph/2,'#020712','#00e5ff');g.shadowBlur=0;if(shardIcon.complete&&shardIcon.naturalWidth)g.drawImage(shardIcon,px+5,py+4,ph-8,ph-8);impact(cost,px+ph+(pw-ph)/2-3,py+ph/2+1,pw-ph-12,i<6?32:27,'#fff',2);
  });
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
  let image=null;if(scenes[index][1]){image=new Image();image.src='assets/comparison-backgrounds/'+scenes[index][1]+'.jpg';await image.decode();}if(request!==sceneRequest)return;
  custom?.close();custom=null;background=image;activeScene=index;$('backgroundName').textContent=scenes[index][0];document.querySelectorAll('[data-scene]').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.scene===index)));draw();
 }catch(e){status('Background could not load. Try another preset or upload your own.',true);}finally{setPending(-1);}}
 scenes.forEach(([name,file],i)=>{const button=document.createElement('button');button.type='button';button.dataset.scene=i;button.setAttribute('aria-pressed',String(i===0));button.innerHTML=(file?`<img src="assets/comparison-backgrounds/${file}.jpg" alt="">`:`<i class="scene-swatch" style="background:linear-gradient(145deg,${scenes[i][2]},#150714)"></i>`)+`<span>${name}</span>`;button.onclick=()=>chooseScene(i);$('backgrounds').append(button);});
 $('customBackground').onchange=async e=>{const file=e.target.files[0];if(!file)return;const request=++sceneRequest;setPending(1);try{const image=await loadImage(file);if(request!==sceneRequest){image.close();return;}custom?.close();custom=image;background=image;$('backgroundName').textContent='Your background';document.querySelectorAll('[data-scene]').forEach(b=>b.setAttribute('aria-pressed','false'));draw();status('Your background is applied.');}catch(err){status(err.message,true);}finally{setPending(-1);e.target.value='';}};
 $('posterTitle').oninput=draw;$('posterSubtitle').oninput=draw;document.fonts.ready.then(draw);
 function rankAt(e){const r=canvas.getBoundingClientRect(),px=(e.clientX-r.left)*W/r.width,py=(e.clientY-r.top)*H/r.height;return cards.findIndex((_,i)=>{const {x,y,w,h}=slot(i);return px>=x&&px<=x+w&&py>=y-35&&py<=y+h+60;});}
 canvas.onclick=e=>{const i=rankAt(e);if(i<0)return;if(selected&&pool.includes(selected))place(selected,i);else if(cards[i].image)select(cards[i]);else if(selected)place(selected,i);};
 dropTarget(canvas,()=>{});
 canvas.ondrop=e=>{e.preventDefault();canvas.classList.remove('drag-over');const card=dragged;dragged=null;const i=rankAt(e);if(card&&i>=0)place(card,i);};
 $('download').onclick=async()=>{
  if(!cards.some(c=>c.image)){status('Add at least one player card before downloading.',true);return;}
  setPending(1);try{await document.fonts.ready;draw();const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw Error('PNG export failed. Please try again.');const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='FC-VOLT-do-not-claim-top10.png';link.click();setTimeout(()=>URL.revokeObjectURL(url),60000);status('Downloaded 1080 × 1240 PNG.');}catch(e){status(e.message,true);}finally{setPending(-1);}
 };
 render();chooseScene(0);
})();
