/* Measured from the user's full landscape FC Mobile profile reference (2804×1276).
   Recognition validates the aspect ratio and the expected labels before any edit. */
(function(root){
  const reference={width:2804,height:1276};
  const normalize=([x,y,w,h],width=reference.width,height=reference.height)=>({x:x/width,y:y/height,w:w/width,h:h/height});
  const areas={
    cardOVR:[208,154,116,76],panelOVR:[880,495,190,119],
    pacing:[1199,433,152,88],shooting:[1462,433,152,88],passing:[1724,433,152,88],
    dribbling:[1987,433,152,88],defending:[2250,433,152,88],physical:[2512,433,152,88],
    training:[1215,716,133,62],bar:[828,807,511,11],badge:[356,610,83,91],
    rank:[1809,774,291,51],trainingControl:[1382,724,338,101],rankControl:[2361,724,338,101],editControl:[2361,1116,338,103]
  };
  const skills=['Defender','Scoring','Passing','Dribbling','Defending','Physical'];
  const renderz={
    ovr:[306,123,98,60],pacing:[791,633,104,65],shooting:[1196,633,104,65],passing:[1599,633,104,65],
    dribbling:[791,1214,104,65],defending:[1196,1214,104,65],physical:[1599,1214,104,65],
    name:[991,163,955,76],skills:[765,332,1199,190]
  };
  function detectProfile(data,width,height){
    const neon=(x,y)=>{const p=(y*width+x)*4,r=data[p],g=data[p+1],b=data[p+2];return Math.max(g,b)>130&&Math.max(r,g,b)-Math.min(r,g,b)>65&&(g>r*1.4||b>g*1.4||(r>150&&b>130&&g<r*.8));};
    const rows=[];
    for(let y=Math.floor(height*.18);y<height*.65;y++){let count=0;for(let x=Math.floor(width*.26);x<width*.99;x++)if(neon(x,y))count++;if(count>width*.35)rows.push(y);}
    const groups=[];for(const y of rows){if(!groups.length||y-groups.at(-1).at(-1)>3)groups.push([]);groups.at(-1).push(y);}
    for(let i=0;i<groups.length;i++)for(let j=i+1;j<groups.length;j++){
      const top=groups[i][0],bottom=groups[j].at(-1),ph=bottom-top;if(ph<height*.12||ph>height*.35)continue;
      const columns=[];for(let x=Math.floor(width*.26);x<width*.99;x++){let n=0;for(let y=top+10;y<bottom-10;y++)if(neon(x,y))n++;if(n>(ph-20)*.75)columns.push(x);}
      if(!columns.length)continue;const left=columns[0],right=columns.at(-1),sx=(right-left)/1940,sy=ph/316;
      if(Math.abs(sx/sy-1)>.035)continue;
      return {sx,sy,dx:left-790*sx,dy:top-358*sy,width,height};
    }
    throw Error('Could not locate the full player stats panel. Keep the card, all six stats, training and skills visible.');
  }
  function map(r,t){return t?normalize([r[0]*t.sx+t.dx,r[1]*t.sy+t.dy,r[2]*t.sx,r[3]*t.sy],t.width,t.height):normalize(r);}
  function regions(allocation,transform){
    const result=Object.fromEntries(Object.entries(areas).map(([id,r])=>[id,map(r,transform)]));
    allocation.forEach((points,i)=>{if(points>0)result['skill'+i]=map([1808+130*i,978,124,139],transform);});
    return result;
  }
  function sizeMatches(w,h){return Math.abs((w/h)/(reference.width/reference.height)-1)<.015;}
  function checkAnchors(statsText,lowerText){
    const compact=s=>s.toUpperCase().replace(/[^A-Z]/g,'');const a=compact(statsText),b=compact(lowerText);
    if(!['PACING','SHOOTING','PASSING','DRIBBLING','DEFENDING','PHYSICAL'].every(k=>a.includes(k)))throw Error('This base screenshot layout was not recognized. Use a clear, full landscape Player Profile screenshot.');
    if(!['TRAINING','RANKUP','PLAYSTYLES','SKILLS'].every(k=>b.includes(k)))throw Error('Training, rank and skill sections must be visible in the base screenshot.');
  }
  function readNumber(text,confidence,min,max,label){
    const raw=text.trim();
    if(confidence<45||!/^\d{1,3}$/.test(raw)||+raw<min||+raw>max)throw Error(`${label} could not be read reliably. Upload a clearer ${label.startsWith('Base')?'base':'RenderZ'} screenshot.`);
    return +raw;
  }
  function validateTarget(values,baseOVR,baseStats){
    for(const key of ['ovr','pacing','shooting','passing','dribbling','defending','physical'])if(!Number.isInteger(values[key])||values[key]<1||values[key]>(key==='ovr'?200:999))throw Error('RenderZ is missing a reliable '+key+' value.');
    if(baseStats)for(const key of ['pacing','shooting','passing','dribbling','defending','physical'])if(!Number.isInteger(baseStats[key])||values[key]<baseStats[key])throw Error('A target stat is lower than the base card. Use matching full-resolution screenshots.');
    if(values.ovr!==baseOVR+5&&values.ovr!==baseOVR+6)throw Error('Use an unranked base card and a matching five or six rank RenderZ screenshot (target OVR must be base OVR +5 or +6).');
    const skillSum=Array.isArray(values.allocation)?values.allocation.reduce((a,b)=>a+b,0):0;
    if(!Array.isArray(values.allocation)||values.allocation.length!==6||values.allocation.some(n=>!Number.isInteger(n)||n<0||n>3)||(skillSum!==5&&skillSum!==6))throw Error('RenderZ must show a valid five or six point skill allocation.');
    values.rankCount = (values.ovr === baseOVR + 5 && skillSum === 5) ? 5 : 6;
    return values;
  }
  function samePlayer(baseName,targetName){
    const tokens=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().match(/[A-Z]{3,}/g)||[];
    const a=tokens(baseName),b=tokens(targetName);return a.length>0&&a.some(t=>b.includes(t));
  }
  const api={reference,normalize,map,detectProfile,areas,renderz,skills,regions,sizeMatches,checkAnchors,readNumber,validateTarget,samePlayer};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MaxCardLayout=api;
})(globalThis);
