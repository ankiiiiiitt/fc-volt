/* FC-VOLT Max Card: no image is sent to a server. */
(() => {
  'use strict';
  const C = window.MaxCardCore, $ = id => document.getElementById(id);
  const source = $('source'), ctx = source.getContext('2d', { willReadFrequently: true });
  const overlay = $('overlay'), oc = overlay.getContext('2d');
  const assetCanvas = $('assetCanvas'), ac = assetCanvas.getContext('2d');
  const regions = {}, icons = {};
  let base = null, render = null, asset = null, mode = 'region', start = null, activeDrag = false;
  let outputURL = null, baseURL = null, busy = false, ocrBusy = false;
  let definitions = [], cropSelection = null, revision = 0, activeStep = 1;
  const cacheKey='fcvolt_maxcard_layout_v2';
  function showStep(step) {
    activeStep=step;
    for(let i=1;i<=3;i++){ $('step'+i).removeAttribute('aria-current'); $('step'+i).disabled=i===3&&$('download').disabled; }
    $('step'+step).setAttribute('aria-current','step');
    $('uploadStep').hidden=step!==1; $('reviewStep').hidden=step!==2; $('resultStep').hidden=step!==3;
  }
  function nextMissing() {return definitions.find(d=>d.required&&!regions[d.id]);}
  function guide() {
    const required=definitions.filter(d=>d.required),done=required.filter(d=>regions[d.id]).length;
    $('guideCount').textContent=`${done} / ${required.length}`;
    $('guideLabel').textContent=nextMissing()?.label||'All boxes ready. Review the green outlines below.';
    $('setupBadge').textContent=done===required.length?'Ready · layout remembered after generation':'One-time setup';
  }
  function advanceRegion() {const next=nextMissing();if(next)$('regionSelect').value=next.id;sync();}
  function restoreSavedLayout() {
    if(!base||Object.keys(regions).length)return;
    try {
      const saved=JSON.parse(localStorage.getItem(cacheKey)||'null');
      if(!saved||saved.version!==2||Math.abs(saved.aspect/(source.width/source.height)-1)>.01)return;
      const valid={};
      for(const [id,r] of Object.entries(saved.regions||{})){
        if(!fixed.some(d=>d[0]===id)&&!/^skill[0-9]+$/.test(id))continue;
        C.rect(r,source.width,source.height);if(r.patch)C.rect(r.patch,source.width,source.height);
        if(!/^#[0-9a-f]{6}$/i.test(r.fg)||!/^#[0-9a-f]{6}$/i.test(r.bg)||!['Arial','Teko','Inter','sans-serif'].includes(r.font)||!Number.isFinite(r.fontSize)||r.fontSize<10||r.fontSize>100)return;
        valid[id]={x:r.x,y:r.y,w:r.w,h:r.h,fg:r.fg,bg:r.bg,font:r.font,fontSize:r.fontSize,patch:r.patch?{x:r.patch.x,y:r.patch.y,w:r.patch.w,h:r.patch.h}:null};
      }
      Object.assign(regions,valid);$('calibration').open=true;$('setupBadge').textContent='Saved layout · check boxes';
    }catch{}
  }
  function saveLayout() {
    try{const saved={};for(const d of definitions)if(regions[d.id]&&d.type!=='icon'&&d.id!=='position')saved[d.id]=regions[d.id];localStorage.setItem(cacheKey,JSON.stringify({version:2,aspect:source.width/source.height,regions:saved}));}catch{}
  }
  const labels = {ovr:'Target OVR', pacing:'Pacing', shooting:'Shooting', passing:'Passing', dribbling:'Dribbling', defending:'Defending', physical:'Physical'};
  const fixed = [ ['cardOVR','Card OVR','text','ovr'], ['panelOVR','Stats-panel OVR','text','ovr'], ...C.stats.map(s=>[s,labels[s],'text',s]), ['training','Training 30/30','text','training'], ['bar','Training progress bar','bar'], ['badge','Orange level 30 badge','badge'], ['rank','Six orange rank diamonds','rank'], ['trainingControl','Active training control','control','TRAINING'], ['rankControl','Active rank-up control','control','RANK UP'] ];
  function status(message, error=false) { $('status').textContent = message; $('status').classList.toggle('error', error); }
  function invalidate() {
    revision++;
    $('download').disabled = true;
    $('comparison').hidden = true;
    $('step3').disabled=true;
    $('verification').textContent = 'Settings changed. Generate again to verify and export.';
    if(outputURL) { URL.revokeObjectURL(outputURL); outputURL=null; }
  }
  function dirty() { invalidate(); $('masksConfirmed').checked=false; }
  function skills() {
    return $('skills').value.split('\n').map(s=>s.trim()).filter(Boolean).map(s=>{
      const m = s.match(/^(.+?)\s*\+\s*([1-5])$/);
      return m ? {name:m[1].trim(),points:+m[2]} : {name:s,points:NaN};
    });
  }
  function values() { return {...Object.fromEntries(C.fields.map(k=>[k,$(k).value])), name:$('name').value, position:$('position').value, skills:skills()}; }
  function rebuild() {
    const selected = $('regionSelect').value;
    definitions = fixed.map(([id,label,type,key])=>({id,label,type,key,required:true}));
    if($('alternate').checked) definitions.push({id:'position',label:'Confirmed alternate position',type:'text',key:'position',required:true});
    skills().forEach((s,i)=>{
      definitions.push({id:`skill${i}`,label:`Skill ${i+1}: ${s.name} points`,type:'skill',index:i,required:true});
      definitions.push({id:`icon${i}`,label:`Skill ${i+1}: ${s.name} icon (optional)`,type:'icon',index:i,required:false});
    });
    $('regionSelect').replaceChildren(...definitions.map(d=>new Option(d.label,d.id)));
    if(definitions.some(d=>d.id===selected)) $('regionSelect').value=selected;
    restoreSavedLayout();sync();
  }
  function current() { return $('regionSelect').value; }
  function sync() {
    const r=regions[current()];
    for(const [id,k] of [['rx','x'],['ry','y'],['rw','w'],['rh','h']]) $(id).value = r ? +(r[k]*100).toFixed(3) : '';
    $('fg').value=r?.fg||'#ffffff'; $('bg').value=r?.bg||'#16202b'; $('fontSize').value=r?.fontSize||78; $('font').value=r?.font||'Arial';
    mode='region'; drawOverlay();guide();
    const count=definitions.filter(d=>regions[d.id]).length;
    $('regionStatus').textContent=`${count} regions marked. ${r ? 'Selected: '+(r.patch?'clean patch background':'solid background')+'.' : 'Drag on the source to mark this region.'} Orange outlines show the selected region.`;
  }
  function drawOverlay(preview) {
    oc.clearRect(0,0,overlay.width,overlay.height);
    for(const d of definitions) {
      const r=regions[d.id]; if(!r) continue;
      oc.strokeStyle=d.id===current()?'#ffaa36':'#00ff88'; oc.lineWidth=Math.max(1,source.width/800);
      oc.fillStyle=d.id===current()?'#ff990022':'#00ff8811';
      oc.fillRect(r.x*source.width,r.y*source.height,r.w*source.width,r.h*source.height);
      oc.strokeRect(r.x*source.width,r.y*source.height,r.w*source.width,r.h*source.height);
    }
    if(preview) { oc.strokeStyle='#00c8ff';oc.strokeRect(preview.x*source.width,preview.y*source.height,preview.w*source.width,preview.h*source.height); }
  }
  function point(e,canvas) { const r=canvas.getBoundingClientRect();return {x:Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),y:Math.max(0,Math.min(1,(e.clientY-r.top)/r.height))}; }
  function between(a,b) { return {x:Math.min(a.x,b.x),y:Math.min(a.y,b.y),w:Math.abs(b.x-a.x),h:Math.abs(b.y-a.y)}; }
  async function decode(file) {
    if(!file || !['image/png','image/jpeg','image/webp'].includes(file.type)) throw Error('Choose a PNG, JPEG or WebP image.');
    if(file.size>15*1024*1024) throw Error('Image exceeds the 15 MB limit.');
    const image=await createImageBitmap(file);
    if(image.width*image.height>12000000 || image.width<32 || image.height<32 || Math.max(image.width,image.height)>8192) {image.close();throw Error('Use an image between 32 px and 8192 px, at most 12 megapixels.');}
    return image;
  }
  async function upload(kind,file) {
    if(busy || (ocrBusy&&kind==='render')) return status('Wait for the current scan to finish.',true);
    try {
      const image=await decode(file);
      if(kind==='base') {
        base?.close();base=image;source.width=overlay.width=image.width;source.height=overlay.height=image.height;ctx.drawImage(image,0,0);
        Object.keys(regions).forEach(k=>delete regions[k]);Object.keys(icons).forEach(k=>delete icons[k]);
        if(baseURL) URL.revokeObjectURL(baseURL);baseURL=URL.createObjectURL(file);
        $('baseThumb').src=baseURL;$('baseThumb').hidden=false;$('baseInfo').textContent=`${image.width} × ${image.height} · Original resolution`;
        $('empty').hidden=true;dirty();restoreSavedLayout();sync();showStep(1);
      } else if(kind==='render') {
        render?.close();render=image;
        const old=$('renderThumb').dataset.url;if(old) URL.revokeObjectURL(old);
        const url=URL.createObjectURL(file);$('renderThumb').dataset.url=url;$('renderThumb').src=url;$('renderThumb').hidden=false;
        $('renderInfo').textContent=`${image.width} × ${image.height} · Ready for OCR`;$('extract').disabled=false;
        $('confirmed').checked=false;
        // Crops are frozen ImageData; clear them when the supporting screenshot changes.
        Object.keys(icons).forEach(k=>delete icons[k]);dirty();
      } else { asset?.close();asset=image; }
      status(kind==='base'?'Base added. Upload RenderZ or continue with manual stats.':kind==='render'?'RenderZ added. Reading your stats…':'Icon sheet added.');
      if(kind==='render')$('extract').click();
    } catch(e) {status(e.message,true);}
  }
  for(const kind of ['base','render']) {
    $(kind+'File').onchange=e=>upload(kind,e.target.files[0]);
    const drop=$(kind+'Drop');drop.ondragover=e=>{e.preventDefault();drop.classList.add('drag');};drop.ondragleave=()=>drop.classList.remove('drag');
    drop.ondrop=e=>{e.preventDefault();drop.classList.remove('drag');upload(kind,e.dataTransfer.files[0]);};
  }
  $('assetFile').onchange=e=>upload('asset',e.target.files[0]);
  C.positions.forEach(p=>$('position').add(new Option(p,p)));
  for(const key of C.stats) {
    const label=document.createElement('label');label.textContent=labels[key];
    const input=document.createElement('input');input.id=key;input.type='number';input.min=1;input.max=999;input.required=true;label.append(input);$('fields').append(label);
  }
  $('statsForm').oninput=e=>{invalidate();if(e.target.id!=='confirmed') $('confirmed').checked=false;if(['skills','alternate'].includes(e.target.id)){dirty();rebuild();}};
  $('regionSelect').onchange=sync;
  $('removeRegion').onclick=()=>{delete regions[current()];delete icons[current()];dirty();sync();};
  for(const id of ['rx','ry','rw','rh','fg','bg','fontSize','font']) $(id).onchange=()=>{
    const r=regions[current()]||{};
    if(['rx','ry','rw','rh'].some(id=>$(id).value===''))return;
    const candidate={...r,x:+$('rx').value/100,y:+$('ry').value/100,w:+$('rw').value/100,h:+$('rh').value/100,fg:$('fg').value,bg:$('bg').value,fontSize:+$('fontSize').value,font:$('font').value};
    try {C.rect(candidate,source.width,source.height);if(candidate.fontSize<10||candidate.fontSize>100)throw Error('Text height must be 10–100%.');regions[current()]=candidate;dirty();sync();}catch(e){status(e.message,true);sync();}
  };
  overlay.onpointerdown=e=>{
    if(!base || busy)return;e.preventDefault();const p=point(e,overlay);
    if(mode==='sample') {
      const pixel=ctx.getImageData(Math.min(source.width-1,Math.floor(p.x*source.width)),Math.min(source.height-1,Math.floor(p.y*source.height)),1,1).data;
      const r=regions[current()];if(!r)return; r.bg='#'+[...pixel].slice(0,3).map(v=>v.toString(16).padStart(2,'0')).join('');delete r.patch;dirty();sync();return;
    }
    start=p;activeDrag=true;overlay.setPointerCapture(e.pointerId);
  };
  overlay.onpointermove=e=>{if(activeDrag)drawOverlay(between(start,point(e,overlay)));};
  overlay.onpointerup=e=>{
    if(!activeDrag)return;activeDrag=false;const r=between(start,point(e,overlay));
    try {
      C.rect(r,source.width,source.height);
      if(mode==='patch') {
        const target=regions[current()];const t=C.rect(target,source.width,source.height),p=C.rect(r,source.width,source.height);
        if(Math.abs((p.w/p.h)/(t.w/t.h)-1)>.05)throw Error('Use a patch with the same aspect ratio as the target (within 5%).');
        target.patch=r;
      } else regions[current()]={...regions[current()],...r,fg:$('fg').value,bg:$('bg').value,fontSize:+$('fontSize').value,font:$('font').value,patch:null};
      dirty();
      if(mode==='region') {
        const rr=regions[current()],p=C.rect(rr,source.width,source.height);
        // Sample just outside the box as a sensible flat-background default.
        const pixel=ctx.getImageData(Math.max(0,p.x-2),Math.max(0,p.y-2),1,1).data;
        rr.bg='#'+[...pixel].slice(0,3).map(v=>v.toString(16).padStart(2,'0')).join('');
        advanceRegion();
      }else sync();
    }catch(e){status(e.message,true);drawOverlay();}
  };
  overlay.onpointercancel=()=>{activeDrag=false;drawOverlay();};
  function requireRegion(nextMode,message) {if(!regions[current()])return status('Mark this edit region first.',true);mode=nextMode;status(message);}
  $('sample').onclick=()=>requireRegion('sample','Click a clean source pixel to sample the selected region background.');
  $('patch').onclick=()=>requireRegion('patch','Drag a clean background patch in the source screenshot.');
  $('solid').onclick=()=>{if(regions[current()]){delete regions[current()].patch;dirty();sync();}};
  $('cropIcon').onclick=()=>{
    if(!definitions.find(d=>d.id===current()&&d.type==='icon'))return status('Select a skill icon region first.',true);
    const image=$('assetSource').value==='render'?render:asset;
    if(!image)return status('Upload the selected icon source first.',true);
    if(!regions[current()])return status('Mark the destination icon region first.',true);
    assetCanvas.width=image.width;assetCanvas.height=image.height;ac.drawImage(image,0,0);assetCanvas.hidden=false;
    cropSelection={id:current()};status('Drag a tight crop over the approved skill icon below the source screenshot.');
  };
  let assetStart=null;
  assetCanvas.onpointerdown=e=>{if(!cropSelection)return;assetStart=point(e,assetCanvas);assetCanvas.setPointerCapture(e.pointerId);};
  assetCanvas.onpointerup=e=>{
    if(!cropSelection || !assetStart)return;
    try {const r=C.rect(between(assetStart,point(e,assetCanvas)),assetCanvas.width,assetCanvas.height);icons[cropSelection.id]=ac.getImageData(r.x,r.y,r.w,r.h);dirty();status('Approved icon crop saved for '+cropSelection.id+'.');cropSelection=null;assetCanvas.hidden=true;}catch(e){status(e.message,true);}assetStart=null;
  };
  function applyOCR(text,confidence) {
    const parsed=C.parseOCR(text);
    for(const key of [...C.fields,'name','position']) $(key).value=parsed[key]??'';
    $('skills').value=parsed.skills.map(s=>`${s.name} +${s.points}`).join('\n');
    $('alternate').checked=false;$('confirmed').checked=false;
    const missing=C.fields.filter(k=>parsed[k]===undefined);
    $('ocrNotes').textContent=`${Number.isFinite(confidence)?'Overall OCR confidence: '+Math.round(confidence)+'%. ':''}Every value is an unverified suggestion. ${missing.length?'Missing or ambiguous: '+missing.join(', ')+'. ':''}Player names without explicit labels and unrecognized skill layouts require manual entry.`;
    invalidate();rebuild();status('OCR suggestions loaded. Correct missing fields and confirm every value.');
  }
  function loadOCR() {
    if(window.Tesseract)return Promise.resolve();
    return new Promise((resolve,reject)=>{
      const script=document.createElement('script');script.src='https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
      const timer=setTimeout(()=>{script.remove();reject(Error('OCR download timed out. Use manual entry or try again.'));},30000);
      script.onload=()=>{clearTimeout(timer);resolve();};script.onerror=()=>{clearTimeout(timer);script.remove();reject(Error('OCR could not load. Check your connection or enter values manually.'));};document.head.append(script);
    });
  }
  $('extract').onclick=async()=>{
    if(!render||busy||ocrBusy)return;ocrBusy=true;$('extract').disabled=true;$('generate').disabled=true;$('progress').hidden=false;
    let worker;
    try {
      status('Loading local OCR engine…');await loadOCR();
      worker=await Tesseract.createWorker('eng',1,{logger:m=>{if(m.status){status(`OCR: ${m.status} — ${Math.round((m.progress||0)*100)}%`);$('progress').value=m.progress||0;}}});
      const temp=document.createElement('canvas');temp.width=render.width;temp.height=render.height;temp.getContext('2d').drawImage(render,0,0);
      const {data}=await worker.recognize(temp);$('ocrText').value=data.text;applyOCR(data.text,data.confidence);
    }catch(e){status('OCR failed: '+e.message+' Manual entry remains available.',true);}
    finally{if(worker)await worker.terminate();ocrBusy=false;$('extract').disabled=false;$('generate').disabled=false;$('progress').hidden=true;}
  };
  $('parse').onclick=()=>applyOCR($('ocrText').value);
  $('example').onclick=()=>{
    for(const [key,value] of Object.entries({name:'Gabriel Magalhães',ovr:127,position:'CB',pacing:179,shooting:137,passing:138,dribbling:158,defending:231,physical:222}))$(key).value=value;
    $('skills').value='Defender +2\nScoring +1\nDefending +1\nPhysical +1';$('alternate').checked=false;$('confirmed').checked=false;invalidate();rebuild();status('Gabriel example values loaded. These are test values, not extracted from your image.');
  };
  $('exportLayout').onclick=()=>{
    if(!base)return status('Upload a base image first.',true);
    downloadBlob(new Blob([JSON.stringify({version:1,aspect:source.width/source.height,regions},null,2)],{type:'application/json'}),'fcvolt-maxcard-layout.json');
  };
  $('layoutFile').onchange=async e=>{
    try {
      if(!base)throw Error('Upload a base screenshot before loading a layout.');const file=e.target.files[0];if(!file)return;if(file.size>100000)throw Error('Layout exceeds 100 KB.');
      const layout=JSON.parse(await file.text());
      if(layout.version!==1 || !Number.isFinite(layout.aspect)||Math.abs(layout.aspect/(source.width/source.height)-1)>.01)throw Error('Layout version or screenshot aspect ratio does not match.');
      if(!layout.regions || typeof layout.regions!=='object'||Array.isArray(layout.regions))throw Error('Invalid layout.');
      const approved={};
      for(const [id,r] of Object.entries(layout.regions)){
        if(!definitions.some(d=>d.id===id))continue;C.rect(r,source.width,source.height);
        if(!/^#[0-9a-f]{6}$/i.test(r.fg)||!/^#[0-9a-f]{6}$/i.test(r.bg)||!['Arial','Teko','Inter','sans-serif'].includes(r.font)||!Number.isFinite(r.fontSize)||r.fontSize<10||r.fontSize>100)throw Error('Invalid region styling.');
        if(r.patch)C.rect(r.patch,source.width,source.height);
        approved[id]={x:r.x,y:r.y,w:r.w,h:r.h,fg:r.fg,bg:r.bg,font:r.font,fontSize:r.fontSize,patch:r.patch?{x:r.patch.x,y:r.patch.y,w:r.patch.w,h:r.patch.h}:null};
      }
      Object.keys(regions).forEach(k=>delete regions[k]);Object.assign(regions,approved);Object.keys(icons).forEach(k=>delete icons[k]);dirty();sync();status('Layout loaded. Inspect all masks and reselect any approved icon crops.');
    }catch(e){status('Layout not loaded: '+e.message,true);}e.target.value='';
  };
  function text(g,text,r,color) {
    g.fillStyle=color;g.textAlign='center';g.textBaseline='middle';
    let size=r.h*Number(r.fontSize||78)/100;g.font=`700 ${size}px "${r.font||'Arial'}"`;
    while(g.measureText(String(text)).width>r.w*.95&&size>1){size--;g.font=`700 ${size}px "${r.font||'Arial'}"`;}
    g.fillText(String(text),r.x+r.w/2,r.y+r.h/2+r.h*.03);
  }
  function paint(g,d,region,v) {
    const p=C.rect(region,source.width,source.height),r={...p,font:region.font,fontSize:region.fontSize};
    g.save();g.beginPath();g.rect(r.x,r.y,r.w,r.h);g.clip();
    if(region.patch){const p=C.rect(region.patch,source.width,source.height);g.drawImage(source,p.x,p.y,p.w,p.h,r.x,r.y,r.w,r.h);}
    else{g.fillStyle=region.bg;g.fillRect(r.x,r.y,r.w,r.h);}
    if(d.type==='text')text(g,d.key==='training'?'30/30':v[d.key],r,region.fg);
    if(d.type==='skill')text(g,'+'+v.skills[d.index].points,r,region.fg);
    if(d.type==='bar'){g.fillStyle='#ff9b26';g.fillRect(r.x,r.y,r.w,r.h);}
    if(d.type==='badge'){g.fillStyle='#ed861b';g.fillRect(r.x,r.y,r.w,r.h);text(g,'30',r,'#ffffff');}
    if(d.type==='rank'){
      const rankCount=6;
      const unit=r.w/rankCount,rad=Math.min(unit*.38,r.h*.45);g.fillStyle='#ff9b26';
      for(let i=0;i<rankCount;i++){const x=r.x+unit*(i+.5),y=r.y+r.h/2;g.beginPath();g.moveTo(x,y-rad);g.lineTo(x+rad,y);g.lineTo(x,y+rad);g.lineTo(x-rad,y);g.closePath();g.fill();}
    }
    if(d.type==='control'){g.fillStyle='#f29626';g.fillRect(r.x,r.y,r.w,r.h);text(g,d.key,r,'#111821');}
    if(d.type==='icon'){
      const data=icons[d.id],tile=document.createElement('canvas');tile.width=data.width;tile.height=data.height;tile.getContext('2d').putImageData(data,0,0);
      // Keep the approved icon's proportions; no generative drawing.
      const scale=Math.min(r.w/data.width,r.h/data.height),w=data.width*scale,h=data.height*scale;
      g.drawImage(tile,r.x+(r.w-w)/2,r.y+(r.h-h)/2,w,h);
    }
    g.restore();
  }
  $('generate').onclick=async()=>{
    if(busy||ocrBusy)return;
    try {
      if(!base)throw Error('Upload an FC Mobile base screenshot first.');
      const v=C.validate(values());
      if(!$('confirmed').checked)throw Error('Review and confirm the target values first.');
      if($('alternate').checked&&!v.position)throw Error('Select the explicitly confirmed alternate position.');
      const missing=definitions.filter(d=>d.required&&!regions[d.id]);if(missing.length){showStep(2);$('calibration').open=true;advanceRegion();$('calibration').scrollIntoView({behavior:'smooth',block:'start'});throw Error('One-time setup: draw a box around '+missing[0].label+'. The next value appears automatically.');}
      if(!$('masksConfirmed').checked){showStep(2);$('calibration').open=true;$('calibration').scrollIntoView({behavior:'smooth',block:'start'});throw Error('Check the boxes on your screenshot, then tick the confirmation below it.');}
      for(const d of definitions.filter(d=>d.type==='icon'&&regions[d.id]))if(!icons[d.id])throw Error('Choose an approved crop for '+d.label+', or clear its region to preserve the original icon.');
      busy=true;$('generate').disabled=true;status('Compositing and verifying pixels…');invalidate();
      const generationRevision=revision;
      await document.fonts.ready;
      if(revision!==generationRevision)throw Error('Settings changed during generation. Generate again.');
      const out=document.createElement('canvas');out.width=source.width;out.height=source.height;const g=out.getContext('2d',{willReadFrequently:true});
      // putImageData prevents a second color-conversion/resampling pass of the source.
      const original=ctx.getImageData(0,0,source.width,source.height);g.putImageData(original,0,0);
      const edits=definitions.filter(d=>regions[d.id]);edits.forEach(d=>paint(g,d,regions[d.id],v));
      const pixels=g.getImageData(0,0,out.width,out.height);const report=C.assertPreserved(original.data,pixels.data,out.width,out.height,edits.map(d=>regions[d.id]));
      const blob=await new Promise(resolve=>out.toBlob(resolve,'image/png'));if(!blob)throw Error('PNG encoding failed. Try a smaller screenshot.');
      // Verify the encoded PNG too, not only the in-memory canvas.
      const encoded=await createImageBitmap(blob);const check=document.createElement('canvas');check.width=out.width;check.height=out.height;const cg=check.getContext('2d',{willReadFrequently:true});cg.drawImage(encoded,0,0);encoded.close();
      C.assertPreserved(original.data,cg.getImageData(0,0,out.width,out.height).data,out.width,out.height,edits.map(d=>regions[d.id]));
      if(revision!==generationRevision)throw Error('Settings changed during generation. Generate again.');
      outputURL=URL.createObjectURL(blob);$('after').src=outputURL;
      // Use the decoded source canvas for an exact visual comparison.
      $('before').src=source.toDataURL('image/png');$('comparison').hidden=false;$('download').disabled=false;saveLayout();showStep(3);$('resultStep').scrollIntoView({behavior:'smooth',block:'start'});
      $('verification').textContent=`Verified PNG: ${out.width} × ${out.height} · ${report.changed.toLocaleString()} changed pixels inside masks · 0 changed pixels outside masks. Review appearance before sharing.`;
      status('Max card preview ready. Compare it with the original, then download.');
    }catch(e){status(e.message,true);$('verification').textContent='No verified export available. '+e.message;}
    finally{busy=false;$('generate').disabled=false;}
  };
  function downloadBlob(blob,name){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),3000);}
  $('download').onclick=()=>{if(!outputURL)return;const a=document.createElement('a');a.href=outputURL;a.download=($('name').value||'player').replace(/[^\p{L}\p{N}_-]+/gu,'-')+'-max-fan-preview.png';a.click();};
  $('compare').oninput=()=>{$('before').style.clipPath=`inset(0 ${100-$('compare').value}% 0 0)`;};
  $('masksConfirmed').onchange=invalidate;
  $('continueReview').onclick=()=>{if(!base)return status('Add your FC Mobile screenshot first.',true);showStep(2);};
  $('manualEntry').onclick=()=>{if(!base)return status('Add your FC Mobile screenshot first.',true);showStep(2);};
  $('backUpload').onclick=()=>showStep(1);$('backReview').onclick=()=>showStep(2);
  $('step1').onclick=()=>showStep(1);
  $('step2').onclick=()=>{if(base)showStep(2);else status('Add your FC Mobile screenshot first.',true);};
  $('step3').onclick=()=>{if(!$('download').disabled)showStep(3);};
  $('nextRegion').onclick=advanceRegion;
  rebuild();showStep(1);
})();
