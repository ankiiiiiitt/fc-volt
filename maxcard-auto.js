/* Automatic, layout-validated compositing. Full screenshots never leave the browser. */
(() => {
  'use strict';
  const $=id=>document.getElementById(id),L=MaxCardLayout,C=MaxCardCore;
  const images={base:null,render:null},urls={},canvases={};let basePixels=null;let busy=false,outputURL=null,detected=null,draft=null;
  const makeCanvas=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
  function message(text,error=false,progress){$('status').textContent=text;$('status').classList.toggle('error',error);if(progress!==undefined)$('progress').value=progress;}
  function resetResult(){$('review').hidden=true;draft=null;if(outputURL)URL.revokeObjectURL(outputURL);outputURL=null;detected=null;$('result').hidden=true;$('retry').hidden=true;}
  async function upload(kind,file){
    if(busy||!file)return;
    resetResult();
    try{
      if(!file||!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>15*1024*1024)throw Error('Choose a PNG, JPG or WebP image up to 15 MB.');
      const image=await createImageBitmap(file);
      if(image.width*image.height>12000000||image.width<300||image.height<300||Math.max(image.width,image.height)>8192){image.close();throw Error('Use a full screenshot, at least 300 px per edge and at most 12 megapixels.');}
      // Snapshot the original only once. PNG uploads use file bytes directly,
      // avoiding privacy-randomized canvas pixels and preserving their ICC profile.
      let decoded=null;
      if(kind==='base'&&file.type==='image/png'){
        try{decoded=await MaxCardPNG.decode(await file.arrayBuffer());}catch(e){if(e.code!=='UNSUPPORTED_PNG'){image.close();throw e;}}
      }
      const c=makeCanvas(image.width,image.height),cg=c.getContext('2d',{willReadFrequently:true});
      if(decoded){if(decoded.width!==image.width||decoded.height!==image.height){image.close();throw Error('PNG orientation or dimensions do not match the profile screenshot.');}cg.putImageData(new ImageData(decoded.data,decoded.width,decoded.height),0,0);}
      else cg.drawImage(image,0,0);
      if(kind==='base')basePixels=decoded||{width:image.width,height:image.height,data:cg.getImageData(0,0,image.width,image.height).data,metadata:[]};
      images[kind]?.close();images[kind]=image;canvases[kind]=c;
      if(urls[kind])URL.revokeObjectURL(urls[kind]);urls[kind]=URL.createObjectURL(file);$(kind+'Thumb').src=urls[kind];$(kind+'Thumb').hidden=false;$(kind+'Info').textContent=`${image.width} × ${image.height} · Added`;
      resetResult();
      if(images.base&&images.render)await run();else message('Image added. Add the other screenshot to generate automatically.');
    }catch(e){message(e.message,true);}
  }
  for(const kind of ['base','render']){
    $(kind+'File').onchange=e=>upload(kind,e.target.files[0]);const d=$(kind+'Drop');
    d.ondragover=e=>{e.preventDefault();d.classList.add('drag');};d.ondragleave=()=>d.classList.remove('drag');
    d.ondrop=e=>{e.preventDefault();d.classList.remove('drag');upload(kind,e.dataTransfer.files[0]);};
  }
  function crop(canvas,r,kind='plain',factor=2,pad=0){
    const x=Math.round(r.x*canvas.width),y=Math.round(r.y*canvas.height),w=Math.round(r.w*canvas.width),h=Math.round(r.h*canvas.height);
    const c=makeCanvas(w*factor,h*factor),g=c.getContext('2d',{willReadFrequently:true});g.fillStyle='white';g.fillRect(0,0,c.width,c.height);g.drawImage(canvas,x,y,w,h,0,0,c.width,c.height);
    if(kind!=='plain'){
      const data=g.getImageData(0,0,c.width,c.height);
      for(let p=0;p<data.data.length;p+=4){const [red,green,blue]=data.data.slice(p,p+3);const ink=kind==='invert'?(red*.299+green*.587+blue*.114)>100:kind==='green'?green>75&&green>blue*1.05&&(green>red*1.2||(red>170&&green>120&&blue<100)):red>160&&green>160&&blue>160;const v=ink?0:255;data.data[p]=data.data[p+1]=data.data[p+2]=v;data.data[p+3]=255;}g.putImageData(data,0,0);
    }
    if(!pad)return c;const padded=makeCanvas(c.width+pad*2,c.height+pad*2),pg=padded.getContext('2d');pg.fillStyle='white';pg.fillRect(0,0,padded.width,padded.height);pg.drawImage(c,pad,pad);return padded;
  }
  let enginePromise;
  function loadEngine(){
    if(window.Tesseract)return Promise.resolve();if(enginePromise)return enginePromise;
    enginePromise=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';const timer=setTimeout(()=>reject(Error('OCR download timed out. Check your connection and try again.')),30000);s.onload=()=>{clearTimeout(timer);resolve();};s.onerror=()=>{clearTimeout(timer);enginePromise=null;reject(Error('Could not load OCR. Check your connection and try again.'));};document.head.append(s);});return enginePromise;
  }
  async function read(worker,canvas,r,kind='plain',numeric=false){
    await worker.setParameters({tessedit_pageseg_mode:numeric?'7':'6',tessedit_char_whitelist:numeric?'0123456789':''});
    const initial=crop(canvas,r,kind,numeric?3:2);
    let result=(await worker.recognize(initial)).data;if(numeric)result.text=result.text.replace(/[Il|]/g,'1').replace(/[Ss]/g,'5').replace(/[Oo]/g,'0');
    if(!numeric||(/^\d{1,3}$/.test(result.text.trim())&&result.confidence>=65&&(kind==='white'||result.text.trim().length>1)))return result;
    if(numeric&&kind!=='white'){
      // A condensed leading 1 can touch its neighbour and disappear from OCR.
      // Identify its full-height straight stem, then OCR the remaining suffix.
      const mask=crop(canvas,r,'green',3),mg=mask.getContext('2d'),d=mg.getImageData(0,0,mask.width,mask.height).data;
      let top=mask.height,bottom=-1,left=mask.width,right=-1;
      for(let y=0;y<mask.height;y++)for(let x=0;x<mask.width;x++)if(d[(y*mask.width+x)*4]<100){top=Math.min(top,y);bottom=Math.max(bottom,y);left=Math.min(left,x);right=Math.max(right,x);}
      const height=bottom-top+1;let count=0,start=left;
      while(count<2&&right-start>height*.65){
        const columns=[];for(let x=start;x<=Math.min(right,start+height*.5);x++){let n=0;for(let y=top;y<=bottom;y++)if(d[(y*mask.width+x)*4]<100)n++;columns.push(n);}
        const stem=columns.findIndex(n=>n>height*.9);if(stem<0||stem>height*.35)break;
        let end=stem;while(end+1<columns.length&&columns[end+1]>height*.9)end++;
        if(end-stem<height*.07)break;
        start+=end+2;while(start<=right){let n=0;for(let y=top;y<=bottom;y++)if(d[(y*mask.width+start)*4]<100)n++;if(n)break;start++;}count++;
      }
      if(count&&right-start>height*.3){
        const suffix=makeCanvas(right-start+41,height+40),sg=suffix.getContext('2d');sg.fillStyle='white';sg.fillRect(0,0,suffix.width,suffix.height);sg.drawImage(mask,start,top,right-start+1,height,20,20,right-start+1,height);
        for(const mode of ['7','8','13']){await worker.setParameters({tessedit_pageseg_mode:mode,tessedit_char_whitelist:'0123456789'});const v=(await worker.recognize(suffix)).data;if(/^\d{1,2}$/.test(v.text.trim())&&v.confidence>=65&&count+v.text.trim().length<=3)return {text:'1'.repeat(count)+v.text.trim(),confidence:v.confidence};}
      }
    }
    if(numeric){
      // Thin touching glyph edges before retrying tightly kerned numeric words.
      const mask=crop(canvas,r,'green',3,20),mg=mask.getContext('2d'),raw=mg.getImageData(0,0,mask.width,mask.height);
      for(const radius of [4,6]){
        const thin=makeCanvas(mask.width,mask.height),tg=thin.getContext('2d'),pixels=tg.createImageData(mask.width,mask.height);pixels.data.fill(255);
        for(let y=radius;y<mask.height-radius;y++)for(let x=radius;x<mask.width-radius;x++){
          const at=(y*mask.width+x)*4;
          if(raw.data[at]<100&&raw.data[at-radius*4]<100&&raw.data[at+radius*4]<100&&raw.data[at-radius*mask.width*4]<100&&raw.data[at+radius*mask.width*4]<100)pixels.data[at]=pixels.data[at+1]=pixels.data[at+2]=0;
        }
        tg.putImageData(pixels,0,0);
        for(const mode of ['7','8','13']){await worker.setParameters({tessedit_pageseg_mode:mode,tessedit_char_whitelist:'0123456789'});const v=(await worker.recognize(thin)).data;if(/^\d{1,3}$/.test(v.text.trim())&&v.confidence>=65)return v;}
      }
    }
    // A tightly kerned RenderZ number can be treated as a word rather than a
    // line. Retry OCR segmentation/preprocessing; never substitute a stat value.
    for(const [mode,factor,variant]of [...new Set([kind,'plain','green','invert'])].flatMap(v=>[['8',3,v],['13',3,v],['7',6,v],['8',6,v],['13',6,v]])){
      await worker.setParameters({tessedit_pageseg_mode:mode,tessedit_char_whitelist:''});
      const candidate=(await worker.recognize(crop(canvas,r,variant,factor,20))).data;candidate.text=candidate.text.replace(/[Il|]/g,'1').replace(/[Ss]/g,'5').replace(/[Oo]/g,'0');
      if(/^\d{1,3}$/.test(candidate.text.trim())&&candidate.confidence>=65)return candidate;
      if(candidate.confidence>result.confidence)result=candidate;
    }
    return result;
  }
  async function readSkillDigit(worker,canvas,region){
    // Keep the LVL prefix as context: tiny isolated digits can be rejected by OCR.
    for(const factor of [4,6]){
      await worker.setParameters({tessedit_pageseg_mode:'7',tessedit_char_whitelist:'LVL123Il'});
      const badge=(await worker.recognize(crop(canvas,{x:region.x+region.w*.32,y:region.y,w:region.w*.55,h:region.h},'white',factor,20))).data;
      const match=badge.text.replace(/\s/g,'').match(/^LVL([123Il])$/);
      if(match&&badge.confidence>=65)return {text:/[Il]/.test(match[1])?'1':match[1],confidence:badge.confidence};
    }

    const source=crop(canvas,region,'white',3,20),g=source.getContext('2d'),pixels=g.getImageData(0,0,source.width,source.height).data;
    const width=source.width,height=source.height,seen=new Uint8Array(width*height),components=[];
    for(let index=0;index<seen.length;index++){
      if(seen[index]||pixels[index*4]>100)continue;
      let minX=width,minY=height,maxX=0,maxY=0;const stack=[index];seen[index]=1;
      while(stack.length){const at=stack.pop(),x=at%width,y=Math.floor(at/width);minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);
        for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const xx=x+dx,yy=y+dy;if(xx<0||xx>=width||yy<0||yy>=height)continue;const next=yy*width+xx;if(!seen[next]&&pixels[next*4]<100){seen[next]=1;stack.push(next);}}
      }
      if(maxY-minY>(height-40)*.2&&maxX>width*.6)components.push({x:minX,y:minY,w:maxX-minX+1,h:maxY-minY+1});
    }
    const digit=components.sort((a,b)=>(b.x+b.w)-(a.x+a.w))[0];if(!digit)throw Error('A RenderZ skill level is not readable. Use a clearer export.');
    const isolated=makeCanvas(digit.w*3+40,digit.h*3+40),cg=isolated.getContext('2d');cg.fillStyle='white';cg.fillRect(0,0,isolated.width,isolated.height);cg.drawImage(source,digit.x,digit.y,digit.w,digit.h,20,20,digit.w*3,digit.h*3);
    let best={text:'',confidence:0};
    for(const mode of ['10','7','8','13']){await worker.setParameters({tessedit_pageseg_mode:mode,tessedit_char_whitelist:'123'});const value=(await worker.recognize(isolated)).data;if(/^[1-3]$/.test(value.text.trim())&&value.confidence>=65)return value;if(value.confidence>best.confidence)best=value;}
    return best;
  }
  const rzRect=r=>L.normalize(r,2048,2048);
  function prepareDraft(){
    const rz=canvases.render,transform=L.detectProfile(basePixels.data,canvases.base.width,canvases.base.height);
    if(rz.width<1600||rz.height<1600)throw Error('Use a full-resolution RenderZ export (at least 1600 × 1600).');
    if(Math.abs(rz.width/rz.height-1)>.025)throw Error('Use the full square RenderZ export.');
    return {transform,name:'',rankCount:5,allocation:Array(6).fill(null),skillNames:['Primary skill','Scoring','Passing','Dribbling','Defending','Physical'],warnings:[],...Object.fromEntries(C.fields.map(k=>[k,null]))};
  }
  async function analyze(worker,target){
    const base=canvases.base,rz=canvases.render,area=r=>L.map(r,target.transform);
    const safe=async(fn,fallback,label)=>{try{return await fn();}catch(e){target.warnings.push(label+' could not be read. Please check it below.');return fallback;}};
    const number=async(canvas,r,kind,min,max,label)=>{const v=await read(worker,canvas,r,kind,true);return L.readNumber(v.text,v.confidence,min,max,label);};
    message('Recognizing your player profile…',false,12);
    const baseOVR=await safe(()=>number(base,area(L.areas.cardOVR),'white',1,195,'Base OVR'),null,'Base OVR');
    const baseName=await safe(()=>read(worker,base,area([780,76,1350,118])),{text:''},'Base name');
    const targetName=await safe(()=>read(worker,rz,rzRect(L.renderz.name)),{text:''},'RenderZ name');
    target.name=(baseName.text||targetName.text).trim().replace(/\s+/g,' ');
    target.baseName=baseName.text.trim();target.renderName=targetName.text.trim();
    if(!L.samePlayer(baseName.text,targetName.text))target.warnings.push('Player names did not match automatically. Check that these screenshots belong to the same player before generating.');
    let i=0;
    for(const key of C.fields){
      message('Reading RenderZ '+key+'…',false,22+i++*5);
      const [x,y,w,h]=L.renderz[key],isOVR=key==='ovr';
      target[key]=await safe(()=>number(rz,rzRect(isOVR?L.renderz[key]:[x-12,y-14,w+24,h+24]),isOVR?'white':'plain',1,isOVR?200:999,key),null,key.toUpperCase());
    }
    if(baseOVR&&target.ovr&&target.ovr!==baseOVR+5&&target.ovr!==baseOVR+6)target.warnings.push('The detected OVR is not base OVR +5 or +6. Check the target OVR.');
    message('Reading skill allocation…',false,62);
    for(let index=0;index<6;index++){
      const r=rzRect([850+203.5*index,354,95,36]),c=crop(rz,r,'plain',1),data=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
      let teal=0;for(let p=0;p<data.length;p+=4)if(data[p]<70&&data[p+1]>115&&data[p+2]>60&&data[p+1]>data[p]*1.8)teal++;
      if(teal/(data.length/4)<.22){target.allocation[index]=0;continue;}
      target.allocation[index]=await safe(async()=>{const v=await readSkillDigit(worker,rz,r);return L.readNumber(v.text,v.confidence,1,3,'Skill level');},null,'Skill '+(index+1));
    }
    const category=await safe(()=>read(worker,rz,rzRect([770,458,175,42]),'invert'),{text:'',confidence:0},'Primary skill label');
    const categoryName=category.text.replace(/[^A-Za-z -]/g,'').trim();
    if(category.confidence>=65&&categoryName.length>=3)target.skillNames[0]=categoryName;
    target.rankCount=target.allocation.reduce((a,b)=>a+(b||0),0)===6?6:5;
    if(target.allocation.some(n=>n===null)||![5,6].includes(target.allocation.reduce((a,b)=>a+(b||0),0)))target.warnings.push('Check the skill allocation. The total must be five or six points.');
    return target;
  }
  function showReview(target){
    draft=target;$('review').hidden=false;
    $('reviewWarnings').replaceChildren();target.warnings.forEach(text=>{const p=document.createElement('p');p.textContent=text;$('reviewWarnings').append(p);});
    $('reviewNames').textContent=target.baseName||target.renderName?`Base: ${target.baseName||'Not read'} · RenderZ: ${target.renderName||'Not read'}`:'';
    $('reviewName').value=target.name;$('reviewRankCount').value=target.rankCount||5;
    $('reviewStats').replaceChildren();$('reviewSkills').replaceChildren();
    for(const key of C.fields){const label=document.createElement('label');label.textContent=key.toUpperCase();const input=document.createElement('input');input.id='edit-'+key;input.type='number';input.min=1;input.max=key==='ovr'?200:999;input.step=1;input.required=true;input.value=target[key]??'';label.append(input);$('reviewStats').append(label);}
    target.skillNames.forEach((name,i)=>{const label=document.createElement('label');label.textContent=name;const input=document.createElement('input');input.id='edit-skill-'+i;input.type='number';input.min=0;input.max=3;input.step=1;input.required=true;input.value=target.allocation[i]??'';label.append(input);$('reviewSkills').append(label);});
    $('reviewError').textContent='';updateSkillTotal();
  }
  function updateSkillTotal(){const inputs=[...$('reviewSkills').querySelectorAll('input')],sum=inputs.reduce((a,b)=>a+(+b.value||0),0);$('skillTotal').textContent=`${sum} / ${$('reviewRankCount').value} skill points`;$('skillTotal').classList.toggle('review-invalid',sum!==+$('reviewRankCount').value||inputs.some(n=>n.value===''));}
  function reviewedTarget(){
    const target={...draft,name:$('reviewName').value.trim(),rankCount:+$('reviewRankCount').value,allocation:[]};
    for(const key of C.fields)target[key]=Number($('edit-'+key).value);
    for(let i=0;i<6;i++)target.allocation.push(Number($('edit-skill-'+i).value));
    // Manual review replaces uncertain OCR comparisons; retain numeric and allocation validation.
    if(target.allocation.reduce((a,b)=>a+b,0)!==target.rankCount)throw Error('Skill points must total the selected rank level.');
    return L.validateTarget(target,target.ovr-target.rankCount);
  }
  $('reviewForm').oninput=()=>{
    updateSkillTotal();if(outputURL)URL.revokeObjectURL(outputURL);outputURL=null;detected=null;$('result').hidden=true;$('reviewError').textContent='';message('Values changed. Click Generate preview to apply them.');
  };
  $('reviewForm').onsubmit=async e=>{
    e.preventDefault();if(busy||!draft)return;
    try{const target=reviewedTarget();busy=true;$('reviewFields').disabled=true;$('baseFile').disabled=$('renderFile').disabled=true;message('Applying your values…',false,82);await document.fonts.ready;await present(target,performance.now());}
    catch(e){$('reviewError').textContent=e.message;}
    finally{busy=false;$('reviewFields').disabled=false;$('baseFile').disabled=$('renderFile').disabled=false;}
  };
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
    const source=canvases.base,w=source.width,h=source.height,out=makeCanvas(w,h),g=out.getContext('2d',{willReadFrequently:true}),original=basePixels,regions=L.regions(target.allocation,target.transform);
    g.putImageData(new ImageData(new Uint8ClampedArray(original.data),w,h),0,0);
    const [badge,diamond]=await Promise.all([loadAsset('assets/maxcard/level30.png'),loadAsset('assets/maxcard/rank-orange.png')]);
    for(const id of ['cardOVR','panelOVR',...C.stats])bounded(g,regions[id],w,h,p=>{clearArea(source,out,regions[id]);writeNumber(g,target[id==='cardOVR'||id==='panelOVR'?'ovr':id],p,C.stats.includes(id)?'#00c72c':'#ffffff');});
    bounded(g,regions.training,w,h,p=>{clearArea(source,out,regions.training);writeNumber(g,'30/30',p,'#ffffff','Arial, sans-serif',400);});
    // Preserve the game's native training bar styling.
    bounded(g,regions.badge,w,h,p=>{g.drawImage(badge,p.x,p.y,p.w,p.h);});
    bounded(g,regions.rank,w,h,p=>{g.fillStyle='#111719';g.fillRect(p.x,p.y,p.w,p.h);const rankCount=target.rankCount||5,unit=p.w/6;for(let i=0;i<6;i++){g.save();if(i>=rankCount){g.globalAlpha=.4;g.filter='grayscale(1)';}g.drawImage(diamond,p.x+unit*i+(unit-p.h*.85)/2,p.y,p.h*.85,p.h);g.restore();}});
    for(const [id,label]of [['trainingControl','TRAINING'],['rankControl','RANK UP'],['editControl','EDIT']])bounded(g,regions[id],w,h,p=>button(g,p,label));
    target.allocation.forEach((points,index)=>{
      if(!points)return;bounded(g,regions['skill'+index],w,h,p=>{
        const r=rzRect([826+203.5*index,395,64,64]),sx=Math.round(r.x*canvases.render.width),sy=Math.round(r.y*canvases.render.height),sw=Math.round(r.w*canvases.render.width),sh=Math.round(r.h*canvases.render.height);
        const size=Math.min(p.w,p.h)*.88,x=p.x+(p.w-size)/2,y=p.y+(p.h-size)/2;g.save();g.beginPath();g.moveTo(x+size/2,y);g.lineTo(x+size,y+size/2);g.lineTo(x+size/2,y+size);g.lineTo(x,y+size/2);g.closePath();g.clip();g.drawImage(canvases.render,sx,sy,sw,sh,x,y,size,size);g.restore();
        const badge={x:p.x+p.w*.65,y:p.y+p.h*.65,w:p.w*.35,h:p.h*.32};g.fillStyle='#07090b';g.fillRect(badge.x,badge.y,badge.w,badge.h);writeNumber(g,points,badge,'#ffffff','Arial,sans-serif');
      });
    });
    // Assemble exact patches in CPU memory. Never read back a full output
    // canvas: privacy browsers may perturb those pixels independently per call.
    const patches=Object.values(regions).map(region=>{const p=C.rect(region,w,h);return {...p,data:g.getImageData(p.x,p.y,p.w,p.h).data};});
    const finalPixels=MaxCardPNG.commitPatches(original.data,w,h,patches);
    C.assertPreserved(original.data,finalPixels,w,h,Object.values(regions));
    const blob=await MaxCardPNG.encode({width:w,height:h,data:finalPixels,metadata:original.metadata});
    const decoded=await MaxCardPNG.decode(await blob.arrayBuffer());
    C.assertPreserved(original.data,decoded.data,w,h,Object.values(regions));
    return {blob,regions};
  }
  async function present(target,started){
    const {blob}=await composite(target);outputURL=URL.createObjectURL(blob);detected=target;
    $('before').src=urls.base;$('after').src=outputURL;$('compare').value=50;$('before').style.clipPath='inset(0 50% 0 0)';
    $('summary').textContent=`${target.name} · ${target.ovr} OVR · Training 30/30 · ${target.rankCount||5} ranks · Ready in ${((performance.now()-started)/1000).toFixed(1)}s`;
    $('verification').textContent=`Verified ${images.base.width} × ${images.base.height} PNG · 0 changed pixels outside the detected upgrade regions.`;
    $('detected').replaceChildren();const list=document.createElement('div');list.className='auto-readout';for(const k of C.fields){const item=document.createElement('div');item.textContent=k.toUpperCase();const n=document.createElement('strong');n.textContent=target[k];item.append(n);list.append(item);}$('detected').append(list);
    const skills=document.createElement('p');skills.className='muted';skills.textContent=target.allocation.map((n,i)=>n?`${target.skillNames[i]} +${n}`:'').filter(Boolean).join(' · ');$('detected').append(skills);
    $('result').hidden=false;message('Done. Your max card is ready to download.',false,100);$('result').scrollIntoView({behavior:'smooth',block:'start'});
  }
  async function run(){
    if(busy||!images.base||!images.render)return;busy=true;resetResult();$('baseFile').disabled=$('renderFile').disabled=true;$('progress').hidden=false;const started=performance.now();let worker;
    try{
      draft=prepareDraft();message('Loading automatic scanner…',false,3);await loadEngine();worker=await Tesseract.createWorker('eng');
      const target=await analyze(worker,draft);await worker.terminate();worker=null;showReview(target);
      if(target.warnings.length){message('Reading complete. Review the highlighted issues, then generate your preview.');$('review').scrollIntoView({behavior:'smooth',block:'start'});return;}
      message('Building your max card…',false,82);await document.fonts.ready;await present(target,started);
    }catch(e){if(draft){draft.warnings.push('Automatic reading stopped: '+e.message+' You can enter or correct values below.');showReview(draft);message('Review or enter the missing values below.');}else message(e.message,true);$('retry').hidden=false;}
    finally{if(worker)await worker.terminate();busy=false;$('baseFile').disabled=$('renderFile').disabled=false;$('progress').hidden=true;}
  }
  $('retry').onclick=run;
  $('editValues').onclick=()=>$('review').scrollIntoView({behavior:'smooth',block:'start'});
  $('download').onclick=()=>{if(!outputURL)return;const a=document.createElement('a');a.href=outputURL;a.download=(detected.name||'player').replace(/[^\p{L}\p{N}_-]+/gu,'-')+'-max-fan-preview.png';a.click();};
  $('compare').oninput=()=>{$('before').style.clipPath=`inset(0 ${100-$('compare').value}% 0 0)`;};
})();
