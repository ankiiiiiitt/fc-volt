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
  function regions(allocation){
    const result=Object.fromEntries(Object.entries(areas).map(([id,r])=>[id,normalize(r)]));
    allocation.forEach((points,i)=>{if(points>0)result['skill'+i]=normalize([1808+130*i,978,124,139]);});
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
    if(confidence<65||!/^\d{1,3}$/.test(raw)||+raw<min||+raw>max)throw Error(`${label} could not be read reliably. Upload a clearer ${label.startsWith('Base')?'base':'RenderZ'} screenshot.`);
    return +raw;
  }
  function validateTarget(values,baseOVR,baseStats){
    for(const key of ['ovr','pacing','shooting','passing','dribbling','defending','physical'])if(!Number.isInteger(values[key])||values[key]<1||values[key]>(key==='ovr'?200:999))throw Error('RenderZ is missing a reliable '+key+' value.');
    if(baseStats)for(const key of ['pacing','shooting','passing','dribbling','defending','physical'])if(!Number.isInteger(baseStats[key])||values[key]<baseStats[key])throw Error('A target stat is lower than the base card. Use matching full-resolution screenshots.');
    if(values.ovr!==baseOVR+5)throw Error('Use an unranked base card and a matching five-rank RenderZ screenshot (target OVR must be base OVR +5).');
    if(!Array.isArray(values.allocation)||values.allocation.length!==6||values.allocation.some(n=>!Number.isInteger(n)||n<0||n>3)||values.allocation.reduce((a,b)=>a+b,0)!==5)throw Error('RenderZ must show a complete five-point skill allocation.');
    return values;
  }
  function samePlayer(baseName,targetName){
    const tokens=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().match(/[A-Z]{3,}/g)||[];
    const a=tokens(baseName),b=tokens(targetName);return a.length>0&&a.some(t=>b.includes(t));
  }
  const api={reference,normalize,areas,renderz,skills,regions,sizeMatches,checkAnchors,readNumber,validateTarget,samePlayer};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MaxCardLayout=api;
})(globalThis);
