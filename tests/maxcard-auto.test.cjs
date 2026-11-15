const test=require('node:test'),assert=require('node:assert/strict'),L=require('../maxcard-layout.js');
const target={ovr:127,pacing:179,shooting:137,passing:138,dribbling:158,defending:231,physical:222,allocation:[2,1,0,0,1,1]};
test('recognition requires the reference aspect and all semantic anchors',()=>{
 assert(L.sizeMatches(2804,1276));assert(L.sizeMatches(1862,845));assert(!L.sizeMatches(1920,1080));
 L.checkAnchors('PACING SHOOTING PASSING DRIBBLING DEFENDING PHYSICAL','Training Level Rank Up Level PlayStyles Skills');
 assert.throws(()=>L.checkAnchors('PACING SHOOTING PASSING','Training Rank Up PlayStyles Skills'));
 assert.throws(()=>L.checkAnchors('PACING SHOOTING PASSING DRIBBLING DEFENDING PHYSICAL','Training Skills'));
});
test('ambiguous or low-confidence readings fail without invented values',()=>{
 assert.equal(L.readNumber('179\n',95,1,999,'Pacing'),179);
 for(const [text,conf]of [['179 180',95],['I79',90],['179',30],['',95]])assert.throws(()=>L.readNumber(text,conf,1,999,'Pacing'));
});
test('max target and five-point skill allocation are checked',()=>{
 assert.equal(L.validateTarget(target,122),target);
 assert.throws(()=>L.validateTarget({...target,pacing:79},122,{pacing:138,shooting:110,passing:121,dribbling:132,defending:159,physical:156}));
 assert.throws(()=>L.validateTarget({...target,ovr:126},122));
 assert.throws(()=>L.validateTarget({...target,allocation:[2,1,0,0,0,0]},122));
 assert.throws(()=>L.validateTarget({...target,physical:undefined},122));
});
test('names match across accents and expanded RenderZ names',()=>{
 assert(L.samePlayer('GABRIEL','Gabriel dos S. Magalhães'));assert(L.samePlayer('MAGALHÃES','Magalhaes'));
 assert(!L.samePlayer('GABRIEL','Virgil van Dijk'));assert(!L.samePlayer('','Gabriel'));
});
test('automatic edit masks exclude the protected PlayStyles and stars panels',()=>{
 const r=L.regions(target.allocation);
 assert(r.skill0&&r.skill1&&r.skill4&&r.skill5);assert(!r.skill2&&!r.skill3);
 const protectedAreas=[{x:.28,y:.69,w:.34,h:.28},{x:.01,y:.70,w:.24,h:.17},{x:.115,y:.19,w:.095,h:.28}];
 for(const mask of Object.values(r))for(const p of protectedAreas)assert(!(mask.x<p.x+p.w&&mask.x+mask.w>p.x&&mask.y<p.y+p.h&&mask.y+mask.h>p.y),'mask overlaps protected area');
});
test('detects translated and scaled panels without assuming screenshot aspect',()=>{
 const width=1400,height=650,data=new Uint8ClampedArray(width*height*4);
 const left=450,top=202,right=1240,bottom=331;
 const ink=(x,y)=>{const p=(y*width+x)*4;data[p+1]=220;data[p+2]=180;data[p+3]=255;};
 for(let x=left;x<=right;x++){ink(x,top);ink(x,bottom);}for(let y=top;y<=bottom;y++){ink(left,y);ink(right,y);}
 const t=L.detectProfile(data,width,height),r=L.map(L.areas.cardOVR,t);
 assert(Math.abs(r.x*width-213)<2);assert(Math.abs(r.y*height-119)<2);
 assert.throws(()=>L.detectProfile(new Uint8Array(data.length),width,height));
});
