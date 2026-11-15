/* Automatic, layout-validated compositing. Full screenshots never leave the browser. */
(() => {
  'use strict';
  const $=id=>document.getElementById(id),L=MaxCardLayout,C=MaxCardCore;
  const images={base:null,render:null},urls={},canvases={};let busy=false,outputURL=null,detected=null;
  const makeCanvas=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
  function message(text,error=false,progress){$('status').textContent=text;$('status').classList.toggle('error',error);if(progress!==undefined)$('progress').value=progress;}
  function resetResult(){if(outputURL)URL.revokeObjectURL(outputURL);outputURL=null;detected=null;$('result').hidden=true;$('retry').hidden=true;}
  async function upload(kind,file){
    if(busy||!file)return;
    resetResult();
    try{
      if(!file||!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>15*1024*1024)throw Error('Choose a PNG, JPG or WebP image up to 15 MB.');
      const image=await createImageBitmap(file);
      if(image.width*image.height>12000000||image.width<300||image.height<300||Math.max(image.width,image.height)>8192){image.close();throw Error('Use a full screenshot, at least 300 px per edge and at most 12 megapixels.');}
      images[kind]?.close();images[kind]=image;
      if(urls[kind])URL.revokeObjectURL(urls[kind]);urls[kind]=URL.createObjectURL(file);$(kind+'Thumb').src=urls[kind];$(kind+'Thumb').hidden=false;$(kind+'Info').textContent=`${image.width} × ${image.height} · Added`;
      const c=makeCanvas(image.width,image.height);c.getContext('2d',{willReadFrequently:true}).drawImage(image,0,0);canvases[kind]=c;resetResult();
      if(images.base&&images.render)await run();else message('Image added. Add the other screenshot to generate automatically.');
    }catch(e){message(e.message,true);}
  }
  for(const kind of ['base','render']){
    $(kind+'File').onchange=e=>upload(kind,e.target.files[0]);const d=$(kind+'Drop');
    d.ondragover=e=>{e.preventDefault();d.classList.add('drag');};d.ondragleave=()=>d.classList.remove('drag');
    d.ondrop=e=>{e.preventDefault();d.classList.remove('drag');upload(kind,e.dataTransfer.files[0]);};
  }
  function crop(canvas,r,kind='plain',factor=2){
    const x=Math.round(r.x*canvas.width),y=Math.round(r.y*canvas.height),w=Math.round(r.w*canvas.width),h=Math.round(r.h*canvas.height);
    const c=makeCanvas(w*factor,h*factor),g=c.getContext('2d',{willReadFrequently:true});g.fillStyle='white';g.fillRect(0,0,c.width,c.height);g.drawImage(canvas,x,y,w,h,0,0,c.width,c.height);
    if(kind!=='plain'){
      const data=g.getImageData(0,0,c.width,c.height);
      for(let p=0;p<data.data.length;p+=4){const [red,green,blue]=data.data.slice(p,p+3);const ink=kind==='green'?green>75&&green>red*1.2&&green>blue*1.05:red>160&&green>160&&blue>160;const v=ink?0:255;data.data[p]=data.data[p+1]=data.data[p+2]=v;data.data[p+3]=255;}g.putImageData(data,0,0);
    }
    return c;
  }
  let enginePromise;
  function loadEngine(){
    if(window.Tesseract)return Promise.resolve();if(enginePromise)return enginePromise;
    enginePromise=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';const timer=setTimeout(()=>reject(Error('OCR download timed out. Check your connection and try again.')),30000);s.onload=()=>{clearTimeout(timer);resolve();};s.onerror=()=>{clearTimeout(timer);enginePromise=null;reject(Error('Could not load OCR. Check your connection and try again.'));};document.head.append(s);});return enginePromise;
  }
  async function read(worker,canvas,r,kind='plain',numeric=false){
    await worker.setParameters({tessedit_pageseg_mode:numeric?'7':'6',tessedit_char_whitelist:numeric?'0123456789':''});
    let result=(await worker.recognize(crop(canvas,r,kind,numeric?3:2))).data;
    if(!numeric||(/^\d{1,3}$/.test(result.text.trim())&&result.confidence>=65))return result;
    // A tightly kerned RenderZ number can be treated as a word rather than a
    // line. Retry OCR segmentation/preprocessing; never substitute a stat value.
    for(const [mode,factor,variant]of [['8',3,kind],['13',3,kind],['7',6,kind],['8',6,kind],['13',6,kind]]){
      await worker.setParameters({tessedit_pageseg_mode:mode,tessedit_char_whitelist:'0123456789'});
      const candidate=(await worker.recognize(crop(canvas,r,variant,factor))).data;
      if(/^\d{1,3}$/.test(candidate.text.trim())&&candidate.confidence>=65)return candidate;
      if(candidate.confidence>result.confidence)result=candidate;
    }
    return result;
  }
  async function readSkillDigit(worker,canvas,region){
    const source=crop(canvas,region,'white',3),g=source.getContext('2d'),pixels=g.getImageData(0,0,source.width,source.height).data;
    const width=source.width,height=source.height,seen=new Uint8Array(width*height),components=[];
    for(let index=0;index<seen.length;index++){
      if(seen[index]||pixels[index*4]>100)continue;
      let minX=width,minY=height,maxX=0,maxY=0;const stack=[index];seen[index]=1;
      while(stack.length){const at=stack.pop(),x=at%width,y=Math.floor(at/width);minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);
        for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const xx=x+dx,yy=y+dy;if(xx<0||xx>=width||yy<0||yy>=height)continue;const next=yy*width+xx;if(!seen[next]&&pixels[next*4]<100){seen[next]=1;stack.push(next);}}
      }
      if(maxY-minY>height*.25&&maxX>width*.6)components.push({x:minX,y:minY,w:maxX-minX+1,h:maxY-minY+1});
    }
    const digit=components.sort((a,b)=>(b.x+b.w)-(a.x+a.w))[0];if(!digit)throw Error('A RenderZ skill level is not readable. Use a clearer export.');
    const isolated=makeCanvas(digit.w*3+40,digit.h*3+40),cg=isolated.getContext('2d');cg.fillStyle='white';cg.fillRect(0,0,isolated.width,isolated.height);cg.drawImage(source,digit.x,digit.y,digit.w,digit.h,20,20,digit.w*3,digit.h*3);
    let best={text:'',confidence:0};
    for(const mode of ['10','7','8','13']){await worker.setParameters({tessedit_pageseg_mode:mode,tessedit_char_whitelist:'123'});const value=(await worker.recognize(isolated)).data;if(/^[1-3]$/.test(value.text.trim())&&value.confidence>=65)return value;if(value.confidence>best.confidence)best=value;}
    return best;
  }
  const rzRect=r=>L.normalize(r,2048,2048);
  async function analyze(worker){
    const base=canvases.base,rz=canvases.render;
    if(!L.sizeMatches(base.width,base.height))throw Error('Use the full landscape FC Mobile Player Profile layout. Cropped screenshots and other layouts are not supported yet.');
    if(rz.width<1600||rz.height<1600)throw Error('Use the full-resolution RenderZ export (at least 1600 × 1600). Small screenshots can lose a leading stat digit.');
    if(Math.abs(rz.width/rz.height-1)>.025)throw Error('Use the full square RenderZ export with all six attributes and skill levels visible.');
    message('Recognizing your player profile…',false,12);
    const stats=await read(worker,base,{x:.421,y:.446,w:.548,h:.046});
    const lower=await read(worker,base,{x:.28,y:.55,w:.695,h:.208});
    const skillsHeading=await read(worker,base,L.normalize([1798,899,220,66]),'white');
    L.checkAnchors(stats.text,lower.text+' '+skillsHeading.text);
    const baseOVRData=await read(worker,base,L.normalize(L.areas.cardOVR),'white',true);
    const baseOVR=L.readNumber(baseOVRData.text,baseOVRData.confidence,1,195,'Base OVR');
    const baseStats={};
    for(const key of C.stats){const value=await read(worker,base,L.normalize(L.areas[key]),'plain',true);baseStats[key]=L.readNumber(value.text,value.confidence,1,999,'Base '+key);}
    const baseName=await read(worker,base,{x:.28,y:.07,w:.26,h:.075});
    const targetName=await read(worker,rz,rzRect(L.renderz.name));
    if(!L.samePlayer(baseName.text,targetName.text))throw Error('The player names could not be matched. Upload the full base and RenderZ screenshots for the same player.');
    const target={name:baseName.text.trim().replace(/\s+/g,' '),allocation:[]};
    let i=0;
    for(const key of C.fields){
      message('Reading RenderZ '+key+'…',false,22+i*5);
      const value=await read(worker,rz,rzRect(L.renderz[key]),key==='ovr'?'white':'plain',true);
      target[key]=L.readNumber(value.text,value.confidence,1,key==='ovr'?200:999,key);i++;
    }
    message('Reading skill allocation…',false,62);
    for(let index=0;index<6;index++){
      const r=rzRect([850+203.5*index,354,95,36]),c=crop(rz,r,'plain',1),data=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
      let teal=0;for(let p=0;p<data.length;p+=4)if(data[p]<70&&data[p+1]>115&&data[p+2]>60&&data[p+1]>data[p]*1.8)teal++;
      if(teal/(data.length/4)<.22){target.allocation.push(0);continue;}
      const level=await readSkillDigit(worker,rz,r);
      target.allocation.push(L.readNumber(level.text,level.confidence,1,3,'Skill level'));
    }
    const category=await read(worker,rz,rzRect([780,462,155,35]));
    const categoryName=category.text.replace(/[^A-Za-z -]/g,'').trim();
    if(category.confidence<65||categoryName.length<3)throw Error('The first skill category could not be read. Use the full, clear RenderZ export.');
    target.skillNames=[categoryName,'Scoring','Passing','Dribbling','Defending','Physical'];
    return L.validateTarget(target,baseOVR,baseStats);
  }
  function clearArea(source,out,r){
    // The supported UI places clean background above and below each number.
    // Interpolate vertically so adjacent number strokes never smear across a row.
    const p=C.rect(r,source.width,source.height),s=source.getContext('2d',{willReadFrequently:true}),g=out.getContext('2d');
    const pixels=s.getImageData(p.x,p.y-2,p.w,p.h+4),fill=g.createImageData(p.w,p.h);
    for(let y=0;y<p.h;y++)for(let x=0;x<p.w;x++){
      const t=y/Math.max(1,p.h-1),offset=(y*p.w+x)*4;
      for(let channel=0;channel<3;channel++)fill.data[offset+channel]=Math.round(pixels.data[x*4+channel]*(1-t)+pixels.data[((p.h+3)*p.w+x)*4+channel]*t);
      fill.data[offset+3]=255;
    }
    g.putImageData(fill,p.x,p.y);return p;
  }
  function writeNumber(g,value,p,color,font='"Roboto Condensed", "Arial Narrow", Arial, sans-serif',weight=700,heightRatio=1.12){
    let size=p.h*heightRatio;g.font=`${weight} ${size}px ${font}`;
    while(g.measureText(String(value)).width>p.w*.96&&size>5){size--;g.font=`${weight} ${size}px ${font}`;}
    g.fillStyle=color;g.textAlign='center';g.textBaseline='middle';g.fillText(String(value),p.x+p.w/2,p.y+p.h*.53);
  }
  function bounded(g,r,w,h,fn){const p=C.rect(r,w,h);g.save();g.beginPath();g.rect(p.x,p.y,p.w,p.h);g.clip();fn(p);g.restore();}
  function rounded(g,p,radius){g.beginPath();g.roundRect(p.x,p.y,p.w,p.h,radius);}
  function button(g,p,label){
    const inset=2,q={x:p.x+inset,y:p.y+inset,w:p.w-inset*2,h:p.h-inset*2};rounded(g,q,q.h/2);
    const gradient=g.createLinearGradient(0,q.y,0,q.y+q.h);gradient.addColorStop(0,'#103a69');gradient.addColorStop(1,'#061a38');g.fillStyle=gradient;g.fill();g.strokeStyle='#00a8f5';g.lineWidth=Math.max(2,p.h*.045);g.stroke();
    writeNumber(g,label,{x:p.x+8,y:p.y+4,w:p.w-16,h:p.h-8},'#ffffff','Arial, sans-serif',500,.44);
  }
  async function loadAsset(path){const image=new Image();image.src=path;await image.decode();return image;}
  async function composite(target){
    const source=canvases.base,w=source.width,h=source.height,out=makeCanvas(w,h),g=out.getContext('2d',{willReadFrequently:true}),original=source.getContext('2d',{willReadFrequently:true}).getImageData(0,0,w,h),regions=L.regions(target.allocation);
    g.putImageData(original,0,0);
    const [badge,diamond]=await Promise.all([loadAsset('assets/maxcard/level30.png'),loadAsset('assets/maxcard/rank-orange.png')]);
    for(const id of ['cardOVR','panelOVR',...C.stats])bounded(g,regions[id],w,h,p=>{clearArea(source,out,regions[id]);writeNumber(g,target[id==='cardOVR'||id==='panelOVR'?'ovr':id],p,C.stats.includes(id)?'#00c72c':'#ffffff');});
    bounded(g,regions.training,w,h,p=>{clearArea(source,out,regions.training);writeNumber(g,'30/30',p,'#ffffff','Arial, sans-serif',400);});
    bounded(g,regions.bar,w,h,p=>{g.fillStyle='#f4f6f7';g.fillRect(p.x,p.y,p.w,p.h);});
    bounded(g,regions.badge,w,h,p=>{g.drawImage(badge,p.x,p.y,p.w,p.h);});
    bounded(g,regions.rank,w,h,p=>{g.fillStyle='#111719';g.fillRect(p.x,p.y,p.w,p.h);const unit=p.w/5;for(let i=0;i<5;i++)g.drawImage(diamond,p.x+unit*i+(unit-p.h*.85)/2,p.y,p.h*.85,p.h);});
    for(const [id,label]of [['trainingControl','TRAINING'],['rankControl','RANK UP'],['editControl','EDIT']])bounded(g,regions[id],w,h,p=>button(g,p,label));
    target.allocation.forEach((points,index)=>{
      if(!points)return;bounded(g,regions['skill'+index],w,h,p=>{
        const r=rzRect([826+203.5*index,395,64,64]),sx=Math.round(r.x*canvases.render.width),sy=Math.round(r.y*canvases.render.height),sw=Math.round(r.w*canvases.render.width),sh=Math.round(r.h*canvases.render.height);
        const size=p.w*.89,x=p.x+(p.w-size)/2,y=p.y+3;g.save();g.beginPath();g.moveTo(x+size/2,y);g.lineTo(x+size,y+size/2);g.lineTo(x+size/2,y+size);g.lineTo(x,y+size/2);g.closePath();g.clip();g.drawImage(canvases.render,sx,sy,sw,sh,x,y,size,size);g.restore();
        const badge={x:p.x+p.w*.75,y:p.y+p.h*.79,w:p.w*.24,h:p.h*.21};g.fillStyle='#07090b';g.fillRect(badge.x,badge.y,badge.w,badge.h);writeNumber(g,points,badge,'#ffffff','Arial,sans-serif');
      });
    });
    // Commit integer-aligned patches onto a fresh source copy. Canvas glyph/clip
    // antialiasing must never leak a fringe beyond an approved edit rectangle.
    const committed=makeCanvas(w,h),committedContext=committed.getContext('2d',{willReadFrequently:true});committedContext.putImageData(original,0,0);
    for(const region of Object.values(regions)){const p=C.rect(region,w,h);committedContext.putImageData(g.getImageData(p.x,p.y,p.w,p.h),p.x,p.y);}
    C.assertPreserved(original.data,committedContext.getImageData(0,0,w,h).data,w,h,Object.values(regions));
    const blob=await new Promise(r=>committed.toBlob(r,'image/png'));if(!blob)throw Error('PNG encoding failed. Please retry.');
    const decoded=await createImageBitmap(blob),verify=makeCanvas(w,h),v=verify.getContext('2d',{willReadFrequently:true});v.drawImage(decoded,0,0);decoded.close();
    C.assertPreserved(original.data,v.getImageData(0,0,w,h).data,w,h,Object.values(regions));
    return {blob,regions};
  }
  async function run(){
    if(busy||!images.base||!images.render)return;busy=true;resetResult();$('baseFile').disabled=$('renderFile').disabled=true;$('progress').hidden=false;const started=performance.now();let worker;
    try{
      message('Loading automatic scanner…',false,3);await loadEngine();worker=await Tesseract.createWorker('eng');
      const target=await analyze(worker);await worker.terminate();worker=null;message('Building your max card…',false,82);await document.fonts.ready;
      const {blob}=await composite(target);outputURL=URL.createObjectURL(blob);detected=target;
      $('before').src=urls.base;$('after').src=outputURL;$('compare').value=50;$('before').style.clipPath='inset(0 50% 0 0)';
      $('summary').textContent=`${target.name} · ${target.ovr} OVR · Training 30/30 · Five ranks · Ready in ${((performance.now()-started)/1000).toFixed(1)}s`;
      $('verification').textContent=`Verified ${images.base.width} × ${images.base.height} PNG · 0 changed pixels outside the detected upgrade regions.`;
      $('detected').replaceChildren();const list=document.createElement('div');list.className='auto-readout';for(const k of C.fields){const item=document.createElement('div');item.textContent=k.toUpperCase();const n=document.createElement('strong');n.textContent=target[k];item.append(n);list.append(item);}$('detected').append(list);
      const skills=document.createElement('p');skills.className='muted';skills.textContent=target.allocation.map((n,i)=>n?`${target.skillNames[i]} +${n}`:'').filter(Boolean).join(' · ');$('detected').append(skills);
      $('result').hidden=false;message('Done. Your max card is ready to download.',false,100);$('result').scrollIntoView({behavior:'smooth',block:'start'});
    }catch(e){message(e.message,true);$('retry').hidden=false;}
    finally{if(worker)await worker.terminate();busy=false;$('baseFile').disabled=$('renderFile').disabled=false;$('progress').hidden=true;}
  }
  $('retry').onclick=run;
  $('download').onclick=()=>{if(!outputURL)return;const a=document.createElement('a');a.href=outputURL;a.download=(detected.name||'player').replace(/[^\p{L}\p{N}_-]+/gu,'-')+'-max-fan-preview.png';a.click();};
  $('compare').oninput=()=>{$('before').style.clipPath=`inset(0 ${100-$('compare').value}% 0 0)`;};
})();
